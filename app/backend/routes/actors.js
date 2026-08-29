import { Router } from "express";
import Actor from "../models/Actor.js";
import { authenticate, requireRoles } from "../services/authMiddleware.js";

const router = Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const actors = await Actor.find({}).sort({ name: 1 });
    res.json({ ok: true, data: actors });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.post("/", authenticate, requireRoles("admin"), async (req, res) => {
  try {
    const { name, description, object, active } = req.body || {};
    if (!name) return res.status(400).json({ ok: false, message: "Nome obbligatorio" });
    if (await Actor.findOne({ name })) {
      return res.status(409).json({ ok: false, message: "Attore già esistente" });
    }
    const actor = new Actor({ name, description, object, active: active !== false });
    await actor.save();
    res.status(201).json({ ok: true, data: actor });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.put("/:id", authenticate, requireRoles("admin"), async (req, res) => {
  try {
    const { name, description, object, active } = req.body || {};
    const update = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (object !== undefined) update.object = object;
    if (active !== undefined) update.active = active;
    const actor = await Actor.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!actor) return res.status(404).json({ ok: false, message: "Attore non trovato" });
    res.json({ ok: true, data: actor });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.delete("/:id", authenticate, requireRoles("admin"), async (req, res) => {
  try {
    await Actor.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

export default router;
