import {
  captureSolution,
  clamp,
  getMinigameForGame,
  presentationDurationMs
} from "./minigameService.js";
import { INTRUDER_ROUNDS } from "./wordGamesData.js";

// "Trova l'intruso": il tabellone mostra alcune parole, una non c'entra col
// tema; il pubblico trova quella sbagliata. Il regista rivela l'intruso e il
// tema. Niente controllo vincite: chi indovina per primo (a voce) vince.

function cleanWords(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((w) => (typeof w === "string" ? w.trim().toUpperCase() : ""))
    .filter(Boolean);
}

function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function startIntruderGame(gameId, opts = {}) {
  const presentSeconds = clamp(opts.presentSeconds, 5, 120, 20);

  let words;
  let intruderIndex;
  let theme;

  const custom = cleanWords(opts.words);
  const hasCustom = custom.length >= 3 && Number.isInteger(parseInt(opts.intruder, 10));
  if (hasCustom) {
    intruderIndex = clamp(opts.intruder, 0, custom.length - 1, 0);
    words = custom;
    theme = typeof opts.theme === "string" ? opts.theme.trim() : "";
  } else {
    const round = INTRUDER_ROUNDS[Math.floor(Math.random() * INTRUDER_ROUNDS.length)];
    words = shuffle([...round.members, round.intruder]);
    intruderIndex = words.indexOf(round.intruder);
    theme = round.theme;
  }

  const doc = await getMinigameForGame(gameId);
  doc.type = "intruder";
  doc.status = "running";
  doc.rows = 1;
  doc.cols = words.length;
  doc.cells = words;
  doc.startedAt = new Date();
  doc.presentSeconds = presentSeconds;
  doc.revealed = false;
  doc.revealedHints = 0;
  doc.solution = {};
  doc.payload = { words, intruderIndex, theme };
  doc.expiresAt = new Date(Date.now() + presentationDurationMs(doc));
  doc.overlayActive = true;
  await doc.save();
  return doc;
}

// Il regista rivela qual è l'intruso.
export async function revealIntruderGame(gameId) {
  const doc = await getMinigameForGame(gameId);
  if (doc.type !== "intruder" || doc.status !== "running") {
    throw new Error("Nessun gioco 'trova l'intruso' attivo");
  }
  doc.status = "done";
  doc.revealed = true;
  captureSolution(doc);
  await doc.save();
  return doc;
}
