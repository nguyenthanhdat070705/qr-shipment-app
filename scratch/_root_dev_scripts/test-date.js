const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/;
const match = "12/05/2026 08:00".match(regex);
console.log(match ? match.slice(1) : null);
