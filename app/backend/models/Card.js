import mongoose from "mongoose";

// Archivio globale di cartelle, slegate dalle partite.
// Vengono "messe in gioco" selezionandole per una partita (copia in Game.boards
// con riferimento cardId). Una cartella puo' partecipare a piu' partite.
const cardSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    setNumber: { type: Number, default: null },
    cardNumber: { type: Number, default: null },
    boardNumber: { type: Number, default: null },
    rows: {
      type: [[Number]],
      validate: {
        validator: (rows) => rows.length === 3 && rows.every((r) => r.length === 5),
        message: "Una cartella deve avere 3 righe da 5 numeri"
      }
    }
  },
  { timestamps: true }
);

cardSchema.index({ boardNumber: 1 }, { unique: true });

export default mongoose.model("Card", cardSchema);