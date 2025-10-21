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

        // Summary: properties per landlord, bucketed by bedrooms (1..5)
        // OPTIONAL filters (uncomment if you have these fields)
        // { $match: { isDeleted: { $ne: true } } },

        // Join landlord doc if you use a ref (landlordRef[0])
        // ─────────────────────────────────────────────────────────────
        // Landlord join → "Unsynced" bucket for missing/blank names,
        // bedroom bucketing (1..5), and studio split
        // ─────────────────────────────────────────────────────────────
        {
            $lookup: {
                from: "landlords",
                localField: "landlordRef.0",
                foreignField: "_id",
                as: "landlordDoc"
            }
        },
        { $unwind: { path: "$landlordDoc", preserveNullAndEmptyArrays: true } },

        // Normalize fields (NO fallback to embedded names)
        {
            $addFields: {
                _landlordNameRaw: "$landlordDoc.name",
                _bedroomsRaw: { $ifNull: [ "$numberOfBedrooms", "$bedrooms" ] },
                _type: { $toLower: { $trim: { input: { $ifNull: [ "$type", "" ] } } } }
            }
        },

        // Group key: landlord name or "Unsynced"
        {
            $addFields: {
                _groupName: {
                $cond: [
                    {
                    $and: [
                        { $ne: ["$_landlordNameRaw", null] },
                        { $ne: [{ $trim: { input: "$_landlordNameRaw" } }, ""] }
                    ]
                    },
                    "$_landlordNameRaw",
                    "Unsynced"
                ]
                }
            }
        },

        // Bedrooms → integer; bucket 1..5 (5 = 5+)
        {
            $addFields: {
                _bedroomsInt: {
                $cond: [
                    { $and: [ { $ne: ["$_bedroomsRaw", null] }, { $ne: ["$_bedroomsRaw", ""] } ] },
                    { $toInt: "$_bedroomsRaw" },
                    null
                ]
                }
            }
        },

        {
            $addFields: {
                _bucket: {
                    $switch: {
                        branches: [
                        { case: { $eq: ["$_bedroomsInt", 1] }, then: 1 },
                        { case: { $eq: ["$_bedroomsInt", 2] }, then: 2 },
                        { case: { $eq: ["$_bedroomsInt", 3] }, then: 3 },
                        { case: { $eq: ["$_bedroomsInt", 4] }, then: 4 },
                        { case: { $gte: ["$_bedroomsInt", 5] }, then: 5 } // 5 = 5+
                        ],
                        default: null
                    }
                }
            }
        },

        // Keep rows with a valid bedroom bucket
        { $match: { _bucket: { $ne: null } } },

        // ─────────────────────────────────────────────────────────────
        // GROUP: studios separate, 1-bed excludes studios
        // ─────────────────────────────────────────────────────────────
        {
        $group: {
            _id: "$_groupName",
            landlordName: { $first: "$_groupName" },

            // studios (bucket==1 and studio-like types)
            studios: {
                $sum: {
                    $cond: [
                        {
                            $and: [
                            { $eq: ["$_bucket", 1] },
                            { $in: ["$_type", ["studio", "studio flat", "studio apartment"]] }
                            ]
                        },
                    1, 0
                    ]
                }
            },

            // 1-bed EXCLUDING studios
            oneBedrooms: {
            $sum: {
                $cond: [
                {
                    $and: [
                    { $eq: ["$_bucket", 1] },
                    { $not: [{ $in: ["$_type", ["studio", "studio flat", "studio apartment"]] }] }
                    ]
                },
                1, 0
                ]
            }
            },

            twoBedrooms:   { $sum: { $cond: [{ $eq: ["$_bucket", 2] }, 1, 0] } },
            threeBedrooms: { $sum: { $cond: [{ $eq: ["$_bucket", 3] }, 1, 0] } },
            fourBedrooms:  { $sum: { $cond: [{ $eq: ["$_bucket", 4] }, 1, 0] } },
            fiveBedrooms:  { $sum: { $cond: [{ $eq: ["$_bucket", 5] }, 1, 0] } }, // 5 = 5+

            totalProperties: { $sum: 1 }
        }
        },

        {
        $project: {
            _id: 0,
            landlordName: {
                $cond: [
                    {
                    $or: [
                        { $eq: ["$landlordName", null] },
                        { $eq: [{ $trim: { input: "$landlordName" } }, ""] }
                    ]
                    },
                    "Unsynced Properties",
                    "$landlordName"
                ]
                },
            studios: 1,
            oneBedrooms: 1,          // non-studio 1-beds
            twoBedrooms: 1,
            threeBedrooms: 1,
            fourBedrooms: 1,
            fiveBedrooms: 1,         // counts all 5+
            totalProperties: 1
        }
        },

        { $sort: { totalProperties: -1 } }

        ]).toArray();

        const totals = {
            landlordName: "TOTAL",
            studios: home.reduce((sum, item) => sum + item.studios, 0),
            oneBedrooms: home.reduce((sum, item) => sum + item.oneBedrooms, 0),
            twoBedrooms: home.reduce((sum, item) => sum + item.twoBedrooms, 0),
            threeBedrooms: home.reduce((sum, item) => sum + item.threeBedrooms, 0),
            fourBedrooms: home.reduce((sum, item) => sum + item.fourBedrooms, 0),
            fiveBedrooms: home.reduce((sum, item) => sum + item.fiveBedrooms, 0),
            totalProperties: home.reduce((sum, item) => sum + item.totalProperties, 0),
        };

        // Add totals row to the results
        home.push(totals);

        console.log(home)

        let worksheet;
        let sheetName = "property count";
        let workbook;
        let filePath = 'C:\\Users\\kevro\\node_quickstart\\scripts\\property_count.xlsx';
        
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