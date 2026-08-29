import Game from "../models/Game.js";

const WIN_DEFS = [
  { type: "ambo", count: 2 },
  { type: "terno", count: 3 },
  { type: "quaterna", count: 4 },
  { type: "cinquina", count: 5 },
  { type: "tombola", count: 15 }
];

export async function startNewGame(name) {
  const game = new Game({
    status: "active",
    name: name || "Tombolata",
    extractedNumbers: [],
    currentNumber: null,
    extractionCount: 0,
    boards: [],
    wins: [],
    lastWin: null,
    wonTypes: []
  });
  await game.save();
  return game;
}

export async function setActiveGame(id) {
  await Game.updateMany({}, { $set: { status: "finished" } });
  const game = await Game.findByIdAndUpdate(
    id,
    { status: "active", finishedAt: null },
    { new: true }
  );
  if (!game) throw new Error("Partita non trovata");
  return game;
}

export async function getActiveGame() {
  return Game.findOne({ status: "active" }).sort({ startedAt: -1 });
}

export async function getAllGames(limit = 100) {
  return Game.find({}).sort({ startedAt: -1 }).limit(limit);
}

function allBoardNumbers(board) {
  return board.rows.flat();
}

// Verifica se una cartella fa una determinata vincita
export function checkBoardWin(board, extracted, type) {
  const def = WIN_DEFS.find((d) => d.type === type);
  if (!def) return null;

  const boardNumbers = allBoardNumbers(board);
  const extractedSet = new Set(extracted);

  if (type === "tombola") {
    return boardNumbers.every((n) => extractedSet.has(n));
  }

  // ambo, terno, quaterna, cinquina: devono comparire in una stessa RIGA
  for (const row of board.rows) {
    const matched = row.filter((n) => extractedSet.has(n));
    if (matched.length === def.count) return matched;
  }
  return null;
}

// Trova la vincita progressiva per una cartella dato il numero di estratti
// (la vincita più alta non ancora assegnata che la cartella ha raggiunto)
export function findHighestWin(board, extracted, alreadyWon) {
  const extractedSet = new Set(extracted);

  // Tombola: tutti i 15 numeri della cartella estratti
  if (!alreadyWon.includes("tombola")) {
    const all = allBoardNumbers(board);
    if (all.every((n) => extractedSet.has(n))) return "tombola";
  }

  // vincite di riga in ordine decrescente
  for (let i = WIN_DEFS.length - 2; i >= 0; i--) {
    const def = WIN_DEFS[i];
    if (alreadyWon.includes(def.type)) continue;
    if (checkBoardWin(board, extracted, def.type)) return def.type;
  }
  return null;
}

export async function addBoard(gameId, playerName, rows, boardNumber) {
  if (!rows || rows.length !== 3 || rows.some((r) => r.length !== 5)) {
    throw new Error("La cartella deve avere 3 righe da 5 numeri");
  }
  const flat = rows.flat();
  const unique = new Set(flat);
  if (unique.size !== flat.length) {
    throw new Error("I numeri della cartella non devono ripetersi");
  }
  if (flat.some((n) => n < 1 || n > 90)) {
    throw new Error("I numeri devono essere tra 1 e 90");
  }

  const game = await Game.findById(gameId);
  if (!game) throw new Error("Partita non trovata");

  game.boards.push({ playerName, rows, boardNumber: boardNumber ?? null });
  await game.save();
  return game;
}

export async function removeBoard(gameId, boardIndex) {
  const game = await Game.findById(gameId);
  if (!game) throw new Error("Partita non trovata");
  game.boards.splice(boardIndex, 1);
  await game.save();
  return game;
}

export async function extractNumber() {
  const game = await getActiveGame();
  if (!game) throw new Error("Nessuna partita attiva. Creane una prima di estrarre.");

  if (game.extractedNumbers.length >= 90) {
    throw new Error("Tutti i 90 numeri sono già stati estratti.");
  }

  const remaining = [];
  for (let i = 1; i <= 90; i++) {
    if (!game.extractedNumbers.includes(i)) remaining.push(i);
  }

  const index = Math.floor(Math.random() * remaining.length);
  const number = remaining[index];

  game.extractedNumbers.push(number);
  game.currentNumber = number;
  game.extractionCount = game.extractedNumbers.length;

  const newWins = [];

  game.boards.forEach((board, bi) => {
    const type = findHighestWin(board, game.extractedNumbers, game.wonTypes);
    if (type) {
      const numbers = checkBoardWin(board, game.extractedNumbers, type) || allBoardNumbers(board);
      const win = {
        type,
        playerName: board.playerName,
        boardIndex: bi,
        numbers,
        timestamp: new Date()
      };
      newWins.push(win);
      game.wins.push(win);
      game.lastWin = win;
      game.wonTypes.push(type);
    }
  });

  await game.save();
  return { game: game.toObject(), newWins };
}

export async function resetGame(id) {
  const game = await Game.findById(id);
  if (!game) throw new Error("Partita non trovata");

  game.status = "finished";
  game.finishedAt = new Date();
  await game.save();

  return game.toObject();
}

export async function deleteGame(id) {
  const game = await Game.findById(id);
  if (!game) throw new Error("Partita non trovata");

  await game.deleteOne();
  return { message: "Partita eliminata" };
}

export async function getGameState() {
  const game = await getActiveGame();
  if (!game) return null;
  return game.toObject();
}
