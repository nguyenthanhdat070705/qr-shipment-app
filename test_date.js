const formatDateDisplay = (dateStr) => {
    if (!dateStr || dateStr === '—' || dateStr === '-') return '—';
    const trimmed = dateStr.trim();
    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (match) {
      let d = match[1].padStart(2, '0');
      let m = match[2].padStart(2, '0');
      let y = match[3];
      
      if (y.length === 2) {
        // xlsx exports M/D/YY by default
        d = match[2].padStart(2, '0');
        m = match[1].padStart(2, '0');
        y = `20${y}`;
      }
      return `${d}/${m}/${y}`;
    }
    return trimmed;
  };
console.log("12/05/2026 ->", formatDateDisplay("12/05/2026"));
console.log("05/12/2026 ->", formatDateDisplay("05/12/2026"));
