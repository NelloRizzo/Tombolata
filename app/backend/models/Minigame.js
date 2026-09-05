import mongoose from "mongoose";

// Minigioco "colorCount": un riquadro di quadrati che si colorano in 5 secondi;
// i giocatori devono indovinare il colore più presente. Non c'è controllo
// vincite: la partecipazione e il vincitore sono gestiti a mano dal presentatore.
// Doc singleton per partita (key "main" legacy o "game:<gameId>"), come Narration.
const minigameSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    gameId: { type: String, default: null },
    type: { type: String, enum: ["colorCount"], default: "colorCount" },
    // idle = nessun gioco attivo; running = in colorazione; done = colori rivelati
    status: { type: String, enum: ["idle", "running", "done"], default: "idle" },
    totalSquares: { type: Number, default: 0 },
    numColors: { type: Number, default: 0 },
    // Palette effettivamente usata (hex)
    palette: { type: [String], default: [] },
    // Colore assegnato a ogni quadrato (index → hex)
    colors: { type: [String], default: [] },
    startedAt: { type: Date, default: null },
    // L'overlay sostituisce il tabellone
    overlayActive: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("Minigame", minigameSchema);
