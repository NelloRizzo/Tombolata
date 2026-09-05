import { Router } from "express";
import { authenticate, requireRoles } from "../services/authMiddleware.js";
import { broadcastToClients, resolveGameId } from "../services/broadcast.js";
import {
  getColorGameState,
  startColorGame,
  stopColorGame
} from "../services/colorGameService.js";

const router = Router();

// Stato del minigioco corrente (tutti gli autenticati).
router.get("/color", authenticate, async (req, res) => {
  try {
    const doc = await getColorGameState(resolveGameId(req));
    res.json({ ok: true, data: doc });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Il regista avvia il gioco: genera il layout e lo trasmette al pubblico.
router.post("/color/start", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const gameId = resolveGameId(req);
    const doc = await startColorGame(gameId, req.body || {});
    const wss = req.app.get("wss");
    if (wss) broadcastToClients(wss, "minigame:update", doc, gameId);
    res.status(200).json({ ok: true, data: doc });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Il regista torna al tabellone (chiude il minigioco).
router.post("/color/stop", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const gameId = resolveGameId(req);
    const doc = await stopColorGame(gameId);
    const wss = req.app.get("wss");
    if (wss) broadcastToClients(wss, "minigame:update", doc, gameId);
    res.status(200).json({ ok: true, data: doc });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

export default router;
