import { Router } from "express";
import { importCards, listCards, deleteCards, buildCardsPdf } from "../services/cardService.js";
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

// Elimina dall'archivio le cartelle con gli id indicati
router.post("/delete", authenticate, requireRoles("drawer", "director", "admin"), async (req, res) => {
  try {
    const result = await deleteCards(req.body?.cardIds);
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

// Download PDF delle cartelle: una cartella dal primo gruppo e una dal secondo per foglio A4
router.get("/pdf", authenticate, requireRoles("drawer", "director", "admin"), async (req, res) => {
  try {
    const group1 = req.query.group1;
    const group2 = req.query.group2;
    const buf = await buildCardsPdf(group1, group2);
    const safe = (s) => String(s || "").replace(/[^a-zA-Z0-9_-]/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="cartelle-${safe(group1)}-${safe(group2)}.pdf"`);
    res.send(buf);
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

export default router;