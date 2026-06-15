// Invoking libraries
const mongoose = require('mongoose'); // Swapped out MongoClient
const XLSX = require('xlsx');
const fs = require('fs');
const os = require('os');
const path = require('path');

require('dotenv').config({path: path.join(__dirname, '../.env')});

// url for connecting to cluster.
const url = process.env.DB_PASS;

const insurance = ["Romi Mitchell", "Roland Roserie", "Laila Essebane", "Jared Garfield ", "Janiv Shah", "Tracy McAlister"];
const start = new Date(Date.UTC(2026, 0, 1));

// Define a minimal Mongoose Schema for the 'bookings' collection. 
// { strict: false } lets Mongoose process your aggregation without needing explicit field definitions.
const bookingSchema = new mongoose.Schema({}, { collection: 'bookings', strict: false });
const Booking = mongoose.model('Booking', bookingSchema);

async function run() {
    try {
        // Mongoose Connection (Targeting 'myhomeisyours-live' database directly if not specified in DB_PASS string)
        await mongoose.connect(url, {
            dbName: 'myhomeisyours-live' 
        });
        console.log("Successfully connected to Atlas via Mongoose!\n");
        
        // Execute the exact same aggregation array directly on the Mongoose Model
        // .sort() can be included right inside the pipeline or attached as a Mongoose chain.
        // Mongoose aggregates return plain JSON arrays natively, so `.toArray()` is removed.
        const pricing = await Booking.aggregate([
            {
                $lookup: {
                    from: "enquiries",
                    localField: "enquiry",
                    foreignField: "_id",
                    as: "enq"
                }
            },

            // Joining accounts to get assigned booker
            { $lookup:
                {
                    from: "accounts",
                    localField: "enq.assigned",
                    foreignField: "_id",
                    as: "assigned"
                }
            },

            // Joining accounts to get who approved costs
            { $lookup:
                {
                    from: "accounts",
                    localField: "enq.approval.approvedBy",
                    foreignField: "_id",
                    as: "approvedBy"
                }
            },

            { $unwind: {path: "$enq", preserveNullAndEmptyArrays: true} },

            // Joining chosenproperties for detail on who added the selected property
            { $lookup:
                {
                    from: "chosenproperties",
                    localField: "enq.selectedPropertyId",
                    foreignField: "_id",
                    as: "chosenprop"
                }
            },

            { $unwind: {path: "$chosenprop", preserveNullAndEmptyArrays: true} },
            // Get property data for chosen properties
            { $lookup:
                {
                    from: "properties",
                    localField: "chosenprop.propertyRef",
                    foreignField: "_id",
                    as: "prop"
                }
            },

            { $unwind: {path: "$prop", preserveNullAndEmptyArrays: true} },

            // Joins onto chosenprop to get booker info
            { $lookup:
                {
                    from: "accounts",
                    localField: "chosenprop.createdBy",
                    foreignField: "_id",
                    as: "addedBy"
                }
            },

            // Left join on clients collection
            { $lookup: 
                {
                    from: "clients",
                    localField: "client",
                    foreignField: "_id",
                    as: "client",
                }
            },

            { $unwind: "$client" },

            // Left join on companies collection
            { $lookup:
                {
                    from: "companies",
                    localField: "company",
                    foreignField: "_id",
                    as: "comp"
                }
            },

            { $unwind: "$comp" },

            { $lookup:
                {
                    from: "agents",
                    localField: "agent",
                    foreignField: "_id",
                    as: "agent"
                }
            },

            { $unwind: "$agent" },

            { $lookup:
                {
                    from: "landlords",
                    localField: "prop.landlordRef",
                    foreignField: "_id",
                    as: "landlord"
                }
            },

            { $unwind: "$landlord" },

            { 
                $match: {
                    createdAt: { $gte: start },
                    "extension.isExtension" : false,
                    isDeleted : false,
                    status: { $nin: ["cancelled"] },
                }
            },
            
            // Duration bonus check
            {
                $addFields: {
                    durationBonus: {
                        $cond: [
                            { $gte: [
                            { 
                                    $convert: {
                                        input: "$expectedDuration",
                                        to: "int",
                                        onError: 0,
                                        onNull: 0
                                    } 
                                }, 7
                            ]  }, true, false
                        ]
                    }
                }
            },
            // Margin bonus check
            {
                $addFields: {
                    marginBonus: {
                        $cond: [
                            { $gte: [ "$pricing.info.mhiyCommission", 15] },
                            true,
                            false
                        ]
                    }
                }
            },

            // Deposit bonus check
            {
                $addFields: {
                    depositBonus: {
                    $cond: [
                        { $or: [
                            // Insurance
                            { $and: [
                                { $eq: [{ $arrayElemAt: ["$pricing.deposit.info.amount", 1] }, 0] },
                                { $in: ["$agent.fullName", insurance] }
                                ]
                            },
                            // Not insurance
                            { $and: [
                                { $gt: [{ $arrayElemAt: ["$pricing.deposit.info.amount", 1] }, 0] },
                                { $not: [{ $in: ["$agent.fullName", insurance] }] }
                                ]
                            }
                            ]
                        },
                        true,false
                    ]
                    }
                }
            },
            // Parking bonus check
            {
                $addFields: {
                    parkingBonus: {
                    $or: [
                        // Cars but free parking
                        {
                        $and: [
                            { $gt: [ { $toInt: "$enq.request.propertyPreferences.parking.spaces" }, 0] },
                            { $eq: [
                                { $regexMatch: {
                                        input: "$prop.parkingType.value",
                                        regex: ".*free.*",
                                        options: "i"
                                        }
                                    }, true
                                ] 
                            },
                            { $eq: ["$pricing.costs.parking.amount", 0] }
                        ]
                        },
                        // Cars with paid parking
                        {
                        $and: [
                            { $gt: [{ $toInt: "$enq.request.propertyPreferences.parking.spaces" }, 0] },
                            { $not: 
                                { $eq: [
                                    { $regexMatch: {
                                            input: "$prop.parkingType.value",
                                            regex: ".*free.*",
                                            options: "i"
                                            }
                                        }, true
                                    ] 
                                }, 
                            },
                            { $gt: ["$pricing.costs.parking.amount", 0] }
                        ]
                        },
                        // No cars
                        {
                        $and: [
                            { $eq: [{ $toInt: "$enq.request.propertyPreferences.parking.spaces" }, 0] },
                            { $eq: ["$pricing.costs.parking.amount", 0] }
                        ]
                        }
                    ]
                    }
                }
            },
            // Pet bonus check
            {
                $addFields: {
                    petBonus: {
                        $or: [
                            // 1. Pets but insurance 
                            {
                            $and: [
                                { $gt: [{ $ifNull: ["$enq.request.propertyPreferences.totalPets", "$enq.request.propertyPreferences.pets", 0] }, 0] },
                                { $eq: [{ $arrayElemAt: ["$pricing.deposit.info.amount", 0] }, 0] },
                                { $in: ["$agent.fullName", insurance] },
                                { $gt: ["$pricing.costs.pet.amount", 0] }
                            ]
                            },
                            // 2. Pets 
                            {
                            $and: [
                                { $gt: [{ $ifNull: ["$enq.request.propertyPreferences.totalPets", 0] }, 0] },
                                { $gt: [{ $arrayElemAt: ["$pricing.deposit.info.amount", 0] }, 0] },
                                { $gt: ["$pricing.costs.pet.amount", 0] }
                            ]
                            },
                            // 3. No pets
                            {
                            $and: [
                                { $eq: [{ $ifNull: ["$enq.request.propertyPreferences.totalPets", 0] }, 0] },
                                { $eq: [{ $arrayElemAt: ["$pricing.deposit.info.amount", 0] }, 0] },
                                { $eq: ["$pricing.costs.pet.amount", 0] }
                            ]
                            }
                        ]
                    }
                }
            },

            // All-in-one bonus column
            { $addFields: {
                    isBonusable: {
                        $and: [
                            { $eq: ["$depositBonus", true] },
                            { $eq: ["$parkingBonus", true] },
                            { $eq: ["$petBonus", true] },
                            { $eq: ["$marginBonus", true] },
                            { $eq: ["$durationBonus", true] }
                        ]
                    }
                } 
            },

            { 
                $project: {
                    _id: 0,
                    createdAt: {$toDate: "$createdAt"},
                    ref: "$reference",
                    addedBy: {$first: "$addedBy.fullName"},
                    approvedBy:  {$first: "$approvedBy.fullName"},
                    status: "$status",
                    company: "$comp.name",
                    agent: "$agent.fullName",
                    guest: "$client.fullName",
                    guestPhone1: { $first: "$client.phoneNumbers.phone"},
                    guestPhone2: { $first: { $slice: ["$client.phoneNumbers.phone", 1, 1] } },
                    guestEmail1: { $first: "$client.emailAddresses.email"},
                    guestEmail2: { $first: { $slice: ["$client.emailAddresses.email", 1, 1] } },
                    checkIn: {$toDate: "$checkIn"},
                    checkOut: {$toDate: "$checkOut"},
                    homeAddress: "$address.freeFormAddress",
                    bookedAddress: "$prop.address.freeFormAddress",
                    landlord: "$landlords.displayName",
                    landlordPhone: { $first: { $first: "$landlords.contacts.phoneNumbers.phone" } },
                    landlordEmail: { $first: { $first: "$landlords.contacts.emailAddresses.email" } },
                    duration: {$toInt: "$expectedDuration"},
                    cancellationType: "$cancellationType",
                    cancellation: "$cancellation",
                    avgAirbnbPrice: {  
                        $convert: {
                            input: "$enq.averageAirbnbPrice",
                            to: "int",
                            onError: 0,  
                            onNull: 0     
                            }
                        },
                    supply: "$enq.supply",
                    accessibility: "$enq.request.propertyPreferences.isAccessibilityRequired",
                    isExtension: "$extension.isExtension",
                    isExtended: "$isExtended",
                    isDecant: "$enq.isDecant",
                    propertySynced: { $cond: [{ $ifNull: ["$landlord.name", false] }, true, false ] },
                    numOfParking: "$enq.request.propertyPreferences.parking.spaces",
                    numOfPets: "$enq.request.propertyPreferences.totalPets",
                    landlordPrice: "$pricing.info.landlordRate",
                    quoteOutPrice: "$pricing.info.quoteOutPrice",
                    mhiyMargin: { $divide: [ "$pricing.info.mhiyCommission", 100] },
                    mhiyMarginVal: { $round: [{ $multiply: ["$pricing.info.landlordRate", {$divide: ["$pricing.info.mhiyCommission", 100] } ] }, 2] },
                    expectedYield: { $multiply: [
                                { $multiply: 
                                    [ "$pricing.info.landlordRate", {$divide: ["$pricing.info.mhiyCommission", 100] }  ],  
                                },
                            {$toInt: "$expectedDuration"} 
                        ]
                    },

                    mhiyPrice:  { $multiply: [ "$pricing.info.quoteOutPrice", "$pricing.info.companyCommission" ]},
                    companyCommission: "$pricing.info.companyCommission",
                    parking: "$pricing.costs.parking.amount",
                    landlordParking: "$pricing.costs.parking.landlordRate",
                    pet: "$pricing.costs.pet.amount",
                    landlordPet: "$pricing.costs.pet.landlordRate",
                    cleaning: "$pricing.costs.cleaning.amount",
                    landlordCleaning: "$pricing.costs.cleaning.landlordRate",
                    exitClean: "$pricing.costs.exitClean.amount",
                    landlordExitClean: "$pricing.costs.exitClean.landlordRate",
                    deposit: { $last: "$pricing.deposit.info.amount"},
                    petDeposit: { $first: "$pricing.deposit.info.amount" },
                    propName: "$prop.name",
                    parkingType: "$prop.parkingType.value",
                    correctParking:  {
                        $expr: {
                            $or: [
                            {
                                $and: [
                                    { $regexMatch: {
                                        input: "$prop.parkingType.value",
                                        regex: ".*free.*",
                                        options: "i"
                                        }
                                    },
                                    { $regexMatch: {
                                        input: "$prop.name",
                                        regex: "free.*parking",
                                        options: "i"
                                        }
                                    },
                                ]
                            },

                            {
                                $and: [
                                    { $not: [
                                        { $regexMatch: {
                                            input: "$prop.parkingType.value",
                                            regex: ".*free.*",
                                            options: "i"
                                        }}]
                                    },
                                    { $not: [{
                                        $regexMatch: {
                                            input: "$name",
                                            regex: ".*free.*",
                                            options: "i"
                                        }}]
                                    },
                                ]
                            }
                        ]}
                    },
                    newLL: "$newLL",
                    depositBonus: "$depositBonus",
                    parkingBonus: "$parkingBonus",
                    petBonus: "$petBonus",
                    marginBonus: "$marginBonus",
                    durationBonus: "$durationBonus",
                    isBonusable: "$isBonusable"
                }
            },
            // Handled the sorting step as an explicit part of the aggregation array
            { $sort: { createdAt: 1 } }
        ]);

        console.log(`Retrieved ${pricing.length} booking records.`);

        // 1. Excel Configuration
        const sheetName = "bonus_raw";
        const finalPath = path.join(
                    os.homedir(),
                    process.env.LOCAL,
                    process.env.BONUS_TEST
                );
        const tempPath = path.join(process.env.TEMP, 'temp_export_check.xlsx');

        let workbook;

        // 2. Load or Create Workbook
        if (fs.existsSync(finalPath)) {
            try {
                workbook = XLSX.readFile(finalPath);
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
        const worksheet = XLSX.utils.json_to_sheet(pricing);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // 4. Atomic Write Strategy
        try {
            XLSX.writeFile(workbook, tempPath);
            fs.copyFileSync(tempPath, finalPath);
            fs.unlinkSync(tempPath);
            console.log(`Successfully exported ${pricing.length} rows to: ${finalPath}`);
        } catch (err) {
            if (err.code === 'EBUSY') {
                console.error("ERROR: File is locked. Please close 'bonustest' in Excel and try again.");
            } else {
                console.error("ERROR during export:", err.message);
            }
        }        
        
    } catch (err) {
        console.error("Pipeline Runtime Error:", err.stack);
    } finally {
        // Disconnect using Mongoose
        await mongoose.disconnect();
        console.log("Mongoose disconnected safely.");
    }
}

run().catch(console.dir);