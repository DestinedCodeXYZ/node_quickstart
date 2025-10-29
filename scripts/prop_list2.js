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

        const home = await properties.aggregate([

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
                    bathrooms: "$numberOfBathrooms",
                    parking: "$parkingType.value",
                    pets: "$petsPolicy.value",
                    garden: "$summary.outside.garden.isAvailable",
                    balcony: "$summary.outside.balcony.isAvailable",
                    patio: "$summary.outside.patio.isAvailable",
                    bbq: "$summary.outside.bbq.isAvailable",
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
        let sheetName = "property list 2";
        let workbook;
        let filePath = 'C:\\Users\\kevro\\node_quickstart\\scripts\\Excel Files\\property_list.xlsx';
        
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
        
                
        console.log(`Exported to ${filePath}.`);
    } 
    catch (err) {
        console.log(err.stack);
    }
    finally {
        await client.close();
    }
}

run().catch(console.dir);