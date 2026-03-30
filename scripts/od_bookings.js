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

async function run() {
    try {
        await client.connect();
        console.log("Successfully connected to Atlas!\n");
        
        const database = client.db('myhomeisyours-live');
        const bookings = database.collection('bookings');

        const pricing = await bookings.aggregate([

            {
                $match: {
                    isDeleted: false
                }
            },

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
                    as: "enqAssigned"
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

            { $addFields: 
                {
                    firstGCAssignedId: { $first: "$assigned" }  // or { $arrayElemAt: ["$extension.parent", 0] }
                }
            },

            // Joining accounts to get guest care assignee
            { $lookup:
                {
                    from: "accounts",
                    localField: "firstGCAssignedId",
                    foreignField: "_id",
                    as: "gcAssigned"
                }
            },

            // Joining for createdBy

            { $lookup:
                {
                    from: "accounts",
                    localField: "createdBy",
                    foreignField: "_id",
                    as: "createdBy"
                }
            },

            { $unwind: {path: "$enq"} },

            // Joining chosenproperties for detail on who added the selected property
            { $lookup:
                {
                    from: "chosenproperties",
                    localField: "property",
                    foreignField: "_id",
                    as: "chosenprop"
                }
            },

            { $unwind: {path: "$chosenprop", preserveNullAndEmptyArrays: true} },

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
                    as: "landlords"
                }
            },

            { $unwind: {
                path: "$landlords",
                preserveNullAndEmptyArrays: true
                }
            },


            { 
                $project: {
                    _id: 0,
                    createdAt: {$toDate: "$createdAt"},
                    createdBy: {$first: "$createdBy.fullName"},
                    ref: "$reference",
                    gcAssignedTo: {$ifNull: [{$first: "$gcAssigned.fullName"}, "unassigned"]},
                    enqAssignedTo: {$first: "$enqAssigned.fullName"},
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
                            { $subtract: [
                                { $multiply: 
                                    [ "$pricing.info.quoteOutPrice", "$pricing.info.companyCommission" ],  
                                },
                                "$pricing.info.landlordRate"
                                ] 
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
                    }
                }
            }

        ]).sort({ createdAt: 1 }).toArray();

        console.log(pricing)

        // 1. Configuration
        const sheetName = "bookings_raw";
        const finalPath = path.join(
                    os.homedir(),
                    process.env.ONEDRIVE_KW,
                    process.env.OD_DUMP
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
                console.error("ERROR: File is locked. Please close 'RAW_DATA' in Excel and try again.");
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
