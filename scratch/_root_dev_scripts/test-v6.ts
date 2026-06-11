async function main() {
  const res = await fetch('https://blackstonesdvtl.getflycrm.com/api/v6.1/sale_contract', {
    headers: {
      'X-API-KEY': 'UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1',
      'Content-Type': 'application/json',
    }
  });
  console.log(res.status);
  const text = await res.text();
  console.log(text.substring(0, 500));
}
main();
