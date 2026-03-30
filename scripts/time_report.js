// Invoking MongoDB and XLSX libraries
const { MongoClient } = require('mongodb');
const XLSX = require('xlsx');
const fs = require('fs');

// url for connecting to cluster.
const url = "mongodb+srv://kevronthe5th:PGY7fZFoSWqaYUif@axi-digital.oleo1.mongodb.net/myhomeisyours-live?retryWrites=true&w=majority&appName=Axi-Digital"

// Connecting to mhiy DB (axi-digital.oleo1.mongodb.net)
const client  = new MongoClient(url);
const start = new Date(Date.UTC(2026, 0, 1));

// Query for all existing enquiries on db
async function run() {
    try {
        await client.connect();
        console.log("Successfully connected to Atlas!\n");
        
        const database = client.db('myhomeisyours-live');
        const enquiries = database.collection('enquiries');

        const existing_enqs = await enquiries.aggregate([

            { $sort: { createdAt: 1 } },

            // 1. Filter for valid enquiries
            {
                $match: {
                    createdAt: {$gte: start},
                    isDeleted: false,
                    status: { $nin: ["cancelled"] },
                }
            },

            // 2. Joins: Accounts, Agents, Companies
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
                    $expr: { $ne: ["$acc.fullName", "Admin Master"] }
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

            // 3. Cycle and History Logic
            {
                $lookup: {
                    from: "chosenproperties",
                    let: { enq_id: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$enquiryId", "$$enq_id"] } } },
                        { $sort: { createdAt: 1 } }
                    ],
                    as: "sortedCycles"
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

            // 4. Tag History with Cycles
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
                                                in: { $ifNull: [{ $last: "$$matchingCycles.cycle" }, 0] }
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },

            // 5. Create a separate document for every cycle
            { $unwind: "$sortedCycles" },

            // 6. Find the 'offeredOut' history for THIS specific cycle
            {
                $addFields: {
                    cycleOfferHistory: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$allEnqHist",
                                    as: "h",
                                    cond: {
                                        $and: [
                                            { $eq: ["$$h.changes.status.new", "offeredOut"] },
                                            { $eq: ["$$h.attributedCycle", "$sortedCycles.cycle"] }
                                        ]
                                    }
                                }
                            },
                            0
                        ]
                    }
                }
            },

            // 7. Define Start and End for THIS cycle
            {
                $addFields: {
                    // Start is when the cycle was created, End is when it was 'Offered Out'
                    startTime: "$sortedCycles.createdAt",
                    endTime: "$cycleOfferHistory.createdAt",
                    holidayDates: [ 
                        new Date("2026-01-01"), new Date("2026-04-03"),
                        new Date("2026-04-06"), new Date("2026-05-04"),
                        new Date("2026-08-31"), new Date("2026-12-25"),
                        new Date("2026-12-28"), new Date("2027-01-01")
                    ]
                }
            },

            // 8. Generate range of days for THIS cycle
            {
                $addFields: {
                    allDays: {
                        $cond: [
                            { $and: ["$startTime", "$endTime"] },
                            {
                                $map: {
                                    input: { $range: [0, { $add: [{ $dateDiff: { startDate: "$startTime", endDate: "$endTime", unit: "day" } }, 1] }] },
                                    as: "dayOffset",
                                    in: { $dateAdd: { startDate: "$startTime", unit: "day", amount: "$$dayOffset" } }
                                }
                            },
                            []
                        ]
                    }
                }
            },

            // 9. Calculate Business Minutes for THIS cycle
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
                                            { $or: [{ $eq: ["$$dow", 1] }, { $eq: ["$$dow", 7] }, { $in: ["$$currentDayTrunc", "$holidayDates"] }] },
                                            0,
                                            {
                                                $let: {
                                                    vars: {
                                                        dayStart: { $cond: [{ $eq: ["$$currentDayTrunc", { $dateTrunc: { date: "$startTime", unit: "day" } }] }, { $add: [{ $hour: "$startTime" }, { $divide: [{ $minute: "$startTime" }, 60] }] }, 9] },
                                                        dayEnd: { $cond: [{ $eq: ["$$currentDayTrunc", { $dateTrunc: { date: "$endTime", unit: "day" } }] }, { $add: [{ $hour: "$endTime" }, { $divide: [{ $minute: "$endTime" }, 60] }] }, 17.5] }
                                                    },
                                                    in: { $multiply: [{ $max: [0, { $subtract: [{ $min: [17.5, "$$dayEnd"] }, { $max: [9, "$$dayStart"] }] }] }, 60] }
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

            // 10. Final Summing and Banding per cycle
            {
                $addFields: {
                    totalSecs: { $round: [{ $multiply: [{ $sum: "$workMinutesPerDay" }, 60] }, 0] },
                    durationBand: {
                        $switch: {
                            branches: [
                                { case: { $lte: [{ $sum: "$workMinutesPerDay" }, 60] }, then: "<=1hr" },
                                { case: { $lte: [{ $sum: "$workMinutesPerDay" }, 240] }, then: "1 - 4hrs" },
                                { case: { $lte: [{ $sum: "$workMinutesPerDay" }, 480] }, then: "4 - 8hrs" }
                            ],
                            default: ">8hrs"
                        }
                    }
                }
            },

            // 11. The Facet
            {
                $facet: {
                    "enquiryList": [
                        {
                            $project: {
                                _id: 0,
                                "Created Date": "$createdAt",
                                "Reference": "$reference",
                                "Cycle": "$sortedCycles.cycle",
                                "Agent": { $first: "$acc.fullName" },
                                "Business Duration": {
                                    $concat: [
                                        { $toString: { $floor: { $divide: ["$totalSecs", 86400] } } },
                                        ":",
                                        { $dateToString: { date: { $dateAdd: { startDate: new Date(0), unit: "second", amount: "$totalSecs" } }, format: "%H:%M:%S" } }
                                    ]
                                },
                                "Duration Band": "$durationBand"
                            }
                        }
                    ],
                    "summaryStats": [
                        { $group: { _id: "$durationBand", "Total": { $sum: 1 } } },
                        { $project: { _id: 0, "Duration Band": "$_id", "Total": 1 } }
                    ]
                }
            }
        ]).toArray();

        // Get the data out of the facet
        const facetedData = existing_enqs[0];
        console.log(facetedData)

        let workbook;
        let filePath = 'C:\\Users\\kevro\\Documents\\Excel Files\\time_report_test.xlsx';

        if ( fs.existsSync(filePath) ) {

            workbook = XLSX.readFile(filePath);
        }
        
        else {

            workbook = XLSX.utils.book_new();
            console.log(`New file created at: ${filePath}.`);
        }

        // Clean up existing sheets if they exist
        const sheetsToCreate = [
            { name: "Enquiry_List", data: facetedData.enquiryList },
            { name: "Performance_Summary", data: facetedData.summaryStats }
        ];

        sheetsToCreate.forEach(item => {
            if (workbook.SheetNames.includes(item.name)) {
                delete workbook.Sheets[item.name];
                workbook.SheetNames = workbook.SheetNames.filter(n => n !== item.name);
            }
            
            // Convert the specific array to a worksheet
            const ws = XLSX.utils.json_to_sheet(item.data);
            XLSX.utils.book_append_sheet(workbook, ws, item.name);
        });

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
