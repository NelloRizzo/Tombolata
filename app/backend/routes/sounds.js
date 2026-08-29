import { Router } from "express";
import Sound from "../models/Sound.js";
import { authenticate, requireRoles } from "../services/authMiddleware.js";

const router = Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const sounds = await Sound.find({}).sort({ category: 1, name: 1 });
    res.json({ ok: true, data: sounds });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Crea suono (admin/regista/fonico)
router.post("/", authenticate, requireRoles("admin", "regista", "fonico"), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.name) return res.status(400).json({ ok: false, message: "Nome obbligatorio" });
    if (!["synth", "file"].includes(body.kind)) {
      return res.status(400).json({ ok: false, message: "kind non valido" });
    }
    const sound = new Sound({
      name: body.name,
      description: body.description || "",
      kind: body.kind,
      fileUrl: body.fileUrl || null,
      synth: body.synth || {},
      notes: body.notes || [],
      category: body.category || "generico",
      active: body.active !== false
    });
    await sound.save();
    res.status(201).json({ ok: true, data: sound });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.put("/:id", authenticate, requireRoles("admin", "regista", "fonico"), async (req, res) => {
  try {
    const body = req.body || {};
    const update = {};
    ["name", "description", "fileUrl", "synth", "notes", "category"].forEach((k) => {
      if (body[k] !== undefined) update[k] = body[k];
    });
    if (body.kind !== undefined) {
      if (!["synth", "file"].includes(body.kind)) return res.status(400).json({ ok: false, message: "kind non valido" });
      update.kind = body.kind;
    }
    if (body.active !== undefined) update.active = body.active;
    const sound = await Sound.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!sound) return res.status(404).json({ ok: false, message: "Suono non trovato" });
    res.json({ ok: true, data: sound });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.delete("/:id", authenticate, requireRoles("admin", "regista", "fonico"), async (req, res) => {
  try {
    await Sound.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Avvia un suono: trasmette l'evento a tutti i client connessi (che lo riproducono localmente)
router.post("/:id/play", authenticate, requireRoles("admin", "regista", "fonico"), async (req, res) => {
  try {
    const sound = await Sound.findById(req.params.id);
    if (!sound) return res.status(404).json({ ok: false, message: "Suono non trovato" });

    const wss = req.app.get("wss");
    if (wss) {
      const msg = JSON.stringify({ type: "sound:play", payload: sound });
      wss.clients.forEach((client) => {
        if (client.readyState === 1) client.send(msg);
      });
    }
    res.json({ ok: true, data: sound });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

export default router;
