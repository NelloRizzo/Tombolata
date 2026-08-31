import { Router } from "express";
import { importCards, listCards } from "../services/cardService.js";
import { authenticate, requireRoles } from "../services/authMiddleware.js";

const router = Router();

// Archivio globale di cartelle (slegate dalle partite)
router.get("/", authenticate, requireRoles("drawer", "director", "admin"), async (req, res) => {
  try {
    res.json({ ok: true, data: await listCards() });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Importa un file .cards/.xml (XML DataContract "Tombolata") nell'archivio
router.post("/import", authenticate, requireRoles("drawer", "director", "admin"), async (req, res) => {
  try {
    const { cards, summary } = await importCards(req.body?.xml);
    res.status(201).json({ ok: true, data: cards, summary });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

export default router;