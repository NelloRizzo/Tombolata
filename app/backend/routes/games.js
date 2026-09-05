import { Router } from "express";
import { authenticate, requireRoles } from "../services/authMiddleware.js";
import { broadcastToClients } from "../services/broadcast.js";
import {
  getColorGameState,
  startColorGame,
  stopColorGame
} from "../services/colorGameService.js";
import {
  getMinigameState,
  presentationDurationMs,
  stopMinigame
} from "../services/minigameService.js";
import {
  startMemoryGame,
  flipMemoryCard,
  flipBackMemoryPair
} from "../services/memoryGameService.js";
import {
  startNumberHideGame,
  revealNumberHideGame
} from "../services/numberHideService.js";

const router = Router();

// Timer di auto-chiusura: il backend chiude il gioco da solo allo scadere del
// tempo di presentazione (così basta che il tabellone pubblico reagisca allo
// stato idle, senza bisogno di permessi sul client).
const autoStopTimers = new Map();
// Memory: quando due carte scoperte non corrispondono, vengono rigirate da sole.
const flipBackTimers = new Map();

function timerKey(gameId) {
  return String(gameId || "default");
}

function clearTimer(map, gameId) {
  const key = timerKey(gameId);
  const entry = map.get(key);
  if (entry) {
    clearTimeout(entry.timer);
    map.delete(key);
  }
}

function scheduleAutoStop(gameId, doc, wss) {
  const key = timerKey(gameId);
  clearTimer(autoStopTimers, gameId);
  const timer = setTimeout(async () => {
    autoStopTimers.delete(key);
    try {
      const stopped = await stopMinigame(gameId);
      broadcastToClients(wss, "minigame:update", stopped, gameId);
    } catch (error) {
      console.error("Auto-stop minigioco fallito:", error.message);
    }
  }, presentationDurationMs(doc));
  if (timer.unref) timer.unref();
  autoStopTimers.set(key, { timer, wss });
}

function scheduleFlipBack(gameId, pair, wss) {
  const key = timerKey(gameId);
  clearTimer(flipBackTimers, gameId);
  const timer = setTimeout(async () => {
    flipBackTimers.delete(key);
    try {
      const doc = await flipBackMemoryPair(gameId, pair);
      broadcastToClients(wss, "minigame:update", doc, gameId);
    } catch (error) {
      console.error("Flip-back memory fallito:", error.message);
    }
  }, 2500);
  if (timer.unref) timer.unref();
  flipBackTimers.set(key, { timer, wss });
}

function clearAllTimers(gameId) {
  clearTimer(autoStopTimers, gameId);
  clearTimer(flipBackTimers, gameId);
}

// Stato del minigioco corrente (alias color per retrocompatibilità).
router.get("/", authenticate, async (req, res) => {
  try {
    const doc = await getMinigameState(null);
    res.json({ ok: true, data: doc });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.get("/color", authenticate, async (req, res) => {
  try {
    const doc = await getColorGameState(null);
    res.json({ ok: true, data: doc });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// ---- colorCount ----
router.post("/color/start", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const gameId = null;
    const doc = await startColorGame(gameId, req.body || {});
    const wss = req.app.get("wss");
    if (wss) {
      broadcastToClients(wss, "minigame:update", doc, gameId);
      scheduleAutoStop(gameId, doc, wss);
    }
    res.status(200).json({ ok: true, data: doc });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.post("/color/stop", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const gameId = null;
    clearAllTimers(gameId);
    const doc = await stopColorGame(gameId);
    const wss = req.app.get("wss");
    if (wss) broadcastToClients(wss, "minigame:update", doc, gameId);
    res.status(200).json({ ok: true, data: doc });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// ---- memory a coppie ----
router.post("/memory/start", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const gameId = null;
    const doc = await startMemoryGame(gameId, req.body || {});
    const wss = req.app.get("wss");
    if (wss) {
      broadcastToClients(wss, "minigame:update", doc, gameId);
      scheduleAutoStop(gameId, doc, wss);
    }
    res.status(200).json({ ok: true, data: doc });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

router.post("/memory/flip", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const gameId = null;
    const { doc, mismatch } = await flipMemoryCard(gameId, req.body?.index);
    const wss = req.app.get("wss");
    if (wss) {
      broadcastToClients(wss, "minigame:update", doc, gameId);
      if (mismatch) scheduleFlipBack(gameId, mismatch, wss);
    }
    res.json({ ok: true, data: doc });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

router.post("/memory/stop", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const gameId = null;
    clearAllTimers(gameId);
    const doc = await stopMinigame(gameId);
    const wss = req.app.get("wss");
    if (wss) broadcastToClients(wss, "minigame:update", doc, gameId);
    res.status(200).json({ ok: true, data: doc });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// ---- numero nascosto ----
router.post("/numberhide/start", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const gameId = null;
    const doc = await startNumberHideGame(gameId, req.body || {});
    const wss = req.app.get("wss");
    if (wss) {
      broadcastToClients(wss, "minigame:update", doc, gameId);
      scheduleAutoStop(gameId, doc, wss);
    }
    res.status(200).json({ ok: true, data: doc });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

router.post("/numberhide/reveal", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const gameId = null;
    const doc = await revealNumberHideGame(gameId);
    const wss = req.app.get("wss");
    if (wss) broadcastToClients(wss, "minigame:update", doc, gameId);
    res.json({ ok: true, data: doc });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

router.post("/numberhide/stop", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const gameId = null;
    clearAllTimers(gameId);
    const doc = await stopMinigame(gameId);
    const wss = req.app.get("wss");
    if (wss) broadcastToClients(wss, "minigame:update", doc, gameId);
    res.status(200).json({ ok: true, data: doc });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

export default router;