// Invoking libraries
const { MongoClient } = require('mongodb');
const XLSX = require('xlsx');
const fs = require('fs');

// Safe version of coalesceNotBlank
const coalesceNotBlank = (fields, fallback) => ({
  $let: {
    vars: {
      valid: {
        $first: {
          $filter: {
            input: fields,
            as: "val",
            cond: {
              $and: [
                { $ne: ["$$val", null] },
                { $ne: [
                  {
                    $trim: {
                      input: {
                        $toString: {
                          $cond: [
                            { $isArray: "$$val" },
                            { $arrayElemAt: ["$$val", 0] },
                            "$$val"
                          ]
                        }
                      }
                    }
                  },
                  ""
                ]}
              ]
            }
          }
        }
      }
    },
    in: {
      $ifNull: [
        {
          $trim: {
            input: {
              $toString: {
                $cond: [
                  { $isArray: "$$valid" },
                  { $arrayElemAt: ["$$valid", 0] },
                  "$$valid"
                ]
              }
            }
          }
        },
        fallback
      ]
    }
  }
});


// url for connecting to cluster.
const url = "mongodb+srv://kevronthe5th:PGY7fZFoSWqaYUif@axi-digital.oleo1.mongodb.net/myhomeisyours-live?retryWrites=true&w=majority&appName=Axi-Digital"

// Connecting to mhiy DB (axi-digital.oleo1.mongodb.net)
const client  = new MongoClient(url);

async function run() {
    try {
        await client.connect();
        console.log("Successfully connected to Atlas!\n");
        
        const database = client.db('myhomeisyours-live');
        const properties = database.collection('properties');

        const postcodeList = [
            "GU9", "GU10", "GU11", "GU12"
        ];

        const home = await properties.aggregate([

{
                $lookup : {
                    from : "landlords",
                    localField : "landlordRef.0",
                    foreignField : "_id",
                    as : "ll"
                }
            },
            { 
                $unwind: {
                    path: "$landlords",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    postcodePrefix: {
                        $switch: {
                            branches: postcodeList.map(prefix => ({
                                case: { 
                                    $regexMatch: { 
                                        input: "$address.zip", 
                                        regex: new RegExp(`^${prefix}\\s`, "i")  // Match prefix followed by space
                                    } 
                                },
                                then: prefix
                            })),
                            default: null
                        }
                    }
                }
            },
            {
                $match: {
                    postcodePrefix: { $ne: null } // Only include properties with matching postcodes
                }
            },
            {
            $project: {
            postcode: "$address.zip",
            fullAddress: "$address.freeFormAddress",
            bedrooms: "$numberOfBedrooms",
            beds: {
                $subtract: [
                "$numberOfBeds",
                {
                    $add: [
                    {
                        $sum: {
                        $map: {
                            input: {
                            $filter: {
                                input: "$livingRooms.beds",
                                cond: { $eq: ["$$this.type", "sofa"] }
                            }
                            },
                            as: "sofaBed",
                            in: "$$sofaBed.value"
                        }
                        }
                    },
                    {
                        $sum: {
                        $map: {
                            input: {
                            $filter: {
                                input: "$bedrooms.beds",
                                cond: { $eq: ["$$this.type", "cots"] }
                            }
                            },
                            as: "cot",
                            in: "$$cot.value"
                        }
                        }
                    }
                    ]
                }
                ]
            },
            bathrooms: "$numberOfBathrooms",
            parking: "$parkingType.value",
            pets: "$petsPolicy.value",
            garden: "$summary.outside.garden.isAvailable",
            balcony: "$summary.outside.balcony.isAvailable",
            patio: "$summary.outside.patio.isAvailable",
            bbq: "$summary.outside.bbq.isAvailable",

            // ✅ Use coalesceNotBlank for fallback values
            landlordName: coalesceNotBlank(["$ll.name", "$landlord.name"], "Unknown Landlord"),
            landlordEmail: coalesceNotBlank(
                [{ $first: "$ll.emailAddresses.email" }, "$landlord.email"],
                "N/A"
            ),
            landlordPhone: coalesceNotBlank(
                [{ $first: "$ll.phoneNumbers.phone" }, "$landlord.phone"],
                "N/A"
            ),

            liveLink: {
                $concat: [
                "https://www.myhomeisyours.co.uk/public/property/",
                { $toString: "$_id" }
                ]
            },
            liveExtLink: "$livePropertyLink"
            }
        },
            { $project : {_id: 0} },
            { $sort : {postcode: 1} },

        ]).toArray();


        console.log(home)

        let worksheet;
        let sheetName = "props manchester";
        let workbook;
        let filePath = 'C:\\Users\\kevro\\Documents\\Excel Files\\property_list_guildford.xlsx';
        
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
        
        worksheet = XLSX.utils.json_to_sheet(home);
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