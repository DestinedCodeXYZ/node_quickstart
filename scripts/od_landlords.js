// Invoking libraries
const { MongoClient } = require('mongodb');
const XLSX = require('xlsx');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { performServerHandshake } = require('http2');

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
        const landlords = database.collection('landlords');

        const ll = await landlords.aggregate([

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
                $lookup: {
                    from: "accounts",
                    localField: "checklist.createdBy",
                    foreignField: "_id",
                    as: "verifier"
                }
            },


            { $addFields:
                { newLL:
                    { $cond: [
                        { $lt: [
                            { $subtract: ["$createdAt", "$landlords.createdAt"] },
                            1000*60*60*24*30
                            ] 
                        },
                        true, false
                    ] 
                    }
                }
            },

            {
                $project: {
                    createdAt: "$createdAt",
                    _id: { $toString: "$_id" },
                    name: "$displayName",
                    phone1: { $first : { $first: "$contacts.phoneNumbers.phone" } },
                    phone2: { $ifNull: [ {$arrayElemAt: ["$phoneNumbers.phone", 1] } , "N/A" ]},
                    email: { $first: { $first: "$contacts.emailAddresses.email" } },
                    "Company Name" : "$company.name",
                    "Company URL" : "$company.url",
                    "Size" : "$size",
                    "Ownership" : "$ownership",
                    "Traffic light system" : "$trafficLightSystem",
                    "No of Listings on Orbit" : {$ifNull: ["$numberOfListings", 0]},
                    "No of Bookings" : {$ifNull: ["$historicalBookings", 0]},
                    "Is Verified" : {$ifNull: [{$first: "$checklist.isLandlordVerified"}, false]},
                    "Is Email Suppressed" : {$first: "$checklist.isEmailSuppressed"},
                    "Verified By" : {$first: "$verifier.fullName"},
                    "WhatsApp Number?": "$contactNumber.isWhatsapp",
                    newLL: "$newLL"
                }
            },

            {
                $sort : {_id : 1}
            },

        ]).toArray();


        console.log(ll)

        // 1. Configuration
        const sheetName = "landlords_raw";
        const finalPath = path.join(
                    os.homedir(),
                    process.env.ONEDRIVE_DIR,
                    process.env.OD_FILENAME
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
        const worksheet = XLSX.utils.json_to_sheet(ll);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // 4. Atomic Write Strategy
        try {
            // Write to Temp first to avoid corrupting the main file if the script crashes
            XLSX.writeFile(workbook, tempPath);
            
            // Copy to OneDrive (Copy + Unlink is often safer than Rename for cloud-synced folders)
            fs.copyFileSync(tempPath, finalPath);
            fs.unlinkSync(tempPath);
            
            console.log(`Successfully exported ${ll.length} rows to: ${finalPath}`);
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