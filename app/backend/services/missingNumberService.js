import {
  clamp,
  getMinigameForGame,
  presentationDurationMs
} from "./minigameService.js";

const MIN_RANGE = 4;
const MAX_RANGE = 36;

// "Che numero manca?": una griglia con i numeri da 1 a N in ordine sparso ma
// con UN numero mancante (quello posto nello spazio vuoto). Il pubblico grida
// quale numero manca; chi indovina per primo vince. Anche qui la risposta è
// unica e verificabile a vista, quindi facile da assegnare.
export async function startMissingNumberGame(gameId, opts = {}) {
  const rows = clamp(opts.rows, 2, 6, 3);
  const cols = clamp(opts.cols, 2, 6, 3);
  const presentSeconds = clamp(opts.presentSeconds, 5, 120, 12);
  const total = rows * cols;
  if (total < MIN_RANGE || total > MAX_RANGE) {
    throw new Error(`La griglia deve avere tra ${MIN_RANGE} e ${MAX_RANGE} celle`);
  }

  const missing = 1 + Math.floor(Math.random() * total);
  const shuffled = Array.from({ length: total }, (_, i) => i + 1)
    .filter((n) => n !== missing)
    .sort(() => Math.random() - 0.5);
  const gapIndex = Math.floor(Math.random() * total);
  const grid = [];
  let s = 0;
  for (let i = 0; i < total; i++) {
    if (i === gapIndex) grid.push("");
    else grid.push(String(shuffled[s++]));
  }

  const doc = await getMinigameForGame(gameId);
  doc.type = "missingNumber";
  doc.status = "running";
  doc.rows = rows;
  doc.cols = cols;
  doc.cells = grid;
  doc.startedAt = new Date();
  doc.presentSeconds = presentSeconds;
  doc.revealed = false;
  doc.payload = { missing, total };
  doc.expiresAt = new Date(Date.now() + presentationDurationMs(doc));
  doc.overlayActive = true;
  await doc.save();
  return doc;
}

// Il regista rivela il numero mancante.
export async function revealMissingNumberGame(gameId) {
  const doc = await getMinigameForGame(gameId);
  if (doc.type !== "missingNumber" || doc.status !== "running") {
    throw new Error("Nessun gioco 'che numero manca?' attivo");
  }
  doc.status = "done";
  doc.revealed = true;
  await doc.save();
  return doc;
}