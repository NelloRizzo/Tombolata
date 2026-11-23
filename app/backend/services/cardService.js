import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import Card from "../models/Card.js";
import { parseTombolataCards, parseCardName, toRows } from "./tombolataCardsXml.js";

// Importa le cartelle dal file .cards nell'archivio globale (slegate dalle partite).
export async function importCards(xml) {
  if (!xml || typeof xml !== "string" || xml.trim() === "") {
    throw new Error("XML delle cartelle mancante");
  }
  const cards = parseTombolataCards(xml);
  const errors = [];
  const toCreate = [];
  let updated = 0;

  const maxBoard = await Card.findOne().sort({ boardNumber: -1 }).select("boardNumber");
  let nextNumber = (maxBoard?.boardNumber || 0) + 1;

  for (const card of cards) {
    const label = card.name || `cartella`;
    try {
      const cells = card.cells;
      if (cells.length !== 15) throw new Error(`attesi 15 numeri, trovati ${cells.length}`);
      if (cells.some((n) => n < 1 || n > 90)) throw new Error("numeri fuori dall'intervallo 1-90");
      if (new Set(cells).size !== cells.length) throw new Error("numeri duplicati");
      const { title, setNumber, cardNumber } = parseCardName(card.name);
      const rows = toRows(cells);
      // Se la cartella esiste già (stesso titolo/set/numero), aggiorna le righe
      // invece di creare un duplicato: permette di correggere importazioni precedenti.
      const existing = await Card.findOne({ title, setNumber, cardNumber });
      if (existing) {
        await Card.updateOne({ _id: existing._id }, { $set: { rows } });
        updated++;
      } else {
        toCreate.push({
          title,
          setNumber,
          cardNumber,
          boardNumber: nextNumber + toCreate.length,
          rows
        });
      }
    } catch (e) {
      errors.push({ card: label, reason: e.message });
    }
  }

  let created = [];
  if (toCreate.length > 0) {
    created = await Card.insertMany(toCreate);
  }

  return {
    cards: created,
    summary: { total: cards.length, imported: toCreate.length, updated, skipped: errors.length, errors }
  };
}

export async function listCards() {
  return Card.find({}).sort({ boardNumber: 1 });
}

const MM_TO_PT = 2.834645669;

function normalizeRows(rows) {
  if (!Array.isArray(rows)) return Array.from({ length: 3 }, () => Array(9).fill(null));
  return rows.map((row) => {
    if (!Array.isArray(row)) return Array(9).fill(null);
    if (row.length === 9) return row.slice();
    const out = Array(9).fill(null);
    for (const n of row) {
      if (n == null) continue;
      let col;
      if (n <= 10) col = 0;
      else if (n <= 19) col = 1;
      else if (n <= 29) col = 2;
      else if (n <= 39) col = 3;
      else if (n <= 49) col = 4;
      else if (n <= 59) col = 5;
      else if (n <= 69) col = 6;
      else if (n <= 79) col = 7;
      else col = 8;
      if (out[col] == null) out[col] = n;
    }
    return out;
  });
}

