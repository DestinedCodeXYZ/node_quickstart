// Invoking MongoDB and XLSX libraries
const { MongoClient } = require('mongodb');
const XLSX = require('xlsx');
const fs = require('fs');
const os = require('os');
const path = require('path');

require('dotenv').config({path: path.join(__dirname, '../.env')});
// url for connecting to cluster.
const url = process.env.DB_PASS

// Connecting to mhiy DB (axi-digital.oleo1.mongodb.net)
const client  = new MongoClient(url);
const start = new Date(Date.UTC(2025, 8, 1));

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
                    isDeleted: false,
                    status: { $nin: ["cancelled"] },
                    createdAt: {$gte: start}
                }
            },

            // 2. Joins: Accounts, Agents, Companies
            {
                $lookup: {
                    from: "accounts",
                    localField: "assigned.account",
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

            // 5. Identify the "Target" Offer (Latest Cycle)
            {
                $addFields: {
                    earliestOffer: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$allEnqHist",
                                    as: "h",
                                    cond: {
                                        $and: [
                                            { $eq: ["$$h.changes.status.new", "offeredOut"] },
                                            { $eq: ["$$h.attributedCycle", { $ifNull: [{ $first: "$sortedCycles.cycle" }, 0] }] }
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
                $match: {
                    earliestOffer: { $ne: null }
                }
            },
            
            // 6. Business Hour Configuration & Calculations
            {
                $addFields: {
                    holidayDates: [
                        new Date("2026-01-01"), new Date("2026-04-03"),
                        new Date("2026-04-06"), new Date("2026-05-04"),
                        new Date("2026-08-31"), new Date("2026-12-25"),
                        new Date("2026-12-28"), new Date("2027-01-01")
                    ]
                }
            },
            {
                $addFields: {
                    allDays: {
                        $cond: [
                            { $and: ["$createdAt", "$earliestOffer.createdAt"] },
                            {
                                $map: {
                                    input: {
                                        $range: [0, { $add: [{ $dateDiff: { startDate: "$createdAt", endDate: "$earliestOffer.createdAt", unit: "day" } }, 1] }]
                                    },
                                    as: "dayOffset",
                                    in: { $dateAdd: { startDate: "$createdAt", unit: "day", amount: "$$dayOffset" } }
                                }
                            },
                            []
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
                                            { $or: [{ $eq: ["$$dow", 1] }, { $eq: ["$$dow", 7] }, { $in: ["$$currentDayTrunc", "$holidayDates"] }] },
                                            0,
                                            {
                                                $let: {
                                                    vars: {
                                                        isStartDay: { $eq: ["$$currentDayTrunc", { $dateTrunc: { date: "$createdAt", unit: "day" } }] },
                                                        isEndDay: { $eq: ["$$currentDayTrunc", { $dateTrunc: { date: "$earliestOffer.createdAt", unit: "day" } }] },
                                                        dayStart: { $cond: [{ $eq: ["$$currentDayTrunc", { $dateTrunc: { date: "$createdAt", unit: "day" } }] }, { $add: [{ $hour: "$createdAt" }, { $divide: [{ $minute: "$createdAt" }, 60] }] }, 9] },
                                                        dayEnd: { $cond: [{ $eq: ["$$currentDayTrunc", { $dateTrunc: { date: "$earliestOffer.createdAt", unit: "day" } }] }, { $add: [{ $hour: "$earliestOffer.createdAt" }, { $divide: [{ $minute: "$earliestOffer.createdAt" }, 60] }] }, 17.5] }
                                                    },
                                                    in: {
                                                        $multiply: [{ $max: [0, { $subtract: [{ $min: [17.5, "$$dayEnd"] }, { $max: [9, "$$dayStart"] }] }] }, 60]
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

            // 7. Final Totals and Banding
            {
                $addFields: {
                    totalBusinessMinutes: { $sum: "$workMinutesPerDay" }
                }
            },
            {
                $addFields: {
                    totalSecs: { $round: [{ $multiply: ["$totalBusinessMinutes", 60] }, 0] },
                    businessHours: { $divide: ["$totalBusinessMinutes", 60] },
                    durationBand: {
                        $switch: {
                            branches: [
                                { case: { $lte: ["$totalBusinessMinutes", 60] }, then: "<=1hr" },
                                { case: { $and: [{ $gt: ["$totalBusinessMinutes", 60] }, { $lte: ["$totalBusinessMinutes", 240] }] }, then: "1 - 4hrs" },
                                { case: { $and: [{ $gt: ["$totalBusinessMinutes", 240] }, { $lte: ["$totalBusinessMinutes", 480] }] }, then: "4 - 8hrs" }
                            ],
                            default: ">8hrs"
                        }
                    }
                }
            },

            // 8. Final Facet
            {
                $facet: {
                    "enquiryList": [
                        {
                            $project: {
                                _id: 0,
                                "Created Date" : "$createdAt",
                                "Reference": "$reference",
                                "Company" : "$comp.name",
                                "Status" : "$status",
                                "Latest Cycle": {$last: "$sortedCycles.cycle"},
                                "Assigned To": { $first: "$acc.fullName" },
                                "Business Duration": {
                                    $concat: [
                                        { $toString: { $floor: { $divide: ["$totalSecs", 86400] } } },
                                        ":",
                                        { $dateToString: { date: { $dateAdd: { startDate: new Date(0), unit: "second", amount: "$totalSecs" } }, format: "%H:%M:%S" } }
                                    ]
                                },
                                "Business Hours": "$businessHours",
                                "Duration Band": "$durationBand",
                                isExtension: { $cond: [
                                    { $regexMatch: { input: "$reference", regex: "EXT" } },
                                    true, false
                                ] },
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

        // 1. Configuration
        const sheetName = "time_report_raw";
        const finalPath = path.join(
                    os.homedir(),
                    process.env.ONEDRIVE_DIR,
                    process.env.OD_FILENAME
                );
        const tempPath = path.join(process.env.TEMP, 'temp_export_check.xlsm');

        let workbook;

        // 2. Load or Create Workbook
        if (fs.existsSync(finalPath)) {
            try {
                workbook = XLSX.readFile(finalPath);
                // Remove existing sheet to ensure a clean overwrite
                if (workbook.SheetNames.includes(sheetName)) {
                    delete workbook.Sheets[sheetName];
                    workbook.SheetNames = workbook.SheetNames.filter(name => name !== sheetName);
                }
            } catch (e) {
                console.warn("Could not read existing file (it might be open). Creating new workbook.");
                workbook = XLSX.utils.book_new();
            }
        } else {
            workbook = XLSX.utils.book_new();
        }

        // 3. Add Data
        const worksheet = XLSX.utils.json_to_sheet(facetedData.enquiryList);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // 4. Atomic Write Strategy
        try {
            // Write to Temp first to avoid corrupting the main file if the script crashes
            XLSX.writeFile(workbook, tempPath);
            
            // Copy to OneDrive (Copy + Unlink is often safer than Rename for cloud-synced folders)
            fs.copyFileSync(tempPath, finalPath);
            fs.unlinkSync(tempPath);
            
            console.log(`Successfully exported ${facetedData.enquiryList.length} rows to: ${finalPath}`);
        } catch (err) {
            if (err.code === 'EBUSY') {
                console.error("ERROR: File is locked. Please close 'RAW_DATA.xlsx' in Excel and try again.");
            } else {
                console.error("ERROR during export:", err.message);
            }
        }        

    } catch (err) {
        console.log(err.stack);
    }
    finally {
        await client.close();
    }
}

run().catch(console.dir);
