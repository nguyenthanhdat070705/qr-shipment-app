const fs = require('fs');
const path = require('path');
const apiFile = path.join(__dirname, '../src/app/api/products/route.ts');
let apiContent = fs.readFileSync(apiFile, 'utf8');

// Just replace gia_von anywhere with gia_ban_1 
apiContent = apiContent.replace(/gia_von/g, 'gia_ban_1');

fs.writeFileSync(apiFile, apiContent);
console.log('Fixed route.ts safely');
