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
            "SG7", "SG8", "SG9", "SG19", "CB22", "CB23", "SG5", "SG6",
            "CB1", "CB2", "CB3", "CB4", "CB5", "CB21", "CB24", "CB25", "CB8",
            "SG1", "SG2", "SG3", "SG4", "SG15", "SG16", "SG17", "SG18",
            "CM21", "CM22", "CM23", "PE19", "PE27", "PE28", "PE29",
            "AL6", "AL7", "AL8"

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
                    landlordName: "$landlords.displayName",
                    landlordEmail: { $first: "$landlords.emailAddresses.email" },
                    landlordPhone: { $first: "$landlords.phoneNumbers.phone"},      
                }
            },
            { $project : {_id: 0} },
            { $sort : {postcode: 1} },

        ]).toArray();


        console.log(home)

        let worksheet;
        let sheetName = "property list royston";
        let workbook;
        let filePath = 'C:\\Users\\kevro\\Documents\\Excel Files\\property_list_royston.xlsx';
        
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