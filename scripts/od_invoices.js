// Invoking libraries
const { MongoClient } = require('mongodb');
const XLSX = require('xlsx');
const fs = require('fs');
const os = require('os');
const path = require('path');

require('dotenv').config({path: path.join(__dirname, '../.env')});

// url for connecting to cluster.
const url = process.env.DB_PASS

// Connecting to mhiy DB (axi-digital.oleo1.mongodb.net)
const client  = new MongoClient(url);

// Query for all existing invoices on db
async function run() {
    try {
        await client.connect();
        console.log("Successfully connected to Atlas!\n");
        
        const database = client.db('myhomeisyours-live');
        const invoices = database.collection('invoices');

        const query = await invoices.aggregate([

        {
            $lookup: {
                from: "bookings",
                localField: "booking",
                foreignField: "_id",
                as: "booking"
            }
        },

        {
            $unwind: { path: "$booking", preserveNullAndEmptyArrays: true }
        },

        {
            $lookup: {
                from: "clients",
                localField: "booking.client",
                foreignField: "_id",
                as: "client"
            }
        },

        {
            $unwind: { path: "$client", preserveNullAndEmptyArrays: true }
        },
        
        {
            $project: {
                _id: 0,
                "Invoice Number": "$invoiceNumber",
                "Supplier": "$customer.name",
                "Reference": "$booking.reference",
                "Guest": "$client.fullName",
                "Invoice Date": { $toDate: "$invoiceDate" },
                "Check-in": { $toDate: "$booking.checkIn"},
                "Check-out": { $toDate: "$booking.checkOut"},
                "Due Date": { $toDate: "$dueDate" },
                "Status": "$status",
                "Currency": "$currency.ref",
                "Total to Supplier": "$totalAmount",
                "Total due to Bnbl": "$totalEffectiveAmount",
                "Total Tax": "$totalTax",
                "Grand Stay Total": "$grandStayTotal",
                "Bnbl Rate" : { $multiply: [
                    { $add: [1, { $divide: [ { $toDouble: "$booking.pricing.info.mhiyCommission" }, 100]  } ] },
                    "$booking.pricing.info.landlordRate"
                    ] 
                }
            } 
        },  
               
        ]).sort({ createdDate: 1, guest: 1 }).toArray();

        console.log(query)
        
        // 1. Configuration
        const sheetName = "invoices_raw";
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
        const worksheet = XLSX.utils.json_to_sheet(query);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // 4. Atomic Write Strategy
        try {
            // Write to Temp first to avoid corrupting the main file if the script crashes
            XLSX.writeFile(workbook, tempPath);
            
            // Copy to OneDrive (Copy + Unlink is often safer than Rename for cloud-synced folders)
            fs.copyFileSync(tempPath, finalPath);
            fs.unlinkSync(tempPath);
            
            console.log(`Successfully exported ${query.length} rows to: ${finalPath}`);
        } catch (err) {
            if (err.code === 'EBUSY') {
                console.error("ERROR: File is locked. Please close 'RAW_DATA.xlsx' in Excel and try again.");
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
