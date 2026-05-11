const https = require('https');
https.get('https://blackstonesdvtl.getflycrm.com', (res) => {
  console.log('statusCode:', res.statusCode);
}).on('error', (e) => {
  console.error(e);
});
fetch("http://localhost:3000/api/sync-getfly-contracts", {method: "POST"}).then(r=>r.text()).then(console.log).catch(console.error);
