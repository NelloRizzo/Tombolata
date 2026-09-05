import Minigame from "../models/Minigame.js";

// Durata della composizione iniziale a schermo (celle che si colorano):
// giochi "a cascata" (colorCount, numberHide) rivelano la griglia in questo
// tempo; il tempo di presentazione scelto dal regista parte alla FINE della
// composizione. Per giochi immediati (memory) non c'è offset.
export const REVEAL_DURATION_MS = 5000;

// Giochi in cui la presentazione parte dopo la composizione a cascata.
export const REVEAL_GAMES = new Set(["colorCount", "numberHide"]);

// Millisecondi totali a schermo per il timer di auto-chiusura.
export function presentationDurationMs(doc) {
  return (doc.presentSeconds || 0) * 1000 + (REVEAL_GAMES.has(doc.type) ? REVEAL_DURATION_MS : 0);
}

// Simboli natalizi usati dal memory (pool di coppie).
export const GAME_SYMBOLS = [
  "🎄", "🎅", "⛄", "🎁", "⭐", "🕯️",
  "❄️", "🎀", "🔔", "🍬", "🥂", "🌸"
];

// Etichette "scacchiera" per una griglia: colonna=lettera (A,B,...), riga=numero.
// Es. con 4 colonne le celle sono A1 A2 ... D1 D2 (leggendo per righe).
export function buildCells(total, cols) {
  const cells = [];
  for (let i = 0; i < total; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    let name = "";
    let n = col + 1;
    while (n > 0) {
      const r = (n - 1) % 26;
      name = String.fromCharCode(65 + r) + name;
      n = Math.floor((n - 1) / 26);
    }
    cells.push(`${name}${row + 1}`);
  }
  return cells;
}

export const clamp = (v, min, max, fallback) => {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(n, max));
};

// Recupera (creandolo se manca) il doc del minigioco per la partita.
export async function getMinigameForGame(gameId = null) {
  const key = gameId ? `game:${gameId}` : "main";
  let doc = await Minigame.findOne({ key });
  if (!doc) {
    doc = new Minigame({ key, gameId: gameId || null });
    await doc.save();
  }
  return doc;
}

export async function getMinigameState(gameId) {
  return getMinigameForGame(gameId);
}

// Stop generico: riporta il doc a idle azzerando i campi di gioco. Il `type`
// non viene azzerato: ai client serve per sapere quale overlay smontare
// durante l'effetto di uscita scenica.
export async function stopMinigame(gameId) {
  const doc = await getMinigameForGame(gameId);
  doc.status = "idle";
  doc.overlayActive = false;
  doc.startedAt = null;
  doc.presentSeconds = 0;
  doc.expiresAt = null;
  doc.totalSquares = 0;
  doc.numColors = 0;
  doc.palette = [];
  doc.colors = [];
  doc.rows = 0;
  doc.cols = 0;
  doc.cards = [];
  doc.cells = [];
  doc.hiddenIndex = null;
  doc.hiddenNumber = null;
  doc.revealed = false;
  doc.payload = {};
  await doc.save();
  return doc;
}