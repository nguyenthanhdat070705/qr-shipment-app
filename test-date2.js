const trimmed = "12/05/2026 08:00";
const vnDateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
if (vnDateMatch) {
  const d = Number(vnDateMatch[1]);
  const m = Number(vnDateMatch[2]);
  const y = Number(vnDateMatch[3]);
  console.log(new Date(y, m - 1, d));
}
