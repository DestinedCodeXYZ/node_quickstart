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
                    localField: "landlord",
                    foreignField: "_id",
                    as: "landlord"
                }
            },

            { $unwind: "$landlord" },


            { 
                $project: {
                    _id: 0,
                    createdAt: {$toDate: "$createdAt"},
                    ref: "$reference",
                    assignedTo: {$first: "$assigned.fullName"},
                    addedBy: {$first: "$addedBy.fullName"},
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
                    accessibility: "$enq.request.propertyPreferences.isAccessibilityRequired",
                    isExtension: "$extension.isExtension",
                    isDecant: "$enq.isDecant",
                    numOfParking: "$enq.request.propertyPreferences.parking.spaces",
                    parkingType: "$prop.parkingType.value",
                    numOfPets: "$enq.request.propertyPreferences.totalPets",
                    landlordPrice:  { $concat: [ "£", { $toString: "$pricing.info.landlordRate"} ] },
                    quoteOutPrice:  { $concat: [ "£", { $toString: "$pricing.info.quoteOutPrice"} ] },
                    mhiyMargin: { $concat: [ { $toString: "$pricing.info.mhiyCommission" }, "%" ] },
                    mhiyMarginVal: { $concat: 
                        ["£", { $toString:
                            { $round: [{ $multiply: 
                                [
                                    { $divide: [ "$pricing.info.mhiyCommission", 100] },
                                    "$pricing.info.landlordRate"
                                ]
                            }, 2]}
                        }]
                    },
                    mhiyPrice: { $concat: 
                        [ "£", { $toString: 
                            { $round: [{ $multiply: 
                                [ "$pricing.info.quoteOutPrice", "$pricing.info.companyCommission" ]
                            }, 2]}
                        }] 
                    },
                    companyCommission: "$pricing.info.companyCommission",
                    parking: { $concat: ["£", { $toString: "$pricing.costs.parking.amount" } ] },
                    landlordParking: {$concat: ["£", { $toString: "$pricing.costs.parking.landlordRate" } ] },
                    pet: {$concat: ["£", { $toString: "$pricing.costs.pet.amount" } ] },
                    landlordPet: {$concat: ["£", { $toString: "$pricing.costs.pet.landlordRate" } ] },
                    cleaning: {$concat: ["£", { $toString: "$pricing.costs.cleaning.amount" } ] },
                    landlordCleaning: {$concat: ["£", { $toString: "$pricing.costs.cleaning.landlordRate" } ] },
                    exitClean: {$concat: ["£", { $toString: "$pricing.costs.exitClean.amount" } ] },
                    landlordExitClean: {$concat: ["£", { $toString: "$pricing.costs.exitClean.landlordRate" } ] },
                    deposit: {$concat: ["£", { $toString: { $last: "$pricing.deposit.info.amount" } } ] },
                    petDeposit: {$concat: ["£", { $toString: { $first: "$pricing.deposit.info.amount" } } ] }
                }
            }

        ]).sort({ createdAt: 1 }).toArray();

        console.log(pricing)


        let worksheet;
        let sheetName = "bookings_formatted";
        let workbook;
        let filePath = 'C:\\Users\\kevro\\node_quickstart\\scripts\\bookings_formatted.xlsx';

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
