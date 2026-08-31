import Game from "../models/Game.js";
import Card from "../models/Card.js";
import { DEFAULT_ACTORS } from "./defaultCast.js";
import { cardLabel } from "./tombolataCardsXml.js";

const WIN_DEFS = [
  { type: "ambo", count: 2 },
  { type: "terno", count: 3 },
  { type: "quaterna", count: 4 },
  { type: "cinquina", count: 5 },
  { type: "tombola", count: 15 }
];

export async function startNewGame({ name, description, scheduledAt } = {}) {
  const scheduled = Boolean(scheduledAt);
  const game = new Game({
    status: scheduled ? "scheduled" : "active",
    name: name || "Tombolata",
    description: description || "",
    scheduledAt: scheduled ? new Date(scheduledAt) : null,
    actors: DEFAULT_ACTORS.map((a) => ({ ...a })),
    assignments: [],
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
  await Game.updateMany({ status: "active" }, { $set: { status: "finished", finishedAt: new Date() } });
  const game = await Game.findByIdAndUpdate(
    id,
    { status: "active", finishedAt: null },
    { new: true }
  );
  if (!game) throw new Error("Partita non trovata");
  return game;
}

export async function updateGame(id, patch = {}) {
  const game = await Game.findById(id);
  if (!game) throw new Error("Partita non trovata");
  if (patch.name !== undefined) game.name = (patch.name || "").trim() || game.name;
  if (patch.description !== undefined) game.description = patch.description || "";
  if (patch.scheduledAt !== undefined) {
    game.scheduledAt = patch.scheduledAt ? new Date(patch.scheduledAt) : null;
    if (!patch.scheduledAt && game.status === "scheduled") game.status = "active";
  }
  await game.save();
  return game;
}

export async function getActiveGame() {
  return Game.findOne({ status: "active" }).sort({ startedAt: -1 });
}

export async function getAllGames(limit = 100) {
  return Game.find({}).sort({ startedAt: -1 }).limit(limit);
}

// Programma pubblico per la home:
// - active: la partita aperta in questo momento
// - upcoming: le partite programmate per oggi (o senza data)
// - future: le partite programmate per date successive
export async function getGameProgram() {
  const games = await Game.find({ status: { $in: ["active", "scheduled"] } })
    .sort({ scheduledAt: 1, startedAt: -1 });

  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const active = games.filter((g) => g.status === "active");
  const upcoming = games.filter(
    (g) => g.status === "scheduled" && (!g.scheduledAt || g.scheduledAt <= endOfToday)
  );
  const future = games.filter(
    (g) => g.status === "scheduled" && g.scheduledAt && g.scheduledAt > endOfToday
  );

  return { active, upcoming, future };
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

// Mette in gioco cartelle dell'archivio globale (slegate dalle partite):
// le copia nelle boards della partita con riferimento cardId, evitando
// di aggiungere due volte la stessa cartella.
// - cardIds: lista di id da giocare
// - all: true → tutte le cartelle dell'archivio
export async function addBoardsFromCards(gameId, { cardIds, all } = {}) {
  const game = await Game.findById(gameId);
  if (!game) throw new Error("Partita non trovata");

  let cards = [];
  if (all) {
    cards = await Card.find({}).sort({ boardNumber: 1 });
  } else if (Array.isArray(cardIds) && cardIds.length > 0) {
    cards = await Card.find({ _id: { $in: cardIds } }).sort({ boardNumber: 1 });
  } else {
    throw new Error("Seleziona almeno una cartella dall'archivio");
  }

  const inGame = new Set(
    game.boards.map((b) => (b.cardId ? String(b.cardId) : null)).filter(Boolean)
  );
  const toAdd = [];
  let alreadyInGame = 0;
  for (const c of cards) {
    if (inGame.has(String(c._id))) {
      alreadyInGame++;
      continue;
    }
    toAdd.push({
      cardId: c._id,
      playerName: "",
      title: c.title,
      setNumber: c.setNumber,
      cardNumber: c.cardNumber,
      boardNumber: c.boardNumber,
      rows: c.rows
    });
  }

  if (toAdd.length > 0) {
    game.boards.push(...toAdd);
    await game.save();
  }

  return {
    game,
    summary: { requested: cards.length, added: toAdd.length, skipped: alreadyInGame }
  };
}

export async function extractNumber(gameId) {
  const target = gameId || (await getActiveGame())?._id;
  const game = target ? await Game.findById(target) : null;
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
        playerName: board.playerName || cardLabel(board),
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

export async function getGameById(id) {
  if (!id) return null;
  return Game.findById(id);
}

export async function getGameState(gameId) {
  const game = gameId ? await getGameById(gameId) : await getActiveGame();
  if (!game) return null;
  return game.toObject();
}

// ===== Cast della partita =====

export async function getCast(gameId) {
  const game = await Game.findById(gameId);
  if (!game) throw new Error("Partita non trovata");
  return { actors: game.actors, assignments: game.assignments };
}

export async function addActorToGame(gameId, data) {
  const game = await Game.findById(gameId);
  if (!game) throw new Error("Partita non trovata");
  const name = (data?.name || "").trim();
  if (!name) throw new Error("Nome personaggio obbligatorio");
  if (game.actors.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("Personaggio già presente nel cast");
  }
  game.actors.push({
    name,
    description: data?.description || "",
    object: data?.object || "",
    active: data?.active !== false
  });
  await game.save();
  return game;
}

export async function updateGameActor(gameId, index, patch = {}) {
  const game = await Game.findById(gameId);
  if (!game) throw new Error("Partita non trovata");
  const actor = game.actors[index];
  if (!actor) throw new Error("Personaggio non trovato");
  if (patch.name !== undefined) actor.name = patch.name.trim() || actor.name;
  if (patch.description !== undefined) actor.description = patch.description;
  if (patch.object !== undefined) actor.object = patch.object;
  if (patch.active !== undefined) actor.active = patch.active;
  await game.save();
  return game;
}

export async function removeGameActor(gameId, index) {
  const game = await Game.findById(gameId);
  if (!game) throw new Error("Partita non trovata");
  const actor = game.actors[index];
  if (!actor) throw new Error("Personaggio non trovato");
  const removedName = actor.name;
  game.actors.splice(index, 1);
  game.assignments = game.assignments.filter((a) => a.character !== removedName);
  await game.save();
  return game;
}

// ===== Associazione utente ↔ personaggio della partita =====

export async function assignCharacterToGame(gameId, userId, character) {
  const game = await Game.findById(gameId);
  if (!game) throw new Error("Partita non trovata");
  if (!userId) throw new Error("Utente obbligatorio");
  const name = (character || "").trim();
  if (!name) throw new Error("Personaggio obbligatorio");
  if (!game.actors.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("Personaggio non presente nel cast della partita");
  }
  const existing = game.assignments.find((a) => String(a.userId) === String(userId));
  if (existing) {
    existing.character = name;
  } else {
    game.assignments.push({ userId, character: name });
  }
  game.assignments = game.assignments.filter(
    (a) => String(a.userId) === String(userId) || a.character.toLowerCase() !== name.toLowerCase()
  );
  await game.save();
  return game;
}

export async function removeAssignmentFromGame(gameId, userId) {
  const game = await Game.findById(gameId);
  if (!game) throw new Error("Partita non trovata");
  game.assignments = game.assignments.filter((a) => String(a.userId) !== String(userId));
  await game.save();
  return game;
}

export async function getCharacterForUser(gameId, userId) {
  const game = await Game.findById(gameId).select("assignments");
  if (!game) return null;
  const assignment = game.assignments.find((a) => String(a.userId) === String(userId));
  return assignment ? assignment.character : null;
}
