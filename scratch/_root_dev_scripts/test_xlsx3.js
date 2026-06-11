const xlsx = require('xlsx');
const wb = xlsx.utils.book_new();
const ws = xlsx.utils.aoa_to_sheet([[new Date(2026, 4, 12)]]); // May 12, 2026
xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
const wb2 = xlsx.read(buffer, { type: 'buffer' });
const ws2 = wb2.Sheets["Sheet1"];

console.log("raw:true ->", xlsx.utils.sheet_to_json(ws2, { header: 1, raw: true })[0][0]);
