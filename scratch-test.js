

async function test() {
  const token = '84869196569c35038d0514699999665';
  
  const urls = [
    'https://cloud-cloud.1office.vn/api/warehouse/product/gets',
    'https://cloud-cloud.1office.vn/api/crm/customer/gets',
    'https://cloud-cloud.1office.vn/api/crm/lead/gets',
    'https://cloud-cloud.1office.vn/api/task/gets'
  ];

  for (const endpoint of urls) {
    const res = await fetch(`${endpoint}?access_token=${token}&limit=10&page=1`);
    const data = await res.json();
    console.log(endpoint, data.error, data.message, data.data ? data.data.length : 'no data');
  }
}

test();
