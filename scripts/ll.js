// Invoking libraries
const { MongoClient } = require('mongodb');
const XLSX = require('xlsx');
const fs = require('fs');

const start = new Date(Date.UTC(2025, 10, 1));

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

        const supplier = await landlords.aggregate([

            {
                $match : {
                    "isDeleted" : false,
                    createdAt: { $gte: start }
                }
            },

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

            {
                $project: {
                    landlord: "$name",
                    email1: { $first: "$emailAddresses.email"} ,
                    phone1: { $first : "$phoneNumbers.phone" },
                    phone2: { $ifNull: [ {$arrayElemAt: ["$phoneNumbers.phone", 1] } , "N/A" ]},
                    _id: { $toString: "$_id" },
                    property: "$prop.name",
                    link: {$concat: [ "https://www.myhomeisyours.co.uk/dashboard/properties/list/", { $toString: "$prop._id" }]}
                }
            },

            {
                $sort : {_id : 1}
            }

        ]).toArray();


        console.log(supplier)

        let worksheet;
        let sheetName = "landlords";
        let workbook;
        let filePath = 'C:\\Users\\kevro\\Documents\\\Excel Files\\ll.xlsx';
        
        // If file exists, modify it. Otherwise, create new file.
        if (fs.existsSync(filePath)) {
        workbook = XLSX.readFile(filePath);
        } else {
        workbook = XLSX.utils.book_new();
        console.log(`New file created at: ${filePath}.`);
        }

        // If sheet exists, delete old one and 'overwrite' with new one.
        if (workbook.SheetNames.includes(sheetName)) {
        delete workbook.Sheets[sheetName];
        workbook.SheetNames = workbook.SheetNames.filter(name => name !== sheetName);
        console.log(`Overwriting ${sheetName} sheet in ${filePath}`);
        }

        /**
         * Pivot supplier rows (one per property) → one row per landlord.
         * RETURNS:
         *  - rows: array of objects to write to Excel (NO property_* columns)
         *  - labels: array of arrays with property names per landlord row (used for hyperlink text)
         * Notes:
         *  - preserves landlord encounter order from `supplier`
         */
        /**
         * Pivot to one row per landlord ID (no property_* columns returned).
         * Returns { rows, labels } where:
         *  - rows: objects to write to Excel (landlord, id, phone_1, phone_2, link_1..N)
         *  - labels: parallel array of arrays with property names for each row (for hyperlink labels)
         */
        function pivotById(data) {
        const byId = new Map(); // id -> { landlord, phone1, phone2, props: [{name, link}] }
        const order = [];       // preserve first-seen order (we’ll sort after building)

        for (const row of data) {
            const id = row.id ?? row._id;
            if (id == null) continue; // if you truly have missing ids, decide what to do here

            if (!byId.has(id)) {
            byId.set(id, {
                landlord: row.landlord ?? "",
                email1: row.email1 ? String(row.email1).trim() : null,
                phone1: row.phone1 ? String(row.phone1).trim() : null,
                phone2: row.phone2 ? String(row.phone2).trim() : null,
                props: []
            });
            order.push(id);
            } else {
            const g = byId.get(id);
            // keep the first non-empty landlord name (or replace if you prefer latest)
            if (!g.landlord && row.landlord) g.landlord = row.landlord;
            if (!g.email1 && row.email1) g.email1 = String(row.email1).trim();
            if (!g.phone1 && row.phone1) g.phone1 = String(row.phone1).trim();
            if (!g.phone2 && row.phone2) g.phone2 = String(row.phone2).trim();
            }

            byId.get(id).props.push({
            name: row.property ?? "",
            link: row.link ?? ""
            });
        }

        // build array of {row, labels} to allow sorting while keeping labels aligned
        const combined = order.map((id) => {
            const g = byId.get(id);
            const row = { id, landlord: g.landlord };
            if (g.email1) row.email_1 = g.email1;
            if (g.phone1) row.phone_1 = g.phone1;
            if (g.phone2) row.phone_2 = g.phone2;

            g.props.forEach((p, i) => {
                const n = i + 1;
                row[`link_${n}`] = p.link; // will be turned into a hyperlink with label below
            });

            const labels = g.props.map(p => p.name ?? "");
            return { row, labels };
        });

        // sort by id (numeric if possible, else string)
        const asNumber = v => {
            const n = Number(v);
            return Number.isFinite(n) && String(v).trim() !== "" && /^[+-]?\d+(\.\d+)?$/.test(String(v)) ? n : null;
        };
        combined.sort((a, b) => {
            const an = asNumber(a.row.id), bn = asNumber(b.row.id);
            if (an != null && bn != null) return an - bn;       // numeric sort
            return String(a.row.id).localeCompare(String(b.row.id), undefined, { numeric: true });
        });

        // split back out
        return {
            rows: combined.map(x => x.row),
            labels: combined.map(x => x.labels)
        };
        }

        const { rows: pivotedRows, labels: propertyLabels } = pivotById(supplier);

        // Build worksheet (no property_* columns)
        worksheet = XLSX.utils.json_to_sheet(pivotedRows);

        /**
         * Apply hyperlinks to a given link_N column, using label from propertyLabels[rowIndex][N-1].
         */
        function hyperlinkColumnWithLabels(ws, urlHeader, labelGetter, fallbackText = "Open site") {
        if (!ws['!ref']) return;
        const range = XLSX.utils.decode_range(ws['!ref']);

        // find the URL column by header name in row 1
        let urlCol = -1;
        for (let c = range.s.c; c <= range.e.c; c++) {
            const hdrCell = ws[XLSX.utils.encode_cell({ c, r: range.s.r })];
            if (hdrCell && String(hdrCell.v).trim() === urlHeader) { urlCol = c; break; }
        }
        if (urlCol === -1) return;

        // set hyperlink and visible text
        for (let r = range.s.r + 1; r <= range.e.r; r++) {
            const rowIndex = r - (range.s.r + 1);
            const addr = XLSX.utils.encode_cell({ c: urlCol, r });
            const cell = ws[addr];
            if (!cell) continue;

            const url = String(cell.v ?? "").trim();
            if (!url) continue;

            const label = labelGetter(rowIndex);
            const displayText = (label && String(label).trim() !== "") ? String(label) : (fallbackText || url);

            cell.f = `=HYPERLINK("${url}", "${displayText.replace(/"/g, '""')}")`;
        }
        }

        // Apply hyperlinks for all link_N columns using labels from propertyLabels
        const maxLinks = Math.max(0, ...propertyLabels.map(arr => arr.length));
        for (let i = 1; i <= maxLinks; i++) {
        hyperlinkColumnWithLabels(
            worksheet,
            `link_${i}`,
            (rowIndex) => propertyLabels[rowIndex]?.[i - 1] ?? ""
        );
        }


        // Write sheet & file (no property_* columns exist, so nothing to hide/remove)
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