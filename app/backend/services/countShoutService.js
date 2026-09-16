import {
  clamp,
  getMinigameForGame,
  presentationDurationMs
} from "./minigameService.js";

const SYMBOLS = ["🎄", "🎅", "⛄", "🎁", "⭐", "🕯️", "❄️", "🎀", "🔔", "🍬", "🥂", "🌸"];

// "Conta e grida": una griglia con molti simboli natalizi; ci si chiede quanti
// ce ne sono di uno in particolare (es. "quante stelle?"). Chi grida per primo
// la cifra giusta vince. Il vincitore è facile da assegnare: la risposta è
// unica e verificabile a colpo d'occhio (alla fine il tabellone la mostra).
export async function startCountShoutGame(gameId, opts = {}) {
  const rows = clamp(opts.rows, 2, 8, 4);
  const cols = clamp(opts.cols, 2, 8, 5);
  const presentSeconds = clamp(opts.presentSeconds, 5, 120, 12);

  const num = clamp(opts.numSymbols, 2, SYMBOLS.length, 4);
  const target = opts.target && SYMBOLS.includes(opts.target)
    ? opts.target
    : SYMBOLS.slice(0, num)[Math.floor(Math.random() * num)];
  const others = SYMBOLS.filter((s) => s !== target).slice(0, num - 1);
  const available = [...others, target];

  const grid = [];
  for (let i = 0; i < rows * cols; i++) {
    grid.push(available[Math.floor(Math.random() * available.length)]);
  }
  if (!grid.includes(target)) {
    grid[Math.floor(Math.random() * grid.length)] = target;
  }
  const answer = grid.filter((s) => s === target).length;

  const doc = await getMinigameForGame(gameId);
  doc.type = "countShout";
  doc.status = "running";
  doc.rows = rows;
  doc.cols = cols;
  doc.cells = grid;
  doc.startedAt = new Date();
  doc.presentSeconds = presentSeconds;
  doc.revealed = false;
  doc.payload = { target, answer, symbols: available };
  doc.expiresAt = new Date(Date.now() + presentationDurationMs(doc));
  doc.overlayActive = true;
  await doc.save();
  return doc;
}

// Il regista rivela la risposta esatta (mostra il conteggio sul tabellone).
export async function revealCountShoutGame(gameId) {
  const doc = await getMinigameForGame(gameId);
  if (doc.type !== "countShout" || doc.status !== "running") {
    throw new Error("Nessun gioco 'conta e grida' attivo");
  }
  doc.status = "done";
  doc.revealed = true;
  await doc.save();
  return doc;
}