function resolveAssetsDir() {
  const candidates = [
    process.env.CARDS_ASSETS_DIR,
    process.env.LOTTERY_ASSETS_DIR,
    process.env.ASSETS_DIR,
    path.resolve(process.cwd(), "assets"),
    path.resolve(process.cwd(), "..", "assets"),
    path.resolve(process.cwd(), "..", "..", "assets"),
    "E:/UtentiLocali/Nello/Desktop/Uniamoci/AspettandoLaBefana/assets"
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.resolve(process.cwd(), "assets");
}

function tryGetCardsBackgroundPath(baseDir) {
  const cands = ["sfondocartelle.png", "sfondocartelle.jpg", "cards-background.png", "sfondo-cartelle.png", "cartelle-bg.png", "background-cards.png"];
  for (const c of cands) {
    const p = path.join(baseDir, "branding", c);
    if (fs.existsSync(p)) return p;
  }
  for (const c of cands) {
    const p = path.join(baseDir, c);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function buildCardsPdf(group1, group2) {
  const g1 = String(group1 || "").trim();
  const g2 = String(group2 || "").trim();
  if (!g1 || !g2) throw new Error("Seleziona entrambi i gruppi");
  if (g1 === g2) throw new Error("I due gruppi devono essere diversi");
  const cards1 = await Card.find({ title: g1 }).sort({ boardNumber: 1 }).lean();
  const cards2 = await Card.find({ title: g2 }).sort({ boardNumber: 1 }).lean();
  if (!cards1.length) throw new Error(`Nessuna cartella nel gruppo "${g1}"`);
  if (!cards2.length) throw new Error(`Nessuna cartella nel gruppo "${g2}"`);

  const PDFDocument = (await import("pdfkit")).default;
  const baseDir = resolveAssetsDir();
  const bgPath = tryGetCardsBackgroundPath(baseDir);

  const count = Math.min(cards1.length, cards2.length);

  const CM_TO_PT = 28.34645669;
  const xStart = 3.5 * CM_TO_PT;
  const xEnd = 18 * CM_TO_PT;
  const yStart = 5.5 * CM_TO_PT;
  const yEnd = 23.5 * CM_TO_PT;
  const gapCm = 0.5 * CM_TO_PT;
  const areaW = xEnd - xStart;
  const areaH = yEnd - yStart;
  const cardH = (areaH - gapCm) / 2;
  const card1Y = yStart;
  const card2Y = yStart + cardH + gapCm;

  const doc = new PDFDocument({ size: "A4", layout: "portrait", margin: 0 });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));

  const pageW = doc.page.width;
  const pageH = doc.page.height;

  function drawCard(card, y) {
    const rows = normalizeRows(card.rows);
    const cellW = areaW / 9;
    const cellH = cardH / 3;
    const label = [card.title, card.setNumber != null ? `S.${card.setNumber}` : null, card.cardNumber != null ? `n.${card.cardNumber}` : null].filter(Boolean).join(" · ");
    // nome della cartella in grande e grassetto, sopra l'area
    if (label) {
      doc.font("Helvetica-Bold").fontSize(16).fillColor("#000")
        .text(label, xStart, y - 1.0 * CM_TO_PT, { width: areaW, align: "center" });
    }
    // bordo doppio
    doc.save();
    doc.strokeColor("#000").lineWidth(2.5).rect(xStart, y, areaW, cardH).stroke();
    doc.strokeColor("#000").lineWidth(0.8).rect(xStart + 3, y + 3, areaW - 6, cardH - 6).stroke();
    doc.restore();
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 9; c++) {
        const cx = xStart + c * cellW;
        const cy = y + r * cellH;
        const n = rows[r]?.[c];
        if (n == null) {
          // celle vuote con sfondo grigio
          doc.save();
          doc.fillColor("#d9d9d9").rect(cx, cy, cellW, cellH).fill();
          doc.restore();
        }
        doc.rect(cx, cy, cellW, cellH).strokeColor("#333").lineWidth(0.5).stroke();
        if (n != null) {
          doc.font("Helvetica-Bold").fontSize(Math.min(cellW, cellH) * 0.42).fillColor("#000")
            .text(String(n), cx, cy + cellH * 0.3, { width: cellW, align: "center" });
        }
      }
    }
  }

  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    for (let i = 0; i < count; i++) {
      if (i > 0) doc.addPage();
      if (bgPath) {
        try { doc.image(bgPath, 0, 0, { width: pageW, height: pageH }); } catch {}
      }
      drawCard(cards1[i], card1Y);
      drawCard(cards2[i], card2Y);
    }

    if (count === 0) {
      doc.fontSize(12).text("Nessuna coppia di cartelle da stampare.");
    }
    doc.end();
  });
}

// Elimina dall'archivio le cartelle con gli id indicati.
export async function deleteCards(cardIds) {
  const ids = (cardIds || []).filter((id) => id && mongoose.isValidObjectId(id));
  if (ids.length === 0) {
    throw new Error("Nessun id valido da eliminare");
  }
  const res = await Card.deleteMany({ _id: { $in: ids } });
  return { deleted: res.deletedCount };
}