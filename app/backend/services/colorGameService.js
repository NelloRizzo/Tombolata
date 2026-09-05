import {
  clamp,
  getMinigameForGame,
  presentationDurationMs,
  REVEAL_DURATION_MS
} from "./minigameService.js";

const PALETTE = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6",
  "#8b5cf6", "#14b8a6", "#ec4899", "#f43f5e", "#64748b"
];

// Re-export per compatibilità con i moduli che importano da qui.
export { getMinigameForGame, presentationDurationMs, REVEAL_DURATION_MS };

// Sceglie una palette di N colori distinti e genera colori casuali per ogni
// quadrato, così ogni colore compare circa lo stesso numero di volte.
function generateLayout(totalSquares, numColors) {
  const n = Math.max(2, Math.min(numColors, PALETTE.length));
  const palette = PALETTE.slice(0, n);
  const colors = [];
  for (let i = 0; i < totalSquares; i++) {
    colors.push(palette[Math.floor(Math.random() * palette.length)]);
  }
  return { palette, colors };
}

// Avvia il minigioco "colorCount": genera il layout e imposta running+overlay.
// La presentazione parte alla FINE della composizione (REVEAL_DURATION_MS);
// il backend chiude da solo allo scadere (timer in routes/games.js).
export async function startColorGame(gameId, opts = {}) {
  const totalSquares = clamp(opts.totalSquares, 9, 900, 100);
  const numColors = clamp(opts.numColors, 2, 10, 3);
  const presentSeconds = clamp(opts.presentSeconds, 5, 120, 10);
  const doc = await getMinigameForGame(gameId);
  const { palette, colors } = generateLayout(totalSquares, numColors);
  doc.type = "colorCount";
  doc.status = "running";
  doc.totalSquares = totalSquares;
  doc.numColors = numColors;
  doc.palette = palette;
  doc.colors = colors;
  doc.startedAt = new Date();
  doc.presentSeconds = presentSeconds;
  doc.revealed = false;
  doc.payload = {};
  doc.expiresAt = new Date(Date.now() + presentationDurationMs(doc));
  doc.overlayActive = true;
  await doc.save();
  return doc;
}

// Il regista torna al tabellone (chiude il gioco).
export async function stopColorGame(gameId) {
  const doc = await getMinigameForGame(gameId);
  doc.status = "idle";
  doc.overlayActive = false;
  doc.colors = [];
  doc.palette = [];
  doc.totalSquares = 0;
  doc.numColors = 0;
  doc.presentSeconds = 0;
  doc.expiresAt = null;
  await doc.save();
  return doc;
}

export async function getColorGameState(gameId) {
  return getMinigameForGame(gameId);
}