// Invoking libraries
const { MongoClient } = require('mongodb');
const XLSX = require('xlsx');
const fs = require('fs');

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

        const postcodeList = [
            "BL0","BL1","BL2","BL3","BL4","BL5","BL6","BL7","BL8","BL9",
            "M1","M2","M3","M4","M5","M6","M7","M8","M9","M11","M12","M13","M14","M15","M16","M17",
            "M18","M19","M20","M21","M22","M23","M24","M25","M26","M27","M28","M29","M30",
            "M31","M32","M33","M34","M35","M38","M41","M44","M46","M50","M60","M90","M99",
            "OL1","OL2","OL3","OL4","OL5","OL6","OL7","OL8","OL9","OL10","OL11","OL12","OL15","OL16",
            "SK1","SK2","SK3","SK4","SK5","SK6","SK7","SK8","SK12","SK14","SK15","SK16",
            "WN1","WN2","WN3","WN4","WN5","WN6","WN7",
            "WA3","WA14","WA15"
        ];

        const home = await properties.aggregate([

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
                $addFields: {
                    postcodePrefix: {
                        $switch: {
                            branches: postcodeList.map(prefix => ({
                                case: { 
                                    $regexMatch: { 
                                        input: "$address.zip", 
                                        regex: new RegExp(`^${prefix}\\s`, "i")  // Match prefix followed by space
                                    } 
                                },
                                then: prefix
                            })),
                            default: null
                        }
                    }
                }
            },
            {
                $match: {
                    postcodePrefix: { $ne: null } // Only include properties with matching postcodes
                }
            },
            {
                $project:
                {
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
                    bathrooms: "$numberOfBathrooms",
                    parking: "$parkingType.value",
                    pets: "$petsPolicy.value",
                    garden: "$summary.outside.garden.isAvailable",
                    balcony: "$summary.outside.balcony.isAvailable",
                    patio: "$summary.outside.patio.isAvailable",
                    bbq: "$summary.outside.bbq.isAvailable",
                    liveLink: {$concat: ["https://www.myhomeisyours.co.uk/public/property/" ,{$toString: "$_id"}]},
                    liveExtLink: "$livePropertyLink",
                    landlordName: "$landlords.name",
                    landlordEmail: { $first: "$landlords.emailAddresses.email" },
                    landlordPhone: { $first: "$landlords.phoneNumbers.phone"},      
                }
            },
            { $project : {_id: 0} },
            { $sort : {postcode: 1} },

        ]).toArray();


        console.log(home)

        let worksheet;
        let sheetName = "props manchester";
        let workbook;
        let filePath = 'C:\\Users\\kevro\\Documents\\Excel Files\\property_list_manchester.xlsx';
        
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
        
        worksheet = XLSX.utils.json_to_sheet(home);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
                
        XLSX.writeFile(workbook, filePath);
        
                
        console.log(`Exported to ${filePath}`);
    } 
    catch (err) {
        console.log(err.stack);
    }
    finally {
        await client.close();
    }
}

run().catch(console.dir);