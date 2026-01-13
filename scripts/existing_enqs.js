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

        const existing_enqs = await enquiries.aggregate([

        // Filter for deleted & cancelled enquiries
        {
            $match: {
                    "isDeleted" : false, 
                    "status" : {$nin : ["cancelled"]},
                }
        },

        // Join on accounts
        {
            $lookup: {
                from: "accounts",
                localField: "assigned",
                foreignField: "_id",
                as: "acc"
            }
        },



        {
            $lookup: {
                from: "agents",
                localField: "requestBy",
                foreignField: "_id",
                as: "agent"
            }
        },

        { 
            $unwind: {
                path: "$agent",
                preserveNullAndEmptyArrays: true
            } 
        },

        // Join on companies
        {
            $lookup: {
                from: "companies",
                localField: "company",
                foreignField: "_id",
                as: "comp"
            }
        },

        {
            $unwind: {
                path: "$comp",
                preserveNullAndEmptyArrays: true 
            }
        },

        {
            $match: {
                $expr: { $ne: ["$acc.fullName", "Admin Master"]}
            }
        },

        {
            $project: {
                _id: 0,
                createdDate: {$toDate: "$createdAt"},
                ref: "$reference",
                agent : {$first: "$acc.fullName"},
                requestBy: "$agent.fullName",
                company: "$comp.name",
                guest: "$clientName",
                duration: {$toInt: "$availability.expectedDuration"},
                checkIn: "$availability.checkIn",
                checkOut: "$availability.checkOut",
                averageAirbnbPrice: "$averageAirbnbPrice",
                status: "$status",
                isExtension: "$extension.isExtension",
                accessibility: "$request.propertyPreferences.isAccessibilityRequired",
            } 
        },  
               
        ]).sort({ createdDate: 1, guest: 1 }).toArray();

        console.log(existing_enqs)

        let worksheet;
        let sheetName = "existing enqs";
        let workbook;
        let filePath = 'C:\\Users\\kevro\\Documents\\Excel Files\\enq_hist.xlsx';

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

        worksheet = XLSX.utils.json_to_sheet(existing_enqs);
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
