import { Router } from "express";
import Trigger from "../models/Trigger.js";
import { authenticate, requireRoles } from "../services/authMiddleware.js";
import { fireManual, evaluateTriggers, getNarrationState, setPhase } from "../services/triggerService.js";
import { getActiveGame, getGameById, getCharacterForUser } from "../services/gameService.js";
import { broadcastToClients, resolveGameId } from "../services/broadcast.js";

const router = Router();
const ACTIONS = ["video", "live", "sound", "effect"];
const PHASES = ["prologue", "post-ambo", "post-terno", "post-quaterna", "post-cinquina", "finale", "always"];

// Lista trigger (admin/regista vede tutto, attore vede solo i propri 'live' per il
// personaggio che interpreta nella partita attiva)
router.get("/", authenticate, async (req, res) => {
  try {
    const gid = req.query.gameId;
    let query = {};
    if (req.user.roles.includes("admin") || req.user.roles.includes("regista")) {
      if (gid) {
        query = { $or: [{ gameId: null }, { gameId: gid }] };
      } else {
        query = { gameId: null };
      }
    } else if (req.user.roles.includes("attore")) {
      const gameId = resolveGameId(req);
      const game = gameId ? await getGameById(gameId) : await getActiveGame();
      const character = game ? await getCharacterForUser(game._id, req.user.id) : null;
      if (!character) return res.json({ ok: true, data: [] });
      query = { targetActor: character, actionType: "live" };
    } else {
      return res.status(403).json({ ok: false, message: "Permessi insufficienti" });
    }
    const triggers = await Trigger.find(query).sort({ order: 1, createdAt: 1 });
    res.json({ ok: true, data: triggers });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.post("/", authenticate, requireRoles("admin"), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.name) return res.status(400).json({ ok: false, message: "Nome obbligatorio" });
    if (!ACTIONS.includes(body.actionType)) {
      return res.status(400).json({ ok: false, message: "actionType non valido" });
    }
    if (body.phase && !PHASES.includes(body.phase)) {
      return res.status(400).json({ ok: false, message: "Fase non valida" });
    }
    const trigger = new Trigger({
      name: body.name,
      description: body.description || "",
      gameId: body.gameId || null,
      phase: body.phase || "always",
      conditions: body.conditions || [],
      actionType: body.actionType,
      actionRef: body.actionRef || "",
      targetActor: body.targetActor || null,
      order: body.order || 0,
      forceAfterExtractions: body.forceAfterExtractions || 0,
      autoMode: body.autoMode !== false,
      active: body.active !== false
    });
    await trigger.save();
    res.status(201).json({ ok: true, data: trigger });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.put("/:id", authenticate, requireRoles("admin"), async (req, res) => {
  try {
    const body = req.body || {};
    const update = {};
    ["name", "description", "conditions", "actionRef", "targetActor", "order", "forceAfterExtractions"].forEach((k) => {
      if (body[k] !== undefined) update[k] = body[k];
    });
    if (body.gameId !== undefined) update.gameId = body.gameId || null;
    if (body.actionType !== undefined) {
      if (!ACTIONS.includes(body.actionType)) return res.status(400).json({ ok: false, message: "actionType non valido" });
      update.actionType = body.actionType;
    }
    if (body.phase !== undefined) {
      if (!PHASES.includes(body.phase)) return res.status(400).json({ ok: false, message: "Fase non valida" });
      update.phase = body.phase;
    }
    if (body.autoMode !== undefined) update.autoMode = body.autoMode;
    if (body.active !== undefined) update.active = body.active;
    const trigger = await Trigger.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!trigger) return res.status(404).json({ ok: false, message: "Trigger non trovato" });
    res.json({ ok: true, data: trigger });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.delete("/:id", authenticate, requireRoles("admin"), async (req, res) => {
  try {
    await Trigger.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Attivazione manuale da parte del regista
router.post("/:id/fire", authenticate, requireRoles("regista", "admin"), async (req, res) => {
  try {
    const gameId = resolveGameId(req);
    const event = await fireManual(req.params.id, gameId);
    const wss = req.app.get("wss");
    if (wss) {
      broadcastToClients(wss, "trigger:fired", [event], gameId);
      if (event.actionType === "video" || event.actionType === "effect") {
        const narration = await getNarrationState(gameId);
        broadcastToClients(wss, "narration:update", narration, gameId);
      }
    }
    res.json({ ok: true, data: event });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
});

// Test manuale della valutazione trigger (senza attivare)
router.post("/evaluate", authenticate, requireRoles("regista", "admin"), async (req, res) => {
  try {
    const fired = await evaluateTriggers(resolveGameId(req));
    res.json({ ok: true, data: fired });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Stato della narrazione (per tutti gli autenticati)
router.get("/narration", authenticate, async (req, res) => {
  try {
    const narration = await getNarrationState(resolveGameId(req));
    res.json({ ok: true, data: narration });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Imposta la fase (regista)
router.post("/phase", authenticate, requireRoles("regista", "admin"), async (req, res) => {
  try {
    const { phase } = req.body || {};
    if (!phase || !PHASES.includes(phase)) {
      return res.status(400).json({ ok: false, message: "Fase non valida" });
    }
    const narration = await setPhase(phase, resolveGameId(req));
    res.json({ ok: true, data: narration });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

export default router;
