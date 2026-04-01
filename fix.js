const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}
const files = walk('./src').filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('function getCoffinImage(productCode: string): string {') && !content.includes('2AQ0106')) {
    content = content.replace('function getCoffinImage(productCode: string): string {', `function getCoffinImage(productCode: string): string {\n  if (productCode === '2AQ0106') return '/coffin-3.png';`);
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});
