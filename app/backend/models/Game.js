import mongoose from "mongoose";

const boardSchema = new mongoose.Schema({
  playerName: { type: String, required: true },
  boardNumber: { type: Number, default: null },
  rows: {
    type: [[Number]],
    validate: {
      validator: (rows) => rows.length === 3 && rows.every((r) => r.length === 5),
      message: "Una cartella deve avere 3 righe da 5 numeri"
    }
  }
}, { _id: false });

const winEventSchema = new mongoose.Schema({
  type: { type: String, enum: ["ambo", "terno", "quaterna", "cinquina", "tombola"], required: true },
  playerName: { type: String },
  boardIndex: { type: Number },
  numbers: { type: [Number], required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

// Personaggio del cast di questa partita (es. Totonno, concetto)
const actorBriefSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  object: { type: String, default: "" },
  active: { type: Boolean, default: true }
}, { _id: false });

// Chi (utente autenticato) interpreta quale personaggio del cast in questa partita
const castAssignmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  character: { type: String, required: true }
}, { _id: false });

const gameSchema = new mongoose.Schema({
  status: { type: String, enum: ["scheduled", "active", "finished"], default: "active" },
  name: { type: String, default: "Tombolata" },
  description: { type: String, default: "" },
  scheduledAt: { type: Date, default: null },
  extractedNumbers: { type: [Number], default: [] },
  currentNumber: { type: Number, default: null },
  extractionCount: { type: Number, default: 0 },
  boards: { type: [boardSchema], default: [] },
  wins: { type: [winEventSchema], default: [] },
  lastWin: { type: winEventSchema, default: null },
  wonTypes: { type: [String], default: [] },
  actors: { type: [actorBriefSchema], default: [] },
  assignments: { type: [castAssignmentSchema], default: [] },
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model("Game", gameSchema);
