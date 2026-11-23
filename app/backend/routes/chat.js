import { Router } from "express";
import ChatMessage from "../models/ChatMessage.js";
import { authenticate, requireRoles } from "../services/authMiddleware.js";
import { broadcastToClients, resolveGameId } from "../services/broadcast.js";

const router = Router();

const CHAT_ROLES = ["admin", "director", "presenter", "audio"];

router.get("/", authenticate, requireRoles(...CHAT_ROLES), async (req, res) => {
  try {
    const gid = req.query.gameId;
    const query = gid ? { gameId: gid } : {};
    const messages = await ChatMessage.find(query).sort({ createdAt: 1 }).limit(200);
    res.json({ ok: true, data: messages });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.post("/", authenticate, requireRoles(...CHAT_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    const text = (body.text || "").trim();
    if (!text) return res.status(400).json({ ok: false, message: "Testo obbligatorio" });
    const gid = body.gameId || req.query.gameId || null;
    const msg = await ChatMessage.create({
      gameId: gid || null,
      channel: "presenter-director",
      sender: req.user?.displayName || req.user?.username || "Anonimo",
      senderRole: (req.user?.roles || [])[0] || "",
      text
    });
    await broadcastToClients(req.app.get("wss"), "chat:message", msg, gid);
    res.status(201).json({ ok: true, data: msg });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

export default router;
