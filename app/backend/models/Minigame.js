import mongoose from "mongoose";

// Minigiochi di contorno alla tombola ("Giochi"): colorCount, memory a coppie,
// numero nascosto. Nessun controllo vincite: la partecipazione e il vincitore
// sono gestiti a mano dal presentatore. Doc singleton per partita
// (key "main" legacy o "game:<gameId>"), come Narration.
const cardSchema = new mongoose.Schema(
  {
    sym: { type: String, default: "?" },
    // down = coperta, up = scoperta momentanea, found = coppia indovinata
    face: { type: String, enum: ["down", "up", "found"], default: "down" }
  },
  { _id: false }
);

const minigameSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    gameId: { type: String, default: null },
    type: {
      type: String,
      enum: ["colorCount", "memory", "numberHide"],
      default: "colorCount"
    },
    // idle = nessun gioco attivo; running = in corso (composizione in colorazione
    // o partita aperta); done = rivelato/colorato
    status: { type: String, enum: ["idle", "running", "done"], default: "idle" },
    // colorCount
    totalSquares: { type: Number, default: 0 },
    numColors: { type: Number, default: 0 },
    // Palette effettivamente usata (hex)
    palette: { type: [String], default: [] },
    // Colore assegnato a ogni quadrato (index → hex)
    colors: { type: [String], default: [] },
    // memory: griglia rows x cols e carte (sym + face) per posizione
    rows: { type: Number, default: 0 },
    cols: { type: Number, default: 0 },
    cards: { type: [cardSchema], default: [] },
    // numberHide: etichette coordinate delle celle (es. A1, B3)
    cells: { type: [String], default: [] },
    // numberHide: cella che custodisce il numero e il numero segreto
    hiddenIndex: { type: Number, default: null },
    hiddenNumber: { type: Number, default: null },
    // numberHide: il regista ha rivelato dov'era nascosto il numero
    revealed: { type: Boolean, default: false },
    // Payload generico per future estensioni dei singoli giochi
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    startedAt: { type: Date, default: null },
    // Durata di presentazione a schermo (secondi) decisa dal regista
    presentSeconds: { type: Number, default: 0 },
    // Fine prevista della presentazione (startedAt + presentSeconds + reveal)
    expiresAt: { type: Date, default: null },
    // L'overlay sostituisce il tabellone
    overlayActive: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("Minigame", minigameSchema);