function str(val) {
  if (val === undefined || val === null || val === '') return null;
  return String(val);
}

function mapContract(c) {
  return {
    getfly_contract_id: str(c.contract_id || c.order_id || c.id)
  };
}

const c = { order_id: "1832", order_code: "0966789639" };
console.log(mapContract(c));

const contracts = [c];
const rows = contracts.map(mapContract).filter(r => r.getfly_contract_id);
console.log(rows.length);
