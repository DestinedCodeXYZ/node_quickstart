// Invoking MongoDB and XLSX libraries
const { MongoClient } = require('mongodb');
const XLSX = require('xlsx');
const fs = require('fs');

// url for connecting to cluster.
const url = "mongodb+srv://kevronthe5th:PGY7fZFoSWqaYUif@axi-digital.oleo1.mongodb.net/myhomeisyours-live?retryWrites=true&w=majority&appName=Axi-Digital"

// Connecting to mhiy DB (axi-digital.oleo1.mongodb.net)
const client  = new MongoClient(url);

// Query for all existing enquiries on db
async function run() {
    try {
        await client.connect();
        console.log("Successfully connected to Atlas!\n");
        
        const database = client.db('myhomeisyours-live');
        const enquiries = database.collection('enquiries');

        const testproperties = await enquiries.aggregate([
            // Left outer join on companies

        {
            $unwind: {
                path: "$properties",
                preserveNullAndEmptyArrays: true
            }
        },

        {
            $match: {
                    "properties.status" : {$in : ["offeredOut"]}
                }
        },

        {
            $project: {
                _id: 0,
                ref: "$reference",
                guest: "$clientName",
                createdDate: "$createdAt",
                status: "$status",
                propStatus: "$properties.status"
            } 
        },  
               
        ]).sort({ createdDate: 1, guest: 1 }).toArray();

        console.log(testproperties)

        let worksheet;
        let sheetName = "ooPropTest";
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

        worksheet = XLSX.utils.json_to_sheet(testproperties);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        
        XLSX.writeFile(workbook, filePath);

        
        console.log(`Exported to ${filePath}`);

    } catch (err) {
        console.log(err.stack);
    }
    finally {
        await client.close();
    }
}

run().catch(console.dir);
