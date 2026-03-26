const TOKEN_INV = '201770191369c4adde97a6d512470927';
const TOKEN_WH  = '21629249469c4ae9a40117149012318';

async function test(path, token) {
  console.log('Thử API Endpoint:', path);
  try {
    const res = await fetch('https://cloud-cloud.1office.vn' + path + '?access_token=' + token + '&limit=1', {headers:{'User-Agent':'Mozilla/5.0'}});
    const text = await res.text();
    console.log('Nội dung:', text.slice(0, 100).replace(/\r?\n/g, ' '));
  } catch(e) { console.error('Lỗi', e.message); }
}

async function run() {
  await test('/api/warehouse/inventory/gets', TOKEN_INV);
  await test('/api/warehouse/gets', TOKEN_WH);
}
run();
