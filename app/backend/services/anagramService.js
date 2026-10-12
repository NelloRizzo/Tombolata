import {
  captureSolution,
  clamp,
  getMinigameForGame,
  presentationDurationMs
} from "./minigameService.js";
import { ANAGRAM_WORDS } from "./wordGamesData.js";

// "Anagramma": il tabellone mostra una parola con le lettere mescolate e un
// eventuale indizio; il pubblico indovina la parola. Il regista rivela la
// soluzione. Niente controllo vincite: chi indovina per primo (a voce) vince.

function cleanWord(value) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toUpperCase()
    .split("")
    .filter((ch) => /[A-ZÀ-ÖØ-Ý]/.test(ch))
    .join("");
}

// Mescola le lettere; se per caso esce la parola identica ritenta (finché può).
function scramble(word) {
  const letters = word.split("");
  if (letters.length < 2) return word;
  if (new Set(letters).size === 1) return word;
  let guard = 0;
  let out = word;
  do {
    out = letters.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    guard++;
  } while (out.join("") === word && guard < 30);
  return out.join("");
}

export async function startAnagramGame(gameId, opts = {}) {
  const presentSeconds = clamp(opts.presentSeconds, 5, 120, 20);

  let word = cleanWord(opts.word);
  let hint = typeof opts.hint === "string" ? opts.hint.trim() : "";
  if (!word) {
    const pick = ANAGRAM_WORDS[Math.floor(Math.random() * ANAGRAM_WORDS.length)];
    word = pick.word;
    if (!hint) hint = pick.hint;
  } else if (!hint) {
    // Parola custom: se è nel mazzo, recupera l'indizio corrispondente.
    const known = ANAGRAM_WORDS.find((w) => w.word === word);
    if (known) hint = known.hint;
  }
  if (word.length < 3) throw new Error("La parola deve avere almeno 3 lettere");
  if (word.length > 16) word = word.slice(0, 16);

  const scrambled = scramble(word);
  const doc = await getMinigameForGame(gameId);
  doc.type = "anagram";
  doc.status = "running";
  doc.rows = 1;
  doc.cols = scrambled.length;
  doc.cells = scrambled.split("");
  doc.startedAt = new Date();
  doc.presentSeconds = presentSeconds;
  doc.revealed = false;
  doc.revealedHints = 0;
  doc.solution = {};
  doc.payload = { word, scrambled, hint };
  doc.expiresAt = new Date(Date.now() + presentationDurationMs(doc));
  doc.overlayActive = true;
  await doc.save();
  return doc;
}

// Il regista rivela la parola corretta.
export async function revealAnagramGame(gameId) {
  const doc = await getMinigameForGame(gameId);
  if (doc.type !== "anagram" || doc.status !== "running") {
    throw new Error("Nessun anagramma attivo");
  }
  doc.status = "done";
  doc.revealed = true;
  captureSolution(doc);
  await doc.save();
  return doc;
}
