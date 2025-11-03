// Invoking MongoDB and XLSX libraries
const { MongoClient } = require('mongodb');
const XLSX = require('xlsx');
const fs = require('fs');

// Haversine distance. Inputs are decimal degrees.
function haversine({ lat1, lon1, lat2, lon2 }) {
  const toRad = d => (d * Math.PI) / 180;

  const R_km = 6371.0088; // mean Earth radius
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  const c = 2 * Math.asin(Math.min(1, Math.sqrt(a)));
  const km = R_km * c;
  const mi = km * 0.621371;

  return { km, mi };
}

// Safely read GeoJSON-style [lon, lat] into numbers
function parseLonLat(arr) {
  if (!Array.isArray(arr) || arr.length < 2) return null;
  const lon = Number(arr[0]);
  const lat = Number(arr[1]);
  if (Number.isNaN(lon) || Number.isNaN(lat)) return null;
  return { lon, lat };
}

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

        // one row per offered-out chosenproperty
        {
            $lookup: {
            from: "chosenproperties",
            localField: "_id",
            foreignField: "enquiryId",
            as: "cpAll"
            }
        },

        { $unwind: { path: "$cpAll", preserveNullAndEmptyArrays: false } },

        // property for this CP
        {
            $lookup: {
            from: "properties",
            localField: "cpAll.propertyRef",
            foreignField: "_id",
            as: "prop"
            }
        },

        { $unwind: { path: "$prop", preserveNullAndEmptyArrays: true } },

        // ──────────────────────────────────────────────
        // Haversine 1/3: extract coords, guard, radians, deltas
        // ──────────────────────────────────────────────
        {
            $addFields: {
                enqLon:  { $convert: { input: { $arrayElemAt: ["$address.position.coordinates", 0] }, to: "double", onError: null, onNull: null } },
                enqLat:  { $convert: { input: { $arrayElemAt: ["$address.position.coordinates", 1] }, to: "double", onError: null, onNull: null } },
                propLon: { $convert: { input: { $arrayElemAt: ["$prop.address.position.coordinates", 0] }, to: "double", onError: null, onNull: null } },
                propLat: { $convert: { input: { $arrayElemAt: ["$prop.address.position.coordinates", 1] }, to: "double", onError: null, onNull: null } }
            }
        },

        {
            $addFields: {
                _haveCoords: {
                $and: [
                    { $ne: ["$enqLat", null] }, { $ne: ["$enqLon", null] },
                    { $ne: ["$propLat", null] }, { $ne: ["$propLon", null] }
                ]
                }
            }
        },

        {
            $addFields: {
                _lat1: { $cond: [ "$_haveCoords", { $degreesToRadians: "$enqLat" }, null ] },
                _lon1: { $cond: [ "$_haveCoords", { $degreesToRadians: "$enqLon" }, null ] },
                _lat2: { $cond: [ "$_haveCoords", { $degreesToRadians: "$propLat" }, null ] },
                _lon2: { $cond: [ "$_haveCoords", { $degreesToRadians: "$propLon" }, null ] }
            }
        },
        {
            $addFields: {
                _dLat: { $cond: [ "$_haveCoords", { $subtract: [ "$_lat2", "$_lat1" ] }, null ] },
                _dLon: { $cond: [ "$_haveCoords", { $subtract: [ "$_lon2", "$_lon1" ] }, null ] }
            }
        },

        // ──────────────────────────────────────────────
        // Haversine 2/3: compute sin(x/2) then square in a NEW stage
        // ──────────────────────────────────────────────
        {
            $addFields: {
                _sinHalf_dLat: { $cond: [ "$_haveCoords", { $sin: { $divide: [ "$_dLat", 2 ] } }, null ] },
                _sinHalf_dLon: { $cond: [ "$_haveCoords", { $sin: { $divide: [ "$_dLon", 2 ] } }, null ] }
            }
        },
        {
            $addFields: {
                _sin2_dLat: { $cond: [ "$_haveCoords", { $multiply: [ "$_sinHalf_dLat", "$_sinHalf_dLat" ] }, null ] },
                _sin2_dLon: { $cond: [ "$_haveCoords", { $multiply: [ "$_sinHalf_dLon", "$_sinHalf_dLon" ] }, null ] }
            }
        },

        // ──────────────────────────────────────────────
        // Haversine 3/3: a, clamp, distance, round
        // ──────────────────────────────────────────────
        // compute cosines and Haversine 'a', then clamp 'a' to [0,1]
        {
            $addFields: {
                _cos1: { $cond: [ "$_haveCoords", { $cos: "$_lat1" }, null ] },
                _cos2: { $cond: [ "$_haveCoords", { $cos: "$_lat2" }, null ] },
            }
        },
        // Haversine 3/3 (fixed): build 'a' in one stage…
        {
        $addFields: {
            _a: {
            $cond: [
                "$_haveCoords",
                {
                $add: [
                    "$_sin2_dLat",
                    { $multiply: [ "$_cos1", "$_cos2", "$_sin2_dLon" ] }
                ]
                },
                null
            ]
            }
        }
        },
        // …then clamp 'a' in the next stage…
        {
        $addFields: {
            _aClamped: {
            $cond: [
                "$_haveCoords",
                { $min: [ 1, { $max: [ 0, "$_a" ] } ] },
                null
            ]
            }
        }
        },
        // …then compute distance (2 * R * asin(sqrt(a)))
        {
        $addFields: {
            distanceKm: {
            $cond: [
                "$_haveCoords",
                { $multiply: [ 12742.0176, { $asin: { $sqrt: "$_aClamped" } } ] }, // 2 * 6371.0088
                null
            ]
            }
        }
        },
        // (your existing rounding stage can follow)
        {
        $addFields: {
            distanceKm: { $cond: [ { $ne: [ "$distanceKm", null ] }, { $round: [ "$distanceKm", 2 ] }, null ] },
            distanceMi: { $cond: [ { $ne: [ "$distanceKm", null ] }, { $round: [ { $multiply: [ "$distanceKm", 0.621371 ] }, 2 ] }, null ] }
        }
        },

        // agent/account (assumed 1:1)
        {
            $lookup: {
                from: "agents", 
                localField: "requestBy", 
                foreignField: "_id", 
                as: "agent" 
            }
        },

        { $unwind: { path: "$agent", preserveNullAndEmptyArrays: true } },

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
                from: "accounts",
                localField: "cpAll.createdBy",
                foreignField: "_id",
                as: "addedBy"
            }
        },

        { $lookup:
            {
                from: "accounts",
                localField: "approval.approvedBy",
                foreignField: "_id",
                as: "approvedBy"
            }
        },

        // BOOKING: only the booking for this enquiry whose property == selectedPropertyId (latest one)
        {
            $lookup: {
                from: "bookings",
                let: { enqId: "$_id", selCp: "$selectedPropertyId" },
                pipeline: [
                    { $match: { $expr: { $and: [
                    { $eq: ["$enquiry", "$$enqId"] },
                    { $eq: ["$property", "$$selCp"] }
                    ]}} },
                    { $sort: { createdAt: -1, _id: -1 } },
                    { $limit: 1 }
                ],
                as: "bookingOne"
            }
        },

        { $unwind: { path: "$bookingOne", preserveNullAndEmptyArrays: true } },

        {
            $lookup: {
                from: "landlords",
                localField: "prop.landlordRef",
                foreignField: "_id",
                as: "landlord"
            }
        },

        {$unwind: {path: "$landlord", preserveNullAndEmptyArrays: true} },
        // client for that one booking (if present)
        {
            $lookup: {
            from: "clients",
            localField: "bookingOne.client",
            foreignField: "_id",
            as: "client"
            }
        },

        { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },

        // booked cp id (prefer selectedPropertyId; fallback to bookingOne.property)
        {
            $addFields: {
            _bookedCpId: { $ifNull: ["$selectedPropertyId", "$bookingOne.property"] }
            }
        },

        // flag booked row: enquiry is "booked" AND this cp equals selectedPropertyId
        {
            $addFields: {
            isBooking: {
                $and: [
                { $in: ["$status", ["booked", "archived"]] },
                { $eq: ["$cpAll._id", "$_bookedCpId"] }
                // if types can vary, use:
                // { $eq: [ { $toString: "$cpAll._id" }, { $toString: "$_bookedCpId" } ] }
                ]
            }
            }
        },

        {
            $match: {
                "cpAll.status": {$ne: "rejected"}
            }
        },
        // output
        {
            $project: {
            _id: 0,
            createdDate: "$createdAt",
            ref: "$reference",
            agent: "$agent.fullName",
            assignedTo: {$first: "$acc.fullName"},
            addedBy: {$first: "$addedBy.fullName"},
            approvedBy: {$first: "$approvedBy.fullName"},
            client: "$client.fullName",
            checkIn: "$availability.checkIn",
            checkOut: "$availability.checkOut",
            duration: "$availability.expectedDuration",
            numOfPets: "$request.propertyPreferences.totalPets",
            numOfParking: "$request.propertyPreferences.parking.spaces",
            parkingType: "$prop.parkingType.value",
            avgAirbnbPrice: "$averageAirbnbPrice",       
            enquiryStatus: "$status",
            propName: "$prop.name",
            propPostcode: "$prop.address.zip",
            homePostcode: "$address.zip",
            distanceinMi: { $concat: [{ $toString: "$distanceMi" }, "mi"]},
            distanceinKm: { $concat: [{ $toString: "$distanceKm"}, "km"]},
            landlordName: "$landlord.name",
            landlordPhone: { $first: "$landlord.phoneNumbers.phone"},
            landlordEmail: { $first: "$landlord.emailAddresses.email"},
            cancellationType: "$prop.cancellationType",
            landlordRate: "$cpAll.costs.nightlyRate.amount",
            propMargin: { $concat: [{ $toString: "$cpAll.costs.margin.amount" }, "%"]},
            mhiyRate: {
                $concat: ["£", { 
                    $toString: { 
                        $multiply: [
                            "$cpAll.costs.nightlyRate.amount",
                            { $add: [1, { $divide: ["$cpAll.costs.margin.amount", 100] }] }
                        ]}
                    }]
            },
            icabRate: { $concat: 
                ["£", {
                    $toString: {
                        $round: [
                            {
                                $multiply: [
                                {
                                    $multiply: [
                                    "$cpAll.costs.nightlyRate.amount",
                                    { $add: [1, { $divide: ["$cpAll.costs.margin.amount", 100] }] }
                                        ]
                                },
                                1.15
                                    ]
                            },
                        2
                    ]}}
            ]}, 
            
            pet: { $concat: ["£", { $toString: "$cpAll.costs.petFee.amount" } ] } ,
            landlordPet: { $concat: ["£", { $toString: "$cpAll.costs.petFee.landlordShare" } ] },
            parking: { $concat: ["£", { $toString: "$cpAll.costs.parking.amount" } ] },
            landlordParking: { $concat: ["£", { $toString: "$cpAll.costs.parking.landlordShare" } ] },
            cleaning: { $concat: ["£", { $toString: "$cpAll.costs.cleaningFee.amount" } ] },
            landlordCleaning: { $concat: ["£", { $toString: "$cpAll.costs.cleaningFee.landlordShare" } ] },
            exitClean: { $concat: ["£", { $toString: "$cpAll.costs.exitClean.amount" } ] },
            landlordExitClean: { $concat: ["£", { $toString: "$cpAll.costs.exitClean.landlordShare" } ] },
            deposit: { $concat: ["£", { $toString: "$cpAll.costs.deposit.amount" } ] },
            petDeposit: { $concat: ["£", { $toString: "$cpAll.costs.petDeposit.amount" } ] },
            supply: "$supply",
            propertySynced: { $cond: [{ $ifNull: ["$landlord.name", false] }, true, false ] },
            accessibility: "$request.propertyPreferences.isAccessibilityRequired",
            isBooking: "$isBooking",
            isExtension: "$bookingOne.extension.isExtension",
            isDecant: "$isDecant"
            }
        },

        { $sort: { ref: 1, propName: 1 } }
      
        ]).toArray();

        console.log(enqs_vs_bookings)

        let worksheet;
        let sheetName = "offered out properties";
        let workbook;
        let filePath = 'C:\\Users\\kevro\\node_quickstart\\scripts\\Excel Files\\enqs_formatted.xlsx';

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
