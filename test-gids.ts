import fetch from 'node-fetch';

async function run() {
  const url = 'https://docs.google.com/spreadsheets/d/1NySorW3c07R_w7smqMkGbAja6I9rIVLT4s0OGZEOIOg/edit';
  const res = await fetch(url);
  const text = await res.text();
  
  // Extract sheets metadata from the inline JSON or regex
  const matches = [...text.matchAll(/"([a-zA-Z0-9_\sÀ-ỹ]+)",\d+,(\d{7,10})/g)];
  console.log("Found matches using basic regex:", matches.length);
  
  // Try another pattern commonly found in Google Sheets HTML
  const regex2 = /\["([^"]+)",(\d+)\]/g;
  let m;
  const sheets = [];
  while ((m = regex2.exec(text)) !== null) {
      // m[1] might be name, m[2] might be gid
      if (m[2].length >= 7) {
          sheets.push({ name: m[1], gid: m[2] });
      }
  }
  console.log(sheets);
}
run();
