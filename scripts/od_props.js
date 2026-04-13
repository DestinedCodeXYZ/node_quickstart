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
        const properties = database.collection('properties');

        const prop = await properties.aggregate([

            { 
                $match: {
                    isDeleted: false
                }
            },

            { $sort : {createdAt: 1} },

            // Join landlords table to project landlord info
            {
                $lookup : {
                    from : "landlords",
                    localField : "landlordRef.0",
                    foreignField : "_id",
                    as : "landlords"
                }
            },
            
            { 
                $unwind: {
                    path: "$landlords",
                    preserveNullAndEmptyArrays: true
                }
            },

            {
                $project:
                {  
                    name: "$name",
                    createdAt: "$createdAt", 
                    

                    longitude: {$arrayElemAt: ["$address.position.coordinates", 0]},
                    latitude: {$arrayElemAt: ["$address.position.coordinates", 1]},
                    postcode: "$address.zip",
                    fullAddress: "$address.freeFormAddress",
                    bedrooms: "$numberOfBedrooms",
                    beds: {
                        $subtract: [
                            "$numberOfBeds",
                            {
                                $add: [
                                    // Subtract sofa beds from living rooms
                                    {
                                        $sum: {
                                            $map: {
                                                input: {
                                                    $filter: {
                                                        input: "$livingRooms.beds",
                                                        cond: { $eq: ["$$this.type", "sofa"] }
                                                    }
                                                },
                                                as: "sofaBed",
                                                in: "$$sofaBed.value"
                                            }
                                        }
                                    },
                                    // Subtract cots from bedrooms
                                    {
                                        $sum: {
                                            $map: {
                                                input: {
                                                    $filter: {
                                                        input: "$bedrooms.beds",
                                                        cond: { $eq: ["$$this.type", "cots"] }
                                                    }
                                                },
                                                as: "cot",
                                                in: "$$cot.value"
                                            }
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    parking: "$parkingType.value",
                    bathrooms: "$numberOfBathrooms",
                    pets: "$petsPolicy.value",
                    garden: "$summary.outside.garden.isAvailable",
                    balcony: "$summary.outside.balcony.isAvailable",
                    patio: "$summary.outside.patio.isAvailable",
                    bbq: "$summary.outside.bbq.isAvailable",
                    liveExtLink: "$livePropertyLink",
                    landlordName: "$landlords.displayName",
                    landlordEmail: { $first: { $first: "$landlords.contacts.emailAddresses.email" } },
                    landlordPhone: { $first: { $first: "$landlords.contacts.phoneNumbers.phone" } },    
                    parkingFlag:  {
                        $expr: {
                            $or: [
                            {
                                $and: [
                                // Regex to check for free parking in type.
                                    { $regexMatch: {
                                        input: "$parkingType.value",
                                        regex: ".*free.*",
                                        options: "i"
                                        }
                                    },
                                    
                                    // Regex to check for free parking in title
                                    { $regexMatch: {
                                        input: "$name",
                                        regex: "free.*parking",
                                        options: "i"
                                        }
                                    },
                                ]
                            },

                            {
                                $and: [
                                // Regex to check for paid parking in type.
                                    { $not: { 
                                        $regexMatch: {
                                        input: "$parkingType.value",
                                        regex: ".*free.*",
                                        options: "i"
                                        }
                                    }
                                    },
                                    
                                    // Regex to check free parking is not in title
                                    { $not: { 
                                        $regexMatch: {
                                        input: "$name",
                                        regex: "free.*parking",
                                        options: "i"
                                        }
                                    }
                                    },
                                ]
                            }
                        ]}
                    },
                    isHalfway: { $ifNull: ["$isHalfwayHouse", false]}
                }
            },

            { $project : {_id: 0} }

        ]).toArray();

        console.log(prop)

        // 1. Configuration
        const sheetName = "props_raw";
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
        const worksheet = XLSX.utils.json_to_sheet(prop);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // 4. Atomic Write Strategy
        try {
            // Write to Temp first to avoid corrupting the main file if the script crashes
            XLSX.writeFile(workbook, tempPath);
            
            // Copy to OneDrive (Copy + Unlink is often safer than Rename for cloud-synced folders)
            fs.copyFileSync(tempPath, finalPath);
            fs.unlinkSync(tempPath);
            
            console.log(`Successfully exported ${prop.length} rows to: ${finalPath}`);
        } catch (err) {
            if (err.code === 'EBUSY') {
                console.error("ERROR: File is locked. Please close 'RAW_DATA' in Excel and try again.");
            } else {
                console.error("ERROR during export:", err.message);
            }
        }
    } 
    catch (err) {
        console.log(err.stack);
    }
    finally {
        await client.close();
    }
}

run().catch(console.dir);