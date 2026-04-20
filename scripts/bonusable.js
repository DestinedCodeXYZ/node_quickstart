// Invoking libraries
const { MongoClient } = require('mongodb');
const XLSX = require('xlsx');
const fs = require('fs');
const os = require('os');
const path = require('path');

require('dotenv').config({path: path.join(__dirname, '../.env')});

// url for connecting to cluster.
const url = "mongodb+srv://kevronthe5th:PGY7fZFoSWqaYUif@axi-digital.oleo1.mongodb.net/myhomeisyours-live?retryWrites=true&w=majority&appName=Axi-Digital"

// Connecting to mhiy DB (axi-digital.oleo1.mongodb.net)
const client  = new MongoClient(url);

const insurance = ["Romi Mitchell", "Roland Roserie", "Laila Essebane", "Jared Garfield ", "Janiv Shah", "Tracy McAlister"];
const start = new Date(Date.UTC(2026, 0, 1));

async function run() {
    try {
        await client.connect();
        console.log("Successfully connected to Atlas!\n");
        
        const database = client.db('myhomeisyours-live');
        const bookings = database.collection('bookings');

        const pricing = await bookings.aggregate([

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
            
            // Duration bonus check -- WORKS
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
                            ]}, true, false
                        ]
                    }
                }
            },
            // Margin bonus check -- WORKS
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

            // Deposit bonus check -- WORKS
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
            // Parking bonus check -- WORKS
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
            // Pet bonus check -- WORKS
            {
                $addFields: {
                    petBonus: {
                        $or: [
                            // 1. Pets but insurance (Safe: uses totalPets -> pets -> 0)
                            {
                            $and: [
                                { $gt: [{ $ifNull: ["$enq.request.propertyPreferences.totalPets", "$enq.request.propertyPreferences.pets", 0] }, 0] },
                                { $eq: [{ $arrayElemAt: ["$pricing.deposit.info.amount", 0] }, 0] },
                                { $in: ["$agent.fullName", insurance] },
                                { $gt: ["$pricing.costs.pet.amount", 0] }
                            ]
                            },
                            // 2. Pets (Fixed: Added $ifNull fallback to 0)
                            {
                            $and: [
                                { $gt: [{ $ifNull: ["$enq.request.propertyPreferences.totalPets", 0] }, 0] },
                                { $gt: [{ $arrayElemAt: ["$pricing.deposit.info.amount", 0] }, 0] },
                                { $gt: ["$pricing.costs.pet.amount", 0] }
                            ]
                            },
                            // 3. No pets (Fixed: Added $ifNull fallback to 0)
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

            // All-in-one bonus column so I don't have to project & filter all 3
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
                            onError: 0,   // default value if it’s invalid (e.g. "")
                            onNull: 0     // default value if it's null or missing
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
                                // Regex to check for free parking in type.
                                    { $regexMatch: {
                                        input: "$prop.parkingType.value",
                                        regex: ".*free.*",
                                        options: "i"
                                        }
                                    },
                                    
                                    // Regex to check for free parking in title
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
                                // Regex to check for paid parking in type.
                                    { $not: [
                                        { $regexMatch: {
                                            input: "$prop.parkingType.value",
                                            regex: ".*free.*",
                                            options: "i"
                                        }}]
                                    },
                                // Regex to check free parking is not in title
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
            }

        ]).sort({ createdAt: 1 }).toArray();

        console.log(pricing)


        // 1. Configuration
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
        const worksheet = XLSX.utils.json_to_sheet(pricing);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // 4. Atomic Write Strategy
        try {
            // Write to Temp first to avoid corrupting the main file if the script crashes
            XLSX.writeFile(workbook, tempPath);
            
            // Copy to OneDrive (Copy + Unlink is often safer than Rename for cloud-synced folders)
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
        console.log(err.stack);
    }
    finally {
        await client.close();
    }
}

run().catch(console.dir);
