import Minigame from "../models/Minigame.js";

// Durata della composizione iniziale a schermo (celle che si colorano):
// giochi "a cascata" (colorCount, numberHide) rivelano la griglia in questo
// tempo; il tempo di presentazione scelto dal regista parte alla FINE della
// composizione. Per giochi immediati (memory) non c'è offset.
export const REVEAL_DURATION_MS = 5000;

// Giochi in cui la presentazione parte dopo la composizione a cascata.
export const REVEAL_GAMES = new Set(["colorCount", "numberHide", "countShout", "missingNumber"]);

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

// Calcola e salva la soluzione del gioco corrente nel campo `solution` del doc.
// Va chiamata PRIMA di azzerare i campi di gioco (a fine partita o alla rivelazione),
// così la console di regia può mostrarla anche dopo la chiusura. Non lancia mai.
export function captureSolution(doc) {
  try {
    const type = doc.type;
    if (type === "colorCount") {
      const counts = {};
      for (const c of doc.colors || []) counts[c] = (counts[c] || 0) + 1;
      const entries = Object.entries(counts)
        .map(([color, count]) => ({ color, count }))
        .sort((a, b) => b.count - a.count);
      const top = entries[0] || null;
      doc.solution = {
        kind: "colorCount",
        color: top ? top.color : null,
        count: top ? top.count : 0,
        total: (doc.colors || []).length,
        counts: entries
      };
    } else if (type === "countShout") {
      const p = doc.payload || {};
      if (p.target != null && p.answer != null) {
        doc.solution = { kind: "countShout", target: p.target, answer: p.answer };
      }
    } else if (type === "missingNumber") {
      const p = doc.payload || {};
      if (p.missing != null) {
        doc.solution = { kind: "missingNumber", missing: p.missing, total: p.total };
      }
    } else if (type === "numberHide") {
      if (doc.hiddenNumber != null) {
        const cell = doc.hiddenIndex != null ? (doc.cells || [])[doc.hiddenIndex] : null;
        doc.solution = { kind: "numberHide", number: doc.hiddenNumber, cell, index: doc.hiddenIndex };
      }
    } else if (type === "anagram") {
      const p = doc.payload || {};
      if (p.word) doc.solution = { kind: "anagram", word: p.word, scrambled: p.scrambled };
    } else if (type === "intruder") {
      const p = doc.payload || {};
      const words = p.words || [];
      if (words.length) {
        doc.solution = { kind: "intruder", word: words[p.intruderIndex], theme: p.theme || "" };
      }
    } else if (type === "categories") {
      const p = doc.payload || {};
      if (p.word) doc.solution = { kind: "categories", word: p.word, category: p.category || "" };
    }
    if (doc.solution) doc.markModified("solution");
  } catch (error) {
    console.error("Calcolo soluzione minigioco fallito:", error.message);
  }
  return doc.solution;
}

// Stop generico: riporta il doc a idle azzerando i campi di gioco. Il `type`
// non viene azzerato: ai client serve per sapere quale overlay smontare
// durante l'effetto di uscita scenica. La `solution` viene invece conservata.
export async function stopMinigame(gameId) {
  const doc = await getMinigameForGame(gameId);
  captureSolution(doc);
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
  doc.revealedHints = 0;
  doc.payload = {};
  await doc.save();
  return doc;
}