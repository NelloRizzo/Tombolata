import { Router } from "express";
import { authenticate, requireRoles } from "../services/authMiddleware.js";
import { broadcastToClients, resolveGameId } from "../services/broadcast.js";
import {
  getColorGameState,
  startColorGame,
  stopColorGame
} from "../services/colorGameService.js";

const router = Router();

// Auto-chiusura del minigioco: il backend chiude il gioco da solo allo
// scadere dei secondi di presentazione (così basta che il tabellone pubblico
// reagisca allo stato idle, senza bisogno di permessi sul client).
const autoStopTimers = new Map();

function timerKey(gameId) {
  return String(gameId || "default");
}

function clearAutoStop(gameId) {
  const key = timerKey(gameId);
  const entry = autoStopTimers.get(key);
  if (entry) {
    clearTimeout(entry.timer);
    autoStopTimers.delete(key);
  }
}

function scheduleAutoStop(gameId, ms, wss) {
  const key = timerKey(gameId);
  clearAutoStop(gameId);
  const timer = setTimeout(async () => {
    autoStopTimers.delete(key);
    try {
      const doc = await stopColorGame(gameId);
      broadcastToClients(wss, "minigame:update", doc, gameId);
    } catch (error) {
      console.error("Auto-stop minigioco fallito:", error.message);
    }
  }, ms);
  if (timer.unref) timer.unref();
  autoStopTimers.set(key, { timer, wss });
}

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
// Il gioco si chiude da solo dopo presentSeconds, con broadcast idle.
router.post("/color/start", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const gameId = resolveGameId(req);
    const doc = await startColorGame(gameId, req.body || {});
    const wss = req.app.get("wss");
    if (wss) {
      broadcastToClients(wss, "minigame:update", doc, gameId);
      if (doc.presentSeconds > 0) scheduleAutoStop(gameId, doc.presentSeconds * 1000, wss);
    }
    res.status(200).json({ ok: true, data: doc });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Il regista torna al tabellone (chiude il minigioco in anticipo).
router.post("/color/stop", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const gameId = resolveGameId(req);
    clearAutoStop(gameId);
    const doc = await stopColorGame(gameId);
    const wss = req.app.get("wss");
    if (wss) broadcastToClients(wss, "minigame:update", doc, gameId);
    res.status(200).json({ ok: true, data: doc });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

export default router;