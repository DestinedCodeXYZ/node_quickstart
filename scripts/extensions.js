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
        const bookings = database.collection('bookings');

        const pricing = await bookings.aggregate([

            { 
                $match: {
                    "extension.isExtension": true 
                }
            },

            {
                $lookup: {
                    from: "enquiries",
                    localField: "enquiry",
                    foreignField: "_id",
                    as: "enq"
                }
            },

            { $lookup:
                {
                    from: "accounts",
                    localField: "enq.assigned",
                    foreignField: "_id",
                    as: "acc"
                }
            },

            { $unwind: {path: "$enq", preserveNullAndEmptyArrays: true} },

            // Left join on clients collection
            { $lookup: 
                {
                    from: "clients",
                    localField: "client",
                    foreignField: "_id",
                    as: "client",
                }
            },

            { $unwind: "$client" },

            // Left join on companies collection
            { $lookup:
                {
                    from: "companies",
                    localField: "company",
                    foreignField: "_id",
                    as: "comp"
                }
            },

            { $unwind: "$comp" },

            { $lookup:
                {
                    from: "agents",
                    localField: "agent",
                    foreignField: "_id",
                    as: "agent"
                }
            },

            { $unwind: "$agent" },

            { $lookup:
                {
                    from: "landlords",
                    localField: "landlord",
                    foreignField: "_id",
                    as: "landlord"
                }
            },

            { $unwind: "$landlord" },

            { 
                $project: {
                    _id: 0,
                    ref: "$reference",
                    booker: {$first: "$acc.fullName"},
                    company: "$comp.name",
                    agent: "$agent.fullName",
                    guest: "$client.fullName",
                    address: "$address.freeFormAddress",
                    guestPhone1: { $first: "$client.phoneNumbers.phone"},
                    guestPhone2: { $first: { $slice: ["$client.phoneNumbers.phone", 1, 1] } },
                    guestEmail1: { $first: "$client.emailAddresses.email"},
                    guestEmail2: { $first: { $slice: ["$client.emailAddresses.email", 1, 1] } },
                    checkIn: "$checkIn",
                    checkOut: "$checkOut",
                    avgAirbnbPrice: {  
                        $convert: {
                            input: "$enq.averageAirbnbPrice",
                            to: "int",
                            onError: 0,   // default value if it’s invalid (e.g. "")
                            onNull: 0     // default value if it's null or missing
                            }
                        },
                    supply: "$enq.supply",
                    status: "$status",
                    landlordPrice: "$pricing.info.landlordRate",
                    quoteOutPrice: "$pricing.info.quoteOutPrice",
                    mhiyMargin: "$pricing.info.mhiyCommission",
                    companyCommission: "$pricing.info.companyCommission",
                    parking: "$pricing.costs.parking.amount",
                    pet: "$pricing.costs.pet.amount",
                    cleaning: "$pricing.costs.cleaning.amount",
                    exitClean: "$pricing.costs.exitClean.amount",
                    accessibility: "$enq.request.propertyPreferences.isAccessibilityRequired",
                    createdAt: 1
                }
            }

        ]).sort({ guest: 1 }).toArray();

        console.log(pricing)


        let worksheet;
        let sheetName = "extensions";
        let workbook;
        let filePath = 'C:\\Users\\kevro\\node_quickstart\\scripts\\Excel Files\\booking.xlsx';

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
            console.log(`Overwriting ${sheetName} sheet in ${filePath}...`)

        }

        worksheet = XLSX.utils.json_to_sheet( pricing, {cellDates : true} );
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        
        XLSX.writeFile(workbook, filePath);

        
        console.log(`Exported to ${filePath}.`);
        
} catch (err) {
        console.log(err.stack);
    }
    finally {
        await client.close();
    }
}

run().catch(console.dir);