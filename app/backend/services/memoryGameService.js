import {
  clamp,
  getMinigameForGame,
  GAME_SYMBOLS,
  presentationDurationMs
} from "./minigameService.js";

// Memory a coppie: una griglia rows x cols di carte con simboli natalizi in
// coppia. Il regista scopre le carte chiamando le coordinate; quando due carte
// scoperte non corrispondono vengono rigirate automaticamente (timer in
// routes/games.js), quando corrispondono restano scoperte ("found").
// Niente controllo vincite: la coppia giusta la dà il pubblico a voce.

export async function startMemoryGame(gameId, opts = {}) {
  const rows = clamp(opts.rows, 2, 6, 4);
  const cols = clamp(opts.cols, 2, 6, 3);
  if ((rows * cols) % 2 !== 0) throw new Error("La griglia deve avere un numero pari di carte");
  if (rows * cols > GAME_SYMBOLS.length * 2) {
    throw new Error(`Al massimo ${GAME_SYMBOLS.length} coppie (${GAME_SYMBOLS.length * 2} carte)`);
  }
  const pairs = (rows * cols) / 2;
  const picked = GAME_SYMBOLS.slice(0, pairs);
  const deck = [...picked, ...picked]
    .map((sym) => ({ sym, face: "down" }))
    .sort(() => Math.random() - 0.5);

  const presentSeconds = clamp(opts.presentSeconds, 5, 120, 15);
  const doc = await getMinigameForGame(gameId);
  doc.type = "memory";
  doc.status = "running";
  doc.rows = rows;
  doc.cols = cols;
  doc.cards = deck;
  doc.startedAt = new Date();
  doc.presentSeconds = presentSeconds;
  doc.revealed = false;
  doc.overlayActive = true;
  doc.expiresAt = new Date(Date.now() + presentationDurationMs(doc));
  await doc.save();
  return doc;
}

// Scopre la carta in posizione index. Se ci sono già due carte scoperte non
// trovate, restituisce la coppia da rigirare ("mismatch") chiamata dal route
// che programma il flip-back automatico.
export async function flipMemoryCard(gameId, index) {
  const doc = await getMinigameForGame(gameId);
  if (doc.status !== "running") throw new Error("Nessun gioco memory attivo");
  const i = parseInt(index, 10);
  if (!doc.cards[i] || doc.cards[i].face === "found" || doc.cards[i].face === "up") {
    return { doc, mismatch: null };
  }
  doc.cards[i].face = "up";
  const up = [];
  doc.cards.forEach((c, k) => {
    if (c.face === "up") up.push(k);
  });
  let mismatch = null;
  if (up.length === 2) {
    const [a, b] = up;
    if (doc.cards[a].sym === doc.cards[b].sym) {
      doc.cards[a].face = "found";
      doc.cards[b].face = "found";
      if (doc.cards.every((c) => c.face === "found")) doc.status = "done";
    } else {
      mismatch = [a, b];
    }
  }
  await doc.save();
  return { doc, mismatch };
}

// Rigira le carte della coppia non corrispondente (chiamato dal timer).
export async function flipBackMemoryPair(gameId, pair) {
  const doc = await getMinigameForGame(gameId);
  if (doc.status !== "running") return doc;
  (pair || []).forEach((k) => {
    if (doc.cards[k] && doc.cards[k].face === "up") doc.cards[k].face = "down";
  });
  await doc.save();
  return doc;
}