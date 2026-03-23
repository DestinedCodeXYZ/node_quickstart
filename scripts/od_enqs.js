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
                checkIn: {$toDate: "$availability.checkIn"},
                checkOut: {$toDate: "$availability.checkOut"},
                averageAirbnbPrice: "$averageAirbnbPrice",
                status: "$status",
                isExtension: "$extension.isExtension",
                accessibility: "$request.propertyPreferences.isAccessibilityRequired",
            } 
        },  
               
        ]).sort({ createdDate: 1, guest: 1 }).toArray();

        console.log(existing_enqs)
        
        // 1. Configuration
        const sheetName = "enqs_raw";
        const finalPath = path.join(
                            os.homedir(),
                            process.env.ONEDRIVE_KW,
                            process.env.OD_RAWDATA
                        );
        const tempPath = path.join(process.env.TEMP, 'temp_export_check.xlsx');

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
        const worksheet = XLSX.utils.json_to_sheet(existing_enqs);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // 4. Atomic Write Strategy
        try {
            // Write to Temp first to avoid corrupting the main file if the script crashes
            XLSX.writeFile(workbook, tempPath);
            
            // Copy to OneDrive (Copy + Unlink is often safer than Rename for cloud-synced folders)
            fs.copyFileSync(tempPath, finalPath);
            fs.unlinkSync(tempPath);
            
            console.log(`Successfully exported ${existing_enqs.length} rows to: ${finalPath}`);
        } catch (err) {
            if (err.code === 'EBUSY') {
                console.error("ERROR: File is locked. Please close 'enquiries.xlsx' in Excel and try again.");
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
