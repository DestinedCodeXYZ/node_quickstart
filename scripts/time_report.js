// Invoking MongoDB and XLSX libraries
const { MongoClient } = require('mongodb');
const XLSX = require('xlsx');
const fs = require('fs');

// url for connecting to cluster.
const url = "mongodb+srv://kevronthe5th:PGY7fZFoSWqaYUif@axi-digital.oleo1.mongodb.net/myhomeisyours-live?retryWrites=true&w=majority&appName=Axi-Digital"

// Connecting to mhiy DB (axi-digital.oleo1.mongodb.net)
const client  = new MongoClient(url);

// Query for all existing enquiries on db
async function run() {
    try {
        await client.connect();
        console.log("Successfully connected to Atlas!\n");
        
        const database = client.db('myhomeisyours-live');
        const enquiries = database.collection('enquiries');

        const existing_enqs = await enquiries.aggregate([

        // Filter for deleted & cancelled enquiries
        {
            $match: {
                    "isDeleted" : false, 
                    "status" : {$nin : ["cancelled"]},
                }
        },

        // Join on accounts
        {
            $lookup: {
                from: "accounts",
                localField: "assigned",
                foreignField: "_id",
                as: "acc"
            }
        },

        {
            $lookup: {
                from: "agents",
                localField: "requestBy",
                foreignField: "_id",
                as: "agent"
            }
        },

        { 
            $unwind: {
                path: "$agent",
                preserveNullAndEmptyArrays: true
            } 
        },

        // Join on companies
        {
            $lookup: {
                from: "companies",
                localField: "company",
                foreignField: "_id",
                as: "comp"
            }
        },

        {
            $unwind: {
                path: "$comp",
                preserveNullAndEmptyArrays: true 
            }
        },

        {
            $match: {
                $expr: { $ne: ["$acc.fullName", "Admin Master"]}
            }
        },

        {
            $lookup: {
                from: "enquiryhistories",
                let: { enq_id: "$_id" }, // The ID of the enquiry
                pipeline: [
                    { 
                    $match: { 
                        $expr: { $eq: ["$enquiryId", "$$enq_id"] },
                        "changes.status.new": "offeredOut" 
                    } 
                    },
                    { $sort: { createdAt: 1 } }, // Earliest first
                    { $limit: 1 }                // Only take the first one
                ],
                as: "earliestOffer"
                }
            },
            {
                // Turn the array of 1 item into a single object
                $unwind: {
                path: "$earliestOffer",
                preserveNullAndEmptyArrays: true
                }
        },

        {
            $addFields: {
                // 1. Get the absolute total in seconds
                totalSeconds: {
                    $dateDiff: { 
                        startDate: "$createdAt", 
                        endDate: "$earliestOffer.createdAt", 
                        unit: "second" 
                    }
                }
            }
        },

        {
            $addFields: {
                // 2. Convert to precise decimal values
                preciseDays: { $divide: ["$totalSeconds", 86400] },   // 60*60*24
                preciseHours: { $divide: ["$totalSeconds", 3600] },  // 60*60
                preciseMinutes: { $divide: ["$totalSeconds", 60] }
            }
        },

        {
            $addFields: {
                // 1. Only generate the day list if we actually have an end date
                allDays: {
                $cond: [
                    { $and: ["$createdAt", "$earliestOffer.createdAt"] },
                    {
                    $map: {
                        input: { 
                        $range: [
                            0, 
                            { $add: [{ $dateDiff: { startDate: "$createdAt", endDate: "$earliestOffer.createdAt", unit: "day" } }, 1] }
                        ] 
                        },
                        as: "dayOffset",
                        in: { $dateAdd: { startDate: "$createdAt", unit: "day", amount: "$$dayOffset" } }
                    }
                    },
                    [] // If no offer date, return an empty array
                ]
                }
            }
        },

        {
            $addFields: {
                // 2. Map through the days (if the array is empty, this just returns [])
                workMinutesPerDay: {
                $map: {
                    input: "$allDays",
                    as: "currentDay",
                    in: {
                    $let: {
                        vars: {
                        dow: { $dayOfWeek: "$$currentDay" },
                        isStartDay: { $eq: [ { $dateTrunc: { date: "$$currentDay", unit: "day" } }, { $dateTrunc: { date: "$createdAt", unit: "day" } } ] },
                        isEndDay: { $eq: [ { $dateTrunc: { date: "$$currentDay", unit: "day" } }, { $dateTrunc: { date: "$earliestOffer.createdAt", unit: "day" } } ] }
                        },
                        in: {
                        $cond: [
                            { $or: [{ $eq: ["$$dow", 1] }, { $eq: ["$$dow", 7] }] }, 
                            0, 
                            {
                            $let: {
                                vars: {
                                dayStart: { $cond: ["$$isStartDay", { $add: [{ $hour: "$createdAt" }, { $divide: [{ $minute: "$createdAt" }, 60] }] }, 9] },
                                dayEnd: { $cond: ["$$isEndDay", { $add: [{ $hour: "$earliestOffer.createdAt" }, { $divide: [{ $minute: "$earliestOffer.createdAt" }, 60] }] }, 17.5] }
                                },
                                in: {
                                $multiply: [
                                    { $max: [0, { $subtract: [{ $min: [17.5, "$$dayEnd"] }, { $max: [9, "$$dayStart"] }] }] },
                                    60
                                ]
                                }
                            }
                            }
                        ]
                        }
                    }
                    }
                }
                }
            }
        },

        {
            $addFields: {
            totalBusinessMinutes: { $sum: "$workMinutesPerDay" }
            }
        },

        {
            $addFields: {
            // Final conversion for your report
            businessHours: { $divide: ["$totalBusinessMinutes", 60] }
            }
        },

        {
            $addFields: {
            // 1. Convert our business minutes into total rounded seconds
            totalSecs: { $round: [{ $multiply: ["$totalBusinessMinutes", 60] }, 0] }
            }
        },

        {
            $sort: {
                "enqhist.createdAt": 1
            } 
        },

        {
            $project: {
                _id: 0,
                createdAt: {$toDate: "$createdAt"},
                ref: "$reference",
                agent : {$first: "$acc.fullName"},
                oldStatus: "$earliestOffer.changes.status.old",
                newStatus: "$earliestOffer.changes.status.new",
                enqhistTimestamp: "$earliestOffer.createdAt",
                status: "$status",
                businessDuration: {
                    $cond: [
                        { $gt: ["$totalSecs", 0] },
                        {
                        $concat: [
                            { $toString: { $floor: { $divide: ["$totalSecs", 86400] } } },
                            ":",
                            { $substrCP: [{ $concat: ["0", { $toString: { $floor: { $divide: [{ $mod: ["$totalSecs", 86400] }, 3600] } } }] }, { $subtract: [{ $strLenCP: { $concat: ["0", { $toString: { $floor: { $divide: [{ $mod: ["$totalSecs", 86400] }, 3600] } } }] } }, 2] }, 2] },
                            ":",
                            { $substrCP: [{ $concat: ["0", { $toString: { $floor: { $divide: [{ $mod: ["$totalSecs", 3600] }, 60] } } }] }, { $subtract: [{ $strLenCP: { $concat: ["0", { $toString: { $floor: { $divide: [{ $mod: ["$totalSecs", 3600] }, 60] } } }] } }, 2] }, 2] },
                            ":",
                            { $substrCP: [{ $concat: ["0", { $toString: { $mod: ["$totalSecs", 60] } }] }, { $subtract: [{ $strLenCP: { $concat: ["0", { $toString: { $mod: ["$totalSecs", 60] } }] } }, 2] }, 2] }
                            ]
                        },
                        "0:00:00:00"
                    ]
                },
                BusinessMins: "$totalBusinessMinutes",
                businessHours: "$businessHours"
            }
        }  
               
        ]).sort({ createdAt: 1 }).toArray();

        console.log(existing_enqs)

        let worksheet;
        let sheetName = "time report";
        let workbook;
        let filePath = 'C:\\Users\\kevro\\Documents\\Excel Files\\time_report_test.xlsx';

        if ( fs.existsSync(filePath) ) {

            workbook = XLSX.readFile(filePath);
        }
        
        else {

            workbook = XLSX.utils.book_new();
            console.log(`New file created at: ${filePath}.`);
        }

        if ( workbook.SheetNames.includes(sheetName) ) {

            delete workbook.Sheets[sheetName];
            workbook.SheetNames = workbook.SheetNames.filter(name => name !== sheetName);
            console.log(`Overwriting ${sheetName} sheet in ${filePath}`)

        }

        worksheet = XLSX.utils.json_to_sheet(existing_enqs);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        
        XLSX.writeFile(workbook, filePath);
        
        console.log(`Exported to ${filePath}`);

    } catch (err) {
        console.log(err.stack);
    }
    finally {
        await client.close();
    }
}

run().catch(console.dir);
