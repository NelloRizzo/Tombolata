import { Router } from "express";
import Video from "../models/Video.js";
import { authenticate, requireRoles } from "../services/authMiddleware.js";
import { getNarrationForGame } from "../services/triggerService.js";
import { broadcastToClients, resolveGameId } from "../services/broadcast.js";

const router = Router();

// Lista video. ?gameId=X filtra i video di quella partita (incl. i globali senza gameId);
// senza gameId mostra solo i globali (retro-compatibilità).
router.get("/", authenticate, async (req, res) => {
  try {
    const gid = req.query.gameId;
    let query = {};
    if (gid) {
      query = { $or: [{ gameId: null }, { gameId: gid }] };
    } else {
      query = { gameId: null };
    }
    const videos = await Video.find(query).sort({ name: 1 });
    res.json({ ok: true, data: videos });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Crea video (admin/director). gameId opzionale nel body → video dedicato a quella partita.
router.post("/", authenticate, requireRoles("admin", "director"), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.name || !body.source) {
      return res.status(400).json({ ok: false, message: "Nome e sorgente obbligatori" });
    }
    const video = new Video({
      gameId: body.gameId || null,
      name: body.name,
      description: body.description || "",
      source: body.source,
      effects: body.effects || [],
      soundOnPlay: body.soundOnPlay || null,
      aspectRatio: body.aspectRatio || "16:9",
      active: body.active !== false
    });
    await video.save();
    res.status(201).json({ ok: true, data: video });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.put("/:id", authenticate, requireRoles("admin", "director"), async (req, res) => {
  try {
    const body = req.body || {};
    const update = {};
    ["name", "description", "source", "effects", "soundOnPlay", "aspectRatio"].forEach((k) => {
      if (body[k] !== undefined) update[k] = body[k];
    });
    if (body.gameId !== undefined) update.gameId = body.gameId || null;
    if (body.active !== undefined) update.active = body.active;
    const video = await Video.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!video) return res.status(404).json({ ok: false, message: "Video non trovato" });
    res.json({ ok: true, data: video });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.delete("/:id", authenticate, requireRoles("admin", "director"), async (req, res) => {
  try {
    await Video.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Avvia un video (director/video) e aggiorna lo stato del player
router.post("/:id/play", authenticate, requireRoles("admin", "director", "video"), async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ ok: false, message: "Video non trovato" });

    const gameId = resolveGameId(req);
    const narration = await getNarrationForGame(gameId);
    narration.player = {
      status: "playing",
      videoId: video._id.toString(),
      videoName: video.name,
      startedAt: new Date(),
      clockMs: 0
    };
    narration.overlayActive = true;
    await narration.save();
    await broadcastToClients(req.app.get("wss"), "narration:update", narration, gameId);
    res.json({ ok: true, data: narration });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Stop del player video (director/video)
router.post("/stop", authenticate, requireRoles("admin", "director", "video"), async (req, res) => {
  try {
    const gameId = resolveGameId(req);
    const narration = await getNarrationForGame(gameId);
    narration.player = { status: "idle", videoId: null, videoName: null, startedAt: null, clockMs: 0 };
    narration.overlayActive = false;
    await narration.save();
    await broadcastToClients(req.app.get("wss"), "narration:update", narration, gameId);
    res.json({ ok: true, data: narration });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Pausa/ripresa player
router.post("/pause", authenticate, requireRoles("admin", "director", "video"), async (req, res) => {
  try {
    const gameId = resolveGameId(req);
    const narration = await getNarrationForGame(gameId);
    if (narration.player.status === "playing") {
      narration.player.status = "paused";
      await narration.save();
      await broadcastToClients(req.app.get("wss"), "narration:update", narration, gameId);
    }
    res.json({ ok: true, data: narration });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.post("/resume", authenticate, requireRoles("admin", "director", "video"), async (req, res) => {
  try {
    const gameId = resolveGameId(req);
    const narration = await getNarrationForGame(gameId);
    if (narration.player.status === "paused") {
      narration.player.status = "playing";
      await narration.save();
      await broadcastToClients(req.app.get("wss"), "narration:update", narration, gameId);
    }
    res.json({ ok: true, data: narration });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

export default router;
