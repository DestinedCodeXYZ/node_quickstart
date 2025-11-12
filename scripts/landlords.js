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
        const landlords = database.collection('landlords');

        const supplier = await landlords.aggregate([

            {
                $match : {"isDeleted" : false}
            },
/*
            { 
                $lookup : {
                    from: "properties",
                    localField: "_id",
                    foreignField: "landlordRef",
                    as: "prop"
                }
            },

            {
                $unwind: {
                    path: "$prop",
                    preserveNullAndEmptyArrays: true
                }
            },
*/
            {
                $project: {
                    createdAt: "$createdAt",
                    name: "$name",
                    phone1: { $first : "$phoneNumbers.phone" },
                    phone2: { $ifNull: [ {$arrayElemAt: ["$phoneNumbers.phone", 1] } , "N/A" ]},
                    _id: { $toString: "$_id" },
                }
            },

            {
                $sort : {_id : 1}
            },

        ]).toArray();


        console.log(supplier)

        let worksheet;
        let sheetName = "landlords";
        let workbook;
        let filePath = 'C:\\Users\\kevro\\Documents\\\Excel Files\\property_count.xlsx';
        
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
        
        worksheet = XLSX.utils.json_to_sheet(supplier);
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