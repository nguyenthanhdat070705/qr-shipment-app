const fs = require('fs');
const path = require('path');
const apiFile = path.join(__dirname, '../src/app/api/products/route.ts');
let apiContent = fs.readFileSync(apiFile, 'utf8');

apiContent = apiContent.replace('gia_ban: gia_ban || 0,\n    gia_ban_1: body.gia_ban_1 || 0,\n    gia_von: gia_von || 0,', 'gia_ban: gia_ban || 0,\n    gia_ban_1: body.gia_ban_1 || 0,');

fs.writeFileSync(apiFile, apiContent);
console.log('Fixed route.ts');
