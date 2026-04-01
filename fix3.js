const fs = require('fs');
const files = [
  'src/app/api/goods-issue/scan/route.ts',
  'src/app/inventory/page.tsx',
  'src/app/inventory/[code]/page.tsx',
  'src/components/ProductDetailCard.tsx'
];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('function getCoffinImage(productCode: string): string {', "function getCoffinImage(productCode: string): string {\\n  if (productCode === '2AQ0106') return '/coffin-3.png';");
  fs.writeFileSync(file, content);
  console.log('Fixed', file);
});
