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

        { $sort: { createdAt: 1 } },

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
            $match: {
                $expr: { $ne: ["$acc.fullName", "Admin Master"]}
            }
        },

        {
            $lookup: {
                from: "enquiryhistories",
                localField: "_id",
                foreignField: "enquiryId",
                as: "allEnqHist"
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
            $addFields: {
                earliestOffer: {
                    $arrayElemAt: [
                        {
                            $filter: {
                                input: "$allEnqHist",
                                as: "h",
                                cond: { $eq: ["$$h.changes.status.new", "offeredOut"] }
                            }
                        },
                        0
                    ]
                }
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
            // 1. Define your holiday list here (Ensure time is 00:00:00)
                holidayDates: [
                    
                    new Date("2026-01-01"), // New Year
                    new Date("2026-04-03"),
                    new Date("2026-04-06"),
                    new Date("2026-05-04"),
                    new Date("2026-08-31"),
                    new Date("2026-12-25"), // Christmas
                    new Date("2026-12-28"), // Boxing Day
                    new Date("2027-01-01"), // New Year 2027
                    
                ]
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
                workMinutesPerDay: {
                    $map: {
                    input: "$allDays",
                    as: "currentDay",
                    in: {
                        $let: {
                        vars: {
                            currentDayTrunc: { $dateTrunc: { date: "$$currentDay", unit: "day" } },
                            dow: { $dayOfWeek: "$$currentDay" }
                        },
                        in: {
                            $cond: [
                            { 
                                $or: [
                                { $eq: ["$$dow", 1] }, // Sunday
                                { $eq: ["$$dow", 7] }, // Saturday
                                { $in: ["$$currentDayTrunc", "$holidayDates"] } // Matches your list
                                ] 
                            }, 
                            0, // Skip these days
                            {
                                $let: {
                                vars: {
                                    isStartDay: { $eq: ["$$currentDayTrunc", { $dateTrunc: { date: "$createdAt", unit: "day" } }] },
                                    isEndDay: { $eq: ["$$currentDayTrunc", { $dateTrunc: { date: "$earliestOffer.createdAt", unit: "day" } }] }
                                },
                                in: {
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



        // 1. Join chosenproperties and SORT them by date immediately
        {
            $lookup: {
                from: "chosenproperties",
                let: { enq_id: "$_id" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$enquiryId", "$$enq_id"] } } },
                    { $sort: { createdAt: 1 } } // Crucial for timing
                ],
                as: "sortedCycles"
            }
        },

        // 2. Map through your history to "tag" each status change with a cycle
        {
            $addFields: {
                allEnqHist: {
                    $map: {
                        input: "$allEnqHist",
                        as: "hist",
                        in: {
                            $mergeObjects: [
                                "$$hist",
                                {
                                    // Find the cycle number where cycle.createdAt <= history.createdAt
                                    attributedCycle: {
                                        $let: {
                                            vars: {
                                                matchingCycles: {
                                                    $filter: {
                                                        input: "$sortedCycles",
                                                        cond: { $lte: ["$$this.createdAt", "$$hist.createdAt"] }
                                                    }
                                                }
                                            },
                                            in: { $ifNull: [{ $last: "$$matchingCycles.cycle" }, 1] }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        },

        // 3. Now redefine your earliestOffer to be cycle-aware
        {
            $addFields: {
                // Example: Get the "offeredOut" event specifically for the LAST cycle
                latestCycleOffer: {
                    $arrayElemAt: [
                        {
                            $filter: {
                                input: "$allEnqHist",
                                as: "h",
                                cond: { 
                                    $and: [
                                        { $eq: ["$$h.changes.status.new", "offeredOut"] },
                                        { $eq: ["$$h.attributedCycle", { $ifNull: [{ $last: "$sortedCycles.cycle" }, 1] }] }
                                    ]
                                }
                            }
                        },
                        0
                    ]
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
            $addFields: {
                durationBand: {
                    $switch: {
                        branches: [
                            { 
                                case: { $lte: ["$totalBusinessMinutes", 30] }, 
                                then: "<30m" 
                            },
                            { 
                                case: { $and: [
                                    { $gt: ["$totalBusinessMinutes", 30] }, 
                                    { $lte: ["$totalBusinessMinutes", 60] }
                                ]}, 
                                then: "30m - 1hr" 
                            },
                            { 
                                case: { $and: [
                                    { $gt: ["$totalBusinessMinutes", 60] }, 
                                    { $lte: ["$totalBusinessMinutes", 240] } // 4 hours
                                ]}, 
                                then: "1 - 4hrs" 
                            },
                            { 
                                case: { $and: [
                                    { $gt: ["$totalBusinessMinutes", 240] }, 
                                    { $lte: ["$totalBusinessMinutes", 480] } // 8 hours/1 day
                                ]}, 
                                then: "4 - 8hrs" 
                            }
                        ],
                        default: ">8hrs"
                    }
                }
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
                cycles: { $ifNull: [{ $last: "$sortedCycles.cycle" }, 0]},
                businessDuration: {
                    $cond: [
                        { $gt: ["$totalSecs", 0] },
                        {
                            $concat: [
                                { $toString: { $floor: { $divide: ["$totalSecs", 86400] } } }, // Days
                                ":",
                                {
                                $dateToString: {
                                    date: { $dateAdd: { startDate: new Date(0), unit: "second", amount: "$totalSecs" } },
                                    format: "%H:%M:%S"
                                }
                                }
                            ]
                        },
                        "0:00:00:00"
                    ]
                },
                "Total Business Hours": { $round: ["$businessHours", 2] },
                durationBand: "$durationBand",
                isExtension: "$extension.isExtension"
            }
        }  
               
        ]).toArray();

        console.log(existing_enqs)

        let worksheet;
        let sheetName = "time report 2";
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
