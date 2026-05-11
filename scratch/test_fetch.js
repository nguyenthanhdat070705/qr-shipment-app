async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/goods-issue/history');
    const json = await res.json();
    console.log(JSON.stringify(json.data.slice(0, 2), null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
