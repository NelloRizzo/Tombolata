export const TOTAL_NUMBERS = 90;
export const ROWS_PER_GROUP = 10;

export function getGroupTitle(num) {
  const group = Math.floor((num - 1) / 10); // 0-8
  const start = group * 10 + 1;
  const end = start + 9;
  return `${start} - ${end}`;
}

export function formatTimestamp(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export function totalBoards(game) {
  return game?.boards?.length || 0;
}

// Ordine sequenziale delle vincite di riga (piu' piccolo = si verifica prima).
export const WIN_ORDER = ["ambo", "terno", "quaterna", "cinquina", "tombola"];

// Numero di numeri consecutivi per vincita di riga.
const WIN_COUNT = { ambo: 2, terno: 3, quaterna: 4, cinquina: 5 };

// Etichetta strutturata di una cartella ("titolo · S.X · n.Y").
export function boardLabel(board, fallback = "Cartella") {
  const parts = [];
  if (board.title) parts.push(board.title);
  if (board.setNumber != null) parts.push(`S.${board.setNumber}`);
  if (board.cardNumber != null) parts.push(`n.${board.cardNumber}`);
  if (board.playerName) parts.push(board.playerName);
  return parts.join(" · ") || fallback;
}

// Stato di vincita di una cartella sui numeri estratti (regole tombola: vincite
// di riga ambo…cinquina e tombola = tutti i 15 numeri).
// Ritorna { type, winning: Set<numeri che formano la vincita>, matched, total }.
export function boardWinState(board, extracted) {
  const extractedSet = new Set(extracted || []);
  const all = (board.rows || []).flat().filter((n) => n != null);
  const matched = all.filter((n) => extractedSet.has(n));
  if (all.length > 0 && all.every((n) => extractedSet.has(n))) {
    return { type: "tombola", winning: new Set(all), matched: matched.length, total: all.length };
  }
  for (let rank = WIN_ORDER.length - 2; rank >= 0; rank -= 1) {
    const type = WIN_ORDER[rank];
    const count = WIN_COUNT[type];
    for (const row of board.rows || []) {
      const hit = row.filter((n) => n != null && extractedSet.has(n));
      if (hit.length >= count) {
        return { type, winning: new Set(hit), matched: matched.length, total: all.length };
      }
    }
  }
  return { type: null, winning: new Set(), matched: matched.length, total: all.length };
}
