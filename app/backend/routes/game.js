import { Router } from "express";
import {
  startNewGame,
  getActiveGame,
  getAllGames,
  getGameProgram,
  extractNumber,
  resetGame,
  deleteGame,
  getGameState,
  setActiveGame,
  addBoard,
  removeBoard
} from "../services/gameService.js";
import { evaluateTriggers, setPhase, getNarrationState } from "../services/triggerService.js";
import { authenticate, requireRoles } from "../services/authMiddleware.js";

const PHASE_BY_WIN = {
  ambo: "post-ambo",
  terno: "post-terno",
  quaterna: "post-quaterna",
  cinquina: "post-cinquina"
};
const WIN_RANK = ["ambo", "terno", "quaterna", "cinquina", "tombola"];

const router = Router();

function broadcastToClients(wss, type, payload) {
  const message = JSON.stringify({ type, payload });
  if (wss) {
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }
}

router.get("/state", async (req, res) => {
  try {
    const state = await getGameState();
    res.json({ ok: true, data: state });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.post("/start", authenticate, requireRoles("regista", "admin"), async (req, res) => {
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

router.post("/extract", authenticate, requireRoles("drawer", "regista", "admin"), async (req, res) => {
  try {
    const { game, newWins } = await extractNumber();
    broadcastToClients(req.app.get("wss"), "game:update", game);
    if (newWins && newWins.length > 0) {
      broadcastToClients(req.app.get("wss"), "game:win", newWins);
      // Avanza la fase narrativa in base alla vincita più alta appena ottenuta
      let highest = null;
      for (const w of newWins) {
        if (!highest || WIN_RANK.indexOf(w.type) > WIN_RANK.indexOf(highest)) highest = w.type;
      }
      const phaseKey = PHASE_BY_WIN[highest];
      if (phaseKey) {
        const narration = await setPhase(phaseKey);
        broadcastToClients(req.app.get("wss"), "narration:update", narration);
      }
    }
    // Valuta i trigger automatici dopo ogni estrazione
    try {
      const fired = await evaluateTriggers();
      if (fired.length > 0) {
        broadcastToClients(req.app.get("wss"), "trigger:fired", fired);
        if (fired.some((e) => e.actionType === "video")) {
          const btnarration = await getNarrationState();
          broadcastToClients(req.app.get("wss"), "narration:update", btnarration);
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

router.post("/:id/boards", authenticate, requireRoles("drawer", "regista", "admin"), async (req, res) => {
  try {
    const { playerName, boardNumber, rows } = req.body || {};
    const game = await addBoard(req.params.id, playerName, rows, boardNumber);
    broadcastToClients(req.app.get("wss"), "game:update", game);
    res.status(201).json({ ok: true, data: game });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

router.delete("/:id/boards/:boardIndex", authenticate, requireRoles("drawer", "regista", "admin"), async (req, res) => {
  try {
    const game = await removeBoard(req.params.id, parseInt(req.params.boardIndex));
    broadcastToClients(req.app.get("wss"), "game:update", game);
    res.json({ ok: true, data: game });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
});

router.post("/:id/finish", authenticate, requireRoles("regista", "admin"), async (req, res) => {
  try {
    const game = await resetGame(req.params.id);
    res.json({ ok: true, data: game });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
});

router.post("/:id/select", authenticate, requireRoles("regista", "admin"), async (req, res) => {
  try {
    const game = await setActiveGame(req.params.id);
    broadcastToClients(req.app.get("wss"), "game:selected", game);
    res.json({ ok: true, data: game });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
});

router.delete("/:id", authenticate, requireRoles("regista", "admin"), async (req, res) => {
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
