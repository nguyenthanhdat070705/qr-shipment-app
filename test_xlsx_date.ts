import * as xlsx from 'xlsx';
import fs from 'fs';

// Tạo 1 file excel test với 1 ô ngày tháng
const wb = xlsx.utils.book_new();
const ws = xlsx.utils.aoa_to_sheet([[new Date(2026, 4, 11)]]); // May 11, 2026
xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

const wb2 = xlsx.read(buffer, { type: 'buffer' });
const ws2 = wb2.Sheets["Sheet1"];

const out1 = xlsx.utils.sheet_to_json(ws2, { header: 1, raw: false });
console.log("Without dateNF:", out1[0]);

const out2 = xlsx.utils.sheet_to_json(ws2, { header: 1, raw: false, dateNF: 'DD/MM/YYYY' });
console.log("With dateNF:", out2[0]);
