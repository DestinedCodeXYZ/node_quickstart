// Invoking libraries
const { MongoClient } = require('mongodb');
const XLSX = require('xlsx');
const fs = require('fs');

// url for connecting to cluster.
const url = "mongodb+srv://kevronthe5th:PGY7fZFoSWqaYUif@axi-digital.oleo1.mongodb.net/myhomeisyours-live?retryWrites=true&w=majority&appName=Axi-Digital"

// Connecting to mhiy DB (axi-digital.oleo1.mongodb.net)
const client  = new MongoClient(url);

const insurance = ["Romi Mitchell", "Roland Roserie", "Laila Essebane", "Jared Garfield", "Janiv Shah", "Tracy McAlister"];
const freeParking = ["on-site-free", "off-site-free", "street-parking-free"];
const start = new Date(Date.UTC(2025, 10, 1));

async function run() {
    try {
        await client.connect();
        console.log("Successfully connected to Atlas!\n");
        
        const database = client.db('myhomeisyours-live');
        const bookings = database.collection('bookings');

        const pricing = await bookings.aggregate([

            {
                $lookup: {
                    from: "enquiries",
                    localField: "enquiry",
                    foreignField: "_id",
                    as: "enq"
                }
            },

            // Joining accounts to get assigned booker
            { $lookup:
                {
                    from: "accounts",
                    localField: "enq.assigned",
                    foreignField: "_id",
                    as: "assigned"
                }
            },

            // Joining accounts to get who approved costs
            { $lookup:
                {
                    from: "accounts",
                    localField: "enq.approval.approvedBy",
                    foreignField: "_id",
                    as: "approvedBy"
                }
            },

            { $unwind: {path: "$enq", preserveNullAndEmptyArrays: true} },

            // Joining chosenproperties for detail on who added the selected property
            { $lookup:
                {
                    from: "chosenproperties",
                    localField: "enq.selectedPropertyId",
                    foreignField: "_id",
                    as: "chosenprop"
                }
            },

            { $unwind: {path: "$chosenprop", preserveNullAndEmptyArrays: true} },
            // Get property data for chosen properties
            { $lookup:
                {
                    from: "properties",
                    localField: "chosenprop.propertyRef",
                    foreignField: "_id",
                    as: "prop"
                }
            },

            { $unwind: {path: "$prop", preserveNullAndEmptyArrays: true} },

            // Joins onto chosenprop to get booker info
            { $lookup:
                {
                    from: "accounts",
                    localField: "chosenprop.createdBy",
                    foreignField: "_id",
                    as: "addedBy"
                }
            },

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
                    localField: "prop.landlordRef",
                    foreignField: "_id",
                    as: "landlord"
                }
            },

            { $unwind: "$landlord" },

            { 
                $match: {
                    createdAt: { $gte: start },
                    "extension.isExtension" : false,
                    "isDeleted" : false,
                    "status": { $nin: ["cancelled"] },
                    // If pets exist, deposit & pet fee > 0, otherwise they need to = 0
                    $expr: {
                        $eq: [
                        { $cond: [
                            { $or: [
                                // Pets but insurance
                                { $and: [
                                    { $gt: [ "$enq.request.propertyPreferences.totalPets", 0 ] },
                                    { $eq: [ { $arrayElemAt: ["$pricing.deposit.info.amount", 0] }, 0 ] },
                                    { $in: [ "$agent.fullName", insurance ] },
                                    { $gt: [ "$pricing.costs.pet.amount", 0 ] }
                                    ] },
                                // Pets
                                { $and: [
                                    { $gt: [ "$enq.request.propertyPreferences.totalPets", 0 ] },
                                    { $gt: [ { $arrayElemAt: ["$pricing.deposit.info.amount", 0] }, 0 ] },
                                    { $gt: [ "$pricing.costs.pet.amount", 0 ] }
                                    ] },
                                
                                // No pets
                                { $and: [
                                    { $eq: [ "$enq.request.propertyPreferences.totalPets", 0 ] },
                                    { $eq: [ { $arrayElemAt: ["$pricing.deposit.info.amount", 0] }, 0 ] },
                                    { $eq: [ "$pricing.costs.pet.amount", 0 ] }
                                    ] }
                                ]
                            }, true, false 
                        ]}, true
                        ]
                    },
                }
            },

            /*{ 
                $match: {
                // If vehicle exists, check for parking charge. -- WORKS
                    $expr: {
                        $eq: [
                        { $cond: [
                            { $and: [     
                                // Cars but free parking
                                { $and: [
                                    { $gt: [ { $toInt: "$enq.request.propertyPreferences.parking.spaces"}, 0 ] },
                                    { $in: ["$prop.parkingType.value", freeParking ] },
                                    { $eq: [ "$pricing.costs.parking.amount", 0 ] }
                                    ] 
                                },

                                // Cars
                                { $and: [
                                    { $gt: [ { $toInt: "$enq.request.propertyPreferences.parking.spaces"}, 0 ] },
                                    { $not: [ { $in: ["$prop.parkingType.value", freeParking ] } ]  },
                                    { $gt: [ "$pricing.costs.parking.amount", 0 ] }
                                    ] 
                                },

                                // No cars
                                { $and: [
                                    { $eq: [ { $toInt: "$enq.request.propertyPreferences.parking.spaces"}, 0 ] },
                                    { $eq: [ "$pricing.costs.parking.amount", 0 ] }
                                    ] 
                                },
                                ]
                            }, true, false 
                        ]}, true
                    ],
                    },
                }
            },*/
                    
            {
                $match: {
                    // Check for deposit (unless insurance) -- WORKS
                    $expr: {
                        $eq: [
                        { $cond: [
                            { $or: [
                                // Insurance
                                { $and: [
                                    { $eq: [ { $arrayElemAt: ["$pricing.deposit.info.amount", 1] }, 0 ] },
                                    { $in: [ "$agent.fullName", insurance ] }
                                    ] },
                                
                                // Not insurance
                                { $and: [
                                    { $gt: [ { $arrayElemAt: ["$pricing.deposit.info.amount", 1] }, 0 ] },
                                    { $not: [ { $in: [ "$agent.fullName", insurance ] } ] }
                                    ] } 
                                ]
                            }, true, false 
                        ]}, true
                    ],
                    }
                }  
            },


            { 
                $project: {
                    _id: 0,
                    createdAt: {$toDate: "$createdAt"},
                    ref: "$reference",
                    assignedTo: {$first: "$assigned.fullName"},
                    addedBy: {$first: "$addedBy.fullName"},
                    approvedBy:  {$first: "$approvedBy.fullName"},
                    status: "$status",
                    company: "$comp.name",
                    agent: "$agent.fullName",
                    guest: "$client.fullName",
                    guestPhone1: { $first: "$client.phoneNumbers.phone"},
                    guestPhone2: { $first: { $slice: ["$client.phoneNumbers.phone", 1, 1] } },
                    guestEmail1: { $first: "$client.emailAddresses.email"},
                    guestEmail2: { $first: { $slice: ["$client.emailAddresses.email", 1, 1] } },
                    homeAddress: "$address.freeFormAddress",
                    bookedAddress: "$prop.address.freeFormAddress",
                    landlord: "$landlord.name",
                    landlordPhone: { $first: "$landlord.phoneNumbers.phone"},
                    landlordEmail: { $first: "$landlord.emailAddresses.email"},
                    checkIn: {$toDate: "$checkIn"},
                    checkOut: {$toDate: "$checkOut"},
                    duration: {$toInt: "$expectedDuration"},
                    cancellationType: "$cancellationType",
                    cancellation: "$cancellation",
                    avgAirbnbPrice: {  
                        $convert: {
                            input: "$enq.averageAirbnbPrice",
                            to: "int",
                            onError: 0,   // default value if it’s invalid (e.g. "")
                            onNull: 0     // default value if it's null or missing
                            }
                        },
                    supply: "$enq.supply",
                    accessibility: "$enq.request.propertyPreferences.isAccessibilityRequired",
                    isExtension: "$extension.isExtension",
                    isDecant: "$enq.isDecant",
                    propertySynced: { $cond: [{ $ifNull: ["$landlord.name", false] }, true, false ] },
                    numOfParking: "$enq.request.propertyPreferences.parking.spaces",
                    parkingType: "$prop.parkingType.value",
                    numOfPets: "$enq.request.propertyPreferences.totalPets",
                    landlordPrice: "$pricing.info.landlordRate",
                    quoteOutPrice: "$pricing.info.quoteOutPrice",
                    mhiyMargin: { $divide: [ "$pricing.info.mhiyCommission", 100] },
                    mhiyPrice:  { $multiply: [ "$pricing.info.quoteOutPrice", "$pricing.info.companyCommission" ]},
                    companyCommission: "$pricing.info.companyCommission",
                    parking: "$pricing.costs.parking.amount",
                    landlordParking: "$pricing.costs.parking.landlordRate",
                    pet: "$pricing.costs.pet.amount",
                    landlordPet: "$pricing.costs.pet.landlordRate",
                    cleaning: "$pricing.costs.cleaning.amount",
                    landlordCleaning: "$pricing.costs.cleaning.landlordRate",
                    exitClean: "$pricing.costs.exitClean.amount",
                    landlordExitClean: "$pricing.costs.exitClean.landlordRate",
                    deposit: { $last: "$pricing.deposit.info.amount"},
                    petDeposit: { $first: "$pricing.deposit.info.amount" } 
                }
            }

        ]).sort({ createdAt: 1 }).toArray();

        console.log(pricing)


        let worksheet;
        let sheetName = "bonus";
        let workbook;
        let filePath = 'C:\\Users\\kevro\\Documents\\Excel Files\\bonustest.xlsx';

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
