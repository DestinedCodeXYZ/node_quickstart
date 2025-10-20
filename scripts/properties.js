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
            "EN2", "EN3", "N9", "N11", "N13", "N14", "N18", "N21"
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
                $group: {
                    _id: "$postcodePrefix",
                    postcodePrefix: { $first: "$postcodePrefix" },
                    oneBedrooms: {
                        $sum: {
                            $cond: [{ $eq: ["$numberOfBedrooms", 1] }, 1, 0]
                        }
                    },
                    twoBedrooms: {
                        $sum: {
                            $cond: [{ $eq: ["$numberOfBedrooms", 2] }, 1, 0]
                        }
                    },
                    threeBedrooms: {
                        $sum: {
                            $cond: [{ $eq: ["$numberOfBedrooms", 3] }, 1, 0]
                        }
                    },
                    fourBedrooms: {
                        $sum: {
                            $cond: [{ $eq: ["$numberOfBedrooms", 4] }, 1, 0]
                        }
                    },
                    totalProperties: { $sum: 1 },
                }
            },
            {
                $project: {
                    _id:0,
                    postcodePrefix: 1,
                    oneBedrooms: 1,
                    twoBedrooms: 1,
                    threeBedrooms: 1,
                    fourBedrooms: 1,
                    totalProperties: 1,
                }
            },
            {
                $sort: { postcodePrefix: 1 }
            }
        ]).toArray();

        const totals = {
            postcodePrefix: "TOTAL",
            oneBedrooms: home.reduce((sum, item) => sum + item.oneBedrooms, 0),
            twoBedrooms: home.reduce((sum, item) => sum + item.twoBedrooms, 0),
            threeBedrooms: home.reduce((sum, item) => sum + item.threeBedrooms, 0),
            fourBedrooms: home.reduce((sum, item) => sum + item.fourBedrooms, 0),
            totalProperties: home.reduce((sum, item) => sum + item.totalProperties, 0),
        };

        // Add totals row to the results
        home.push(totals);

        console.log(home)

        let worksheet;
        let sheetName = "property count";
        let workbook;
        let filePath = 'C:\\Users\\kevro\\node_quickstart\\scripts\\property_list.xlsx';
        
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
                
        XLSX.writeFile(workbook, "property_list.xlsx");
        
                
        console.log("Exported to property_list.xlsx");
    } 
    catch (err) {
        console.log(err.stack);
    }
    finally {
        await client.close();
    }
}

run().catch(console.dir);