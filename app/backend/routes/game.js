import { Router } from "express";
import {
  startNewGame,
  updateGame,
  getActiveGame,
  getGameById,
  getAllGames,
  getGameProgram,
  getCast,
  addActorToGame,
  updateGameActor,
  removeGameActor,
  assignCharacterToGame,
  removeAssignmentFromGame,
  getCharacterForUser,
  extractNumber,
  resetGame,
  deleteGame,
  getGameState,
  setActiveGame,
  addBoard,
  removeBoard,
  addBoardsFromCards,
  claimWin
} from "../services/gameService.js";
import { evaluateTriggers, setPhase, getNarrationState } from "../services/triggerService.js";
import { authenticate, requireRoles } from "../services/authMiddleware.js";
import { broadcastToClients, resolveGameId } from "../services/broadcast.js";

const PHASE_BY_WIN = {
  ambo: "post-ambo",
  terno: "post-terno",
  quaterna: "post-quaterna",
  cinquina: "post-cinquina"
};
const WIN_RANK = ["ambo", "terno", "quaterna", "cinquina", "tombola"];

const router = Router();

router.get("/state", async (req, res) => {
  try {
    const state = await getGameState(resolveGameId(req));
    res.json({ ok: true, data: state });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.post("/start", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const game = await startNewGame({
      name: req.body?.name,
      description: req.body?.description,
      scheduledAt: req.body?.scheduledAt
    });
    if (game.status === "active") {
      broadcastToClients(req.app.get("wss"), "game:new", game);
    }
    res.status(201).json({ ok: true, data: game });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Programma pubblico (home): partite aperte, prossime e programmate in futuro.
router.get("/program", async (req, res) => {
  try {
    const program = await getGameProgram();
    res.json({ ok: true, data: program });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Personaggio dell'utente autenticato nella partita selezionata (o attiva).
router.get("/my-cast", authenticate, async (req, res) => {
  try {
    const gameId = resolveGameId(req);
    const game = gameId ? await getGameById(gameId) : await getActiveGame();
    const character = game ? await getCharacterForUser(game._id, req.user.id) : null;
    res.json({ ok: true, data: { gameId: game?._id || null, character } });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// ===== Cast della partita =====
router.get("/:id/actors", authenticate, requireRoles("admin", "director"), async (req, res) => {
  try {
    const cast = await getCast(req.params.id);
    res.json({ ok: true, data: cast });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
});

router.post("/:id/actors", authenticate, requireRoles("admin"), async (req, res) => {
  try {
    const game = await addActorToGame(req.params.id, req.body);
    broadcastToClients(req.app.get("wss"), "game:update", game, req.params.id);
    res.status(201).json({ ok: true, data: game });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

router.put("/:id/actors/:index", authenticate, requireRoles("admin"), async (req, res) => {
  try {
    const game = await updateGameActor(req.params.id, parseInt(req.params.index), req.body);
    broadcastToClients(req.app.get("wss"), "game:update", game, req.params.id);
    res.json({ ok: true, data: game });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
});

router.delete("/:id/actors/:index", authenticate, requireRoles("admin"), async (req, res) => {
  try {
    const game = await removeGameActor(req.params.id, parseInt(req.params.index));
    broadcastToClients(req.app.get("wss"), "game:update", game, req.params.id);
    res.json({ ok: true, data: game });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
});

// ===== Associazione utente ↔ personaggio per la partita =====
router.get("/:id/assignments", authenticate, requireRoles("admin"), async (req, res) => {
  try {
    const cast = await getCast(req.params.id);
    res.json({ ok: true, data: cast.assignments });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
});

router.post("/:id/assignments", authenticate, requireRoles("admin"), async (req, res) => {
  try {
    const { userId, character } = req.body || {};
    const game = await assignCharacterToGame(req.params.id, userId, character);
    broadcastToClients(req.app.get("wss"), "game:update", game, req.params.id);
    res.status(201).json({ ok: true, data: game });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

router.delete("/:id/assignments/:userId", authenticate, requireRoles("admin"), async (req, res) => {
  try {
    const game = await removeAssignmentFromGame(req.params.id, req.params.userId);
    broadcastToClients(req.app.get("wss"), "game:update", game, req.params.id);
    res.json({ ok: true, data: game });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
});

router.post("/extract", authenticate, requireRoles("drawer", "director", "admin"), async (req, res) => {
  try {
    const gameId = resolveGameId(req);
    const { game, newWins } = await extractNumber(gameId);
    broadcastToClients(req.app.get("wss"), "game:update", game, gameId);
    if (newWins && newWins.length > 0) {
      broadcastToClients(req.app.get("wss"), "game:win", newWins, gameId);
      // Avanza la fase narrativa in base alla vincita più alta appena ottenuta
      let highest = null;
      for (const w of newWins) {
        if (!highest || WIN_RANK.indexOf(w.type) > WIN_RANK.indexOf(highest)) highest = w.type;
      }
      const phaseKey = PHASE_BY_WIN[highest];
      if (phaseKey) {
        const narration = await setPhase(phaseKey, gameId);
        broadcastToClients(req.app.get("wss"), "narration:update", narration, gameId);
      }
    }
    // Valuta i trigger automatici dopo ogni estrazione
    try {
      const fired = await evaluateTriggers(gameId);
      if (fired.length > 0) {
        broadcastToClients(req.app.get("wss"), "trigger:fired", fired, gameId);
        if (fired.some((e) => e.actionType === "video")) {
          const btnarration = await getNarrationState(gameId);
          broadcastToClients(req.app.get("wss"), "narration:update", btnarration, gameId);
        }
      }
    } catch (triggerErr) {
      console.error("Errore valutazione trigger:", triggerErr.message);
    }
    res.json({ ok: true, data: game, newWins });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

// Reclama una vincita per la partita (ambo → … → tombola) e, se non già fatto,
// porta la narrazione alla fase corrispondente.
router.post("/:id/claim-win", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const { winType } = req.body || {};
    const { game, phase } = await claimWin(req.params.id, winType);
    broadcastToClients(req.app.get("wss"), "game:update", game, req.params.id);
    if (phase) {
      const narration = await setPhase(phase, req.params.id);
      broadcastToClients(req.app.get("wss"), "narration:update", narration, req.params.id);
    }
    res.json({ ok: true, data: game, phase });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

router.post("/:id/boards", authenticate, requireRoles("drawer", "director", "admin"), async (req, res) => {
  try {
    const { playerName, boardNumber, rows } = req.body || {};
    const game = await addBoard(req.params.id, playerName, rows, boardNumber);
    broadcastToClients(req.app.get("wss"), "game:update", game, req.params.id);
    res.status(201).json({ ok: true, data: game });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

router.post("/:id/boards/from-cards", authenticate, requireRoles("drawer", "director", "admin"), async (req, res) => {
  try {
    const { cardIds, all } = req.body || {};
    const { game, summary } = await addBoardsFromCards(req.params.id, { cardIds, all });
    broadcastToClients(req.app.get("wss"), "game:update", game, req.params.id);
    res.json({ ok: true, data: game, summary });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

router.delete("/:id/boards/:boardIndex", authenticate, requireRoles("drawer", "director", "admin"), async (req, res) => {
  try {
    const game = await removeBoard(req.params.id, parseInt(req.params.boardIndex));
    broadcastToClients(req.app.get("wss"), "game:update", game, req.params.id);
    res.json({ ok: true, data: game });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
});

router.post("/:id/finish", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const game = await resetGame(req.params.id);
    res.json({ ok: true, data: game });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
});

router.post("/:id/select", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const game = await setActiveGame(req.params.id);
    broadcastToClients(req.app.get("wss"), "game:selected", game);
    res.json({ ok: true, data: game });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
});

router.put("/:id", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const game = await updateGame(req.params.id, req.body);
    broadcastToClients(req.app.get("wss"), "game:update", game, req.params.id);
    res.json({ ok: true, data: game });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
});

router.delete("/:id", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const result = await deleteGame(req.params.id);
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
});

router.get("/history", async (req, res) => {
  try {
    const games = await getAllGames();
    res.json({ ok: true, data: games });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

export default router;
