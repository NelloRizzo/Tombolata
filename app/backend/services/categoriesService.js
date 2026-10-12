import {
  captureSolution,
  clamp,
  getMinigameForGame,
  presentationDurationMs
} from "./minigameService.js";
import { CATEGORY_CARDS } from "./wordGamesData.js";

// "Parola a categorie" (indovina la parola): il tabellone mostra una categoria
// e, uno alla volta, alcuni indizi sempre più espliciti; il pubblico indovina
// la parola segreta. Il regista svela gli indizi e infine rivela la parola.
// Niente controllo vincite: chi indovina (a voce) vince.

function cleanHints(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((h) => (typeof h === "string" ? h.trim() : ""))
    .filter(Boolean)
    .slice(0, 6);
}

export async function startCategoriesGame(gameId, opts = {}) {
  const presentSeconds = clamp(opts.presentSeconds, 5, 120, 30);

  let category = typeof opts.category === "string" ? opts.category.trim() : "";
  let word = typeof opts.word === "string" ? opts.word.trim().toUpperCase() : "";
  let hints = cleanHints(opts.hints);

  if (!word) {
    const card = CATEGORY_CARDS[Math.floor(Math.random() * CATEGORY_CARDS.length)];
    word = card.word;
    if (!category) category = card.category;
    if (hints.length === 0) hints = card.hints;
  }

  const doc = await getMinigameForGame(gameId);
  doc.type = "categories";
  doc.status = "running";
  doc.rows = 1;
  doc.cols = 0;
  doc.cells = [];
  doc.startedAt = new Date();
  doc.presentSeconds = presentSeconds;
  doc.revealed = false;
  doc.revealedHints = 0;
  doc.solution = {};
  doc.payload = { category, word, hints };
  doc.expiresAt = new Date(Date.now() + presentationDurationMs(doc));
  doc.overlayActive = true;
  await doc.save();
  return doc;
}

// Il regista svela il prossimo indizio (fino a esaurirli).
export async function nextHintCategoriesGame(gameId) {
  const doc = await getMinigameForGame(gameId);
  if (doc.type !== "categories" || doc.status !== "running") {
    throw new Error("Nessun gioco 'parola a categorie' attivo");
  }
  const total = (doc.payload?.hints || []).length;
  if (doc.revealedHints < total) {
    doc.revealedHints += 1;
    await doc.save();
  }
  return doc;
}

// Il regista rivela la parola segreta.
export async function revealCategoriesGame(gameId) {
  const doc = await getMinigameForGame(gameId);
  if (doc.type !== "categories" || doc.status !== "running") {
    throw new Error("Nessun gioco 'parola a categorie' attivo");
  }
  doc.status = "done";
  doc.revealed = true;
  captureSolution(doc);
  await doc.save();
  return doc;
}
