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

  const maxBoard = await Card.findOne().sort({ boardNumber: -1 }).select("boardNumber");
  let nextNumber = (maxBoard?.boardNumber || 0) + 1;

  cards.forEach((card, i) => {
    const label = card.name || `cartella #${i + 1}`;
    try {
      const cells = card.cells;
      if (cells.length !== 15) throw new Error(`attesi 15 numeri, trovati ${cells.length}`);
      if (cells.some((n) => n < 1 || n > 90)) throw new Error("numeri fuori dall'intervallo 1-90");
      if (new Set(cells).size !== cells.length) throw new Error("numeri duplicati");
      const { title, setNumber, cardNumber } = parseCardName(card.name);
      toCreate.push({
        title,
        setNumber,
        cardNumber,
        boardNumber: nextNumber + toCreate.length,
        rows: toRows(cells)
      });
    } catch (e) {
      errors.push({ card: label, reason: e.message });
    }
  });

  let created = [];
  if (toCreate.length > 0) {
    created = await Card.insertMany(toCreate);
  }

  return {
    cards: created,
    summary: { total: cards.length, imported: toCreate.length, skipped: errors.length, errors }
  };
}

export async function listCards() {
  return Card.find({}).sort({ boardNumber: 1 });
}