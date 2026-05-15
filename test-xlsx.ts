import * as xlsx from 'xlsx';
import fetch from 'node-fetch';

async function run() {
  const url = 'https://docs.google.com/spreadsheets/d/1NySorW3c07R_w7smqMkGbAja6I9rIVLT4s0OGZEOIOg/export?format=xlsx';
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  console.log("Sheets:", workbook.SheetNames);
}
run();
