// Coordinate "a scacchiera" per le griglie dei giochi: colonna = lettera
// (A, B, ..., Z, AA, ...), riga = numero. Es. con 4 colonne: A1 A2 A3 A4 B1 ...
export function colName(col) {
  let n = col + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function boardLabel(index, cols) {
  const row = Math.floor(index / cols);
  const col = index % cols;
  return `${colName(col)}${row + 1}`;
}

// Numero di colonne per fare una griglia quadrata con N celle.
export function squareCols(total) {
  return Math.max(1, Math.ceil(Math.sqrt(total)));
}