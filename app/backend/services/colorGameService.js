import Minigame from "../models/Minigame.js";

const PALETTE = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6",
  "#8b5cf6", "#14b8a6", "#ec4899", "#f43f5e", "#64748b"
];

// Recupera (creandolo se manca) il doc del minigioco per la partita.
export async function getMinigameForGame(gameId) {
  const key = gameId ? `game:${gameId}` : "main";
  let doc = await Minigame.findOne({ key });
  if (!doc) {
    doc = new Minigame({ key, gameId: gameId || null });
    await doc.save();
  }
  return doc;
}

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

// Avvia il minigioco: genera il layout e imposta status running + overlay.
// presentSeconds = durata della presentazione a schermo (lato client gestisce
// l'uscita scenica; expiresAt serve ai client per sapere quando chiudere).
export async function startColorGame(gameId, opts = {}) {
  const totalSquares = Math.max(9, Math.min(parseInt(opts.totalSquares, 10) || 100, 900));
  const numColors = Math.max(2, Math.min(parseInt(opts.numColors, 10) || 2, 10));
  const presentSeconds = Math.max(5, Math.min(parseInt(opts.presentSeconds, 10) || 10, 120));
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
  doc.expiresAt = new Date(Date.now() + presentSeconds * 1000);
  doc.overlayActive = true;
  await doc.save();
  return doc;
}

// Il regista torna al tabellone (overlay off, gioco azzerato).
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
