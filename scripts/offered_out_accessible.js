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

        const enqs_vs_bookings = await enquiries.aggregate([

        
        { $match: { isDeleted: false, status: { $nin: ["cancelled"] } } },

        {
            $match: {
            $expr: {
            $and: [
                { $eq: [ { $month: "$createdAt" }, 9 ] },
                { $eq: [ { $year: "$createdAt" }, 2025 ] }
            ]
            }
        }
        },
        // Always have an array to unwind
        { $addFields: { newPropsSafe: { $ifNull: ["$newProperties", []] } } },

        // One output row per newProperties entry; if none exist, we still keep one row (null)
        { $unwind: { path: "$newPropsSafe", preserveNullAndEmptyArrays: true } },

        // A) direct match by _id if this enquiry lists a chosenprop in newProperties
        {
            $lookup: {
            from: "chosenproperties",
            localField: "newPropsSafe",
            foreignField: "_id",
            as: "cpDirect"
            }
        },

        // B) fallback: latest chosenprop for this enquiry (no cartesian product)
        {
            $lookup: {
            from: "chosenproperties",
            let: { enqId: "$_id" },
            pipeline: [
                { $match: { $expr: { $eq: ["$enquiryId", "$$enqId"] } } },
                { $sort: { createdAt: -1, _id: -1 } },   // change to createdDate if that’s your field
                { $limit: 1 }
            ],
            as: "cpLatest"
            }
        },

        // Prefer the explicitly listed one; otherwise take the latest
        {
            $addFields: {
            chosenprop: {
                $cond: [
                { $gt: [{ $size: "$cpDirect" }, 0] },
                { $arrayElemAt: ["$cpDirect", 0] },
                { $arrayElemAt: ["$cpLatest", 0] }
                ]
            }
            }
        },

        // Pull the property document for the chosenprop’s propertyRef
        {
            $lookup: {
            from: "properties",
            localField: "chosenprop.propertyRef",
            foreignField: "_id",
            as: "prop"
            }
        },

        { $unwind: { path: "$prop", preserveNullAndEmptyArrays: true } },

        // Join the account (1:1)
        {
            $lookup: {
            from: "accounts",
            localField: "assigned",
            foreignField: "_id",
            as: "acc"
            }
        },

        { $unwind: { path: "$acc", preserveNullAndEmptyArrays: true } },

        {
            $project: {
            _id: 0,
            ref: "$reference",
            agent: "$acc.fullName",

            // from the property doc and chosenprop
            propName: "$prop.name",              
            propMargin: "$chosenprop.costs.margin.amount",  // use chosenprop’s margin to match the selection
            landlordRate: "$chosenprop.costs.nightlyRate.amount",
            mhiyRate: {
                $multiply: [
                    "$chosenprop.costs.nightlyRate.amount",
                    { $add: [1, { $divide: ["$chosenprop.costs.margin.amount", 100] }] }
                        ]
                    },
            icabRate: {
                $multiply: [
                    {
                    $multiply: [
                        "$chosenprop.costs.nightlyRate.amount",
                        { $add: [1, { $divide: ["$chosenprop.costs.margin.amount", 100] }] }
                            ]
                        },
                    1.15
                    ]
                    },
            avgAirbnbPrice: "$averageAirbnbPrice",
            accessibility: "$request.propertyPreferences.isAccessibilityRequired",
            createdAt: "$createdAt"
                },
            

        },
        


        { $sort: { createdAt: 1 } }
               
        ]).toArray();

        console.log(enqs_vs_bookings)

        let worksheet;
        let sheetName = "oo props - accessible";
        let workbook;
        let filePath = 'C:\\Users\\kevro\\Documents\\Excel Files\\enqlist.xlsx';

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

        worksheet = XLSX.utils.json_to_sheet(enqs_vs_bookings);
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