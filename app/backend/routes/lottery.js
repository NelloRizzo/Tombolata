import { Router } from "express";
import {
  createExtraction,
  listExtractions,
  getExtraction,
  getLotteryDisplay,
  setLotteryDisplay,
  clearLotteryDisplay,
  prepareLotteryDraw,
  drawLotteryBatch,
  setLotteryReveal,
  drawLotteryBooklet,
  drawLotteryTicket,
  drawNextPrize,
  seedSymbols,
  listSymbols,
  generateTicketsForExtraction,
  listTickets,
  listBooklets,
  buildTicketsPdf,
  buildBookletsPdf,
  markTicketsSold,
  createPrize,
  listPrizes,
  deletePrize,
  deleteExtraction,
  createDrawSession,
  drawCards,
  assignPrize,
  closeSession,
  listWinners,
  getSession,
  listSessions
} from "../services/lotteryService.js";
import { authenticate, requireRoles } from "../services/authMiddleware.js";

const router = Router();

const STAFF = ["admin", "director", "drawer"];

// Estrazioni (edizioni)
router.get("/extractions", authenticate, async (req, res) => {
  try {
    res.json({ ok: true, data: await listExtractions() });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.post("/extractions", authenticate, requireRoles(...STAFF), async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body || {};
    if (!name) return res.status(400).json({ ok: false, message: "name richiesto" });
    const doc = await createExtraction({ name, startDate, endDate });
    const display = await getLotteryDisplay();
    const wss = req.app.get("wss");
    if (wss) {
      const { broadcastToClients } = await import("../services/broadcast.js");
      broadcastToClients(wss, "lottery:update", display, null);
    }
    res.status(201).json({ ok: true, data: doc });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

router.get("/extractions/:id", authenticate, async (req, res) => {
  try {
    const doc = await getExtraction(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: "Non trovata" });
    res.json({ ok: true, data: doc });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.delete("/extractions/:id", authenticate, requireRoles(...STAFF), async (req, res) => {
  try {
    const r = await deleteExtraction(req.params.id);
    res.json({ ok: true, data: r });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

// Simbolo
router.post("/extractions/:id/symbols/seed", authenticate, requireRoles(...STAFF), async (req, res) => {
  try {
    const r = await seedSymbols(req.params.id, Number(req.body?.count) || 40);
    res.json({ ok: true, data: r });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

router.get("/extractions/:id/symbols", authenticate, async (req, res) => {
  try {
    res.json({ ok: true, data: await listSymbols(req.params.id) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// Generazione biglietti
router.post("/extractions/:id/generate", authenticate, requireRoles(...STAFF), async (req, res) => {
  try {
    const r = await generateTicketsForExtraction(req.params.id, req.body || {});
    res.json({ ok: true, data: r });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

router.get("/extractions/:id/tickets", authenticate, async (req, res) => {
  try {
    const status = req.query.status;
    res.json({ ok: true, data: await listTickets(req.params.id, status) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.get("/extractions/:id/booklets", authenticate, async (req, res) => {
  try {
    res.json({ ok: true, data: await listBooklets(req.params.id) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.post("/extractions/:id/tickets/sell", authenticate, requireRoles(...STAFF), async (req, res) => {
  try {
    const r = await markTicketsSold(req.params.id, req.body || {});
    res.json({ ok: true, data: r });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

// Premi
router.post("/extractions/:id/prizes", authenticate, requireRoles(...STAFF), async (req, res) => {
  try {
    const { name, symbolId, value, order } = req.body || {};
    if (!name) return res.status(400).json({ ok: false, message: "name richiesto" });
    const doc = await createPrize(req.params.id, { name, symbolId, value, order });
    res.status(201).json({ ok: true, data: doc });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

router.get("/extractions/:id/prizes", authenticate, async (req, res) => {
  try {
    res.json({ ok: true, data: await listPrizes(req.params.id) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.delete("/prizes/:prizeId", authenticate, requireRoles(...STAFF), async (req, res) => {
  try {
    await deletePrize(req.params.prizeId);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

// Sessioni di estrazione
router.post("/draw/sessions", authenticate, requireRoles(...STAFF), async (req, res) => {
  try {
    const doc = await createDrawSession(req.body?.extractionId || null);
    res.status(201).json({ ok: true, data: doc });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

router.get("/draw/sessions", authenticate, async (req, res) => {
  try {
    res.json({ ok: true, data: await listSessions(req.query.extractionId) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.get("/draw/sessions/:id", authenticate, async (req, res) => {
  try {
    const doc = await getSession(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: "Non trovata" });
    res.json({ ok: true, data: doc });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.post("/draw/sessions/:id/draw-cards", authenticate, requireRoles(...STAFF), async (req, res) => {
  try {
    const r = await drawCards(req.params.id);
    res.json({ ok: true, data: r });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

router.post("/draw/sessions/:id/assign-prize", authenticate, requireRoles(...STAFF), async (req, res) => {
  try {
    const { prizeId, symbolId } = req.body || {};
    const r = await assignPrize(req.params.id, prizeId, symbolId);
    res.json({ ok: true, data: r });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

router.post("/draw/sessions/:id/close", authenticate, requireRoles(...STAFF), async (req, res) => {
  try {
    const doc = await closeSession(req.params.id);
    res.json({ ok: true, data: doc });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

router.get("/draw/sessions/:id/winners", authenticate, async (req, res) => {
  try {
    res.json({ ok: true, data: await listWinners(req.params.id) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// Download PDF dei blocchetti
router.get("/extractions/:id/booklets/pdf", authenticate, async (req, res) => {
  try {
    const buf = await buildTicketsPdf(req.params.id, req.query.booklet);
    const suffix = req.query.booklet ? `-blocchetto-${req.query.booklet}` : "";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="lotteria-${req.params.id}${suffix}.pdf"`);
    res.send(buf);
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

// ---------- Display su tabellone (proiettore) ----------
router.get("/display", async (req, res) => {
  try {
    const doc = await getLotteryDisplay();
    res.json({ ok: true, data: doc });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.post("/display", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const doc = await setLotteryDisplay(req.body || {});
    const wss = req.app.get("wss");
    if (wss) {
      const { broadcastToClients } = await import("../services/broadcast.js");
      broadcastToClients(wss, "lottery:update", doc, null);
    }
    res.json({ ok: true, data: doc });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

router.post("/display/prepare", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const { sessionId, batchSize } = req.body || {};
    const doc = await prepareLotteryDraw(sessionId, batchSize);
    const wss = req.app.get("wss");
    if (wss) {
      const { broadcastToClients } = await import("../services/broadcast.js");
      broadcastToClients(wss, "lottery:update", doc, null);
    }
    res.json({ ok: true, data: doc });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

router.post("/display/batch", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const doc = await drawLotteryBatch();
    const wss = req.app.get("wss");
    if (wss) {
      const { broadcastToClients } = await import("../services/broadcast.js");
      broadcastToClients(wss, "lottery:update", doc, null);
    }
    res.json({ ok: true, data: doc });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

router.post("/display/reveal", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const { serial, booklet } = req.body || {};
    const doc = await setLotteryReveal(serial, booklet);
    const wss = req.app.get("wss");
    if (wss) {
      const { broadcastToClients } = await import("../services/broadcast.js");
      broadcastToClients(wss, "lottery:update", doc, null);
    }
    res.json({ ok: true, data: doc });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

router.post("/display/draw-booklet", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const doc = await drawLotteryBooklet();
    const wss = req.app.get("wss");
    if (wss) {
      const { broadcastToClients } = await import("../services/broadcast.js");
      broadcastToClients(wss, "lottery:update", doc, null);
    }
    res.json({ ok: true, data: doc });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

router.post("/display/draw-ticket", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const doc = await drawLotteryTicket();
    const wss = req.app.get("wss");
    if (wss) {
      const { broadcastToClients } = await import("../services/broadcast.js");
      broadcastToClients(wss, "lottery:update", doc, null);
    }
    res.json({ ok: true, data: doc });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

router.post("/display/draw-prize", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const doc = await drawNextPrize();
    const wss = req.app.get("wss");
    if (wss) {
      const { broadcastToClients } = await import("../services/broadcast.js");
      broadcastToClients(wss, "lottery:update", doc, null);
    }
    res.json({ ok: true, data: doc });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

router.post("/display/clear", authenticate, requireRoles("director", "admin"), async (req, res) => {
  try {
    const doc = await clearLotteryDisplay();
    const wss = req.app.get("wss");
    if (wss) {
      const { broadcastToClients } = await import("../services/broadcast.js");
      broadcastToClients(wss, "lottery:update", doc, null);
    }
    res.json({ ok: true, data: doc });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

export default router;
