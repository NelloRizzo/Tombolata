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

const gameSchema = new mongoose.Schema({
  status: { type: String, enum: ["active", "finished"], default: "active" },
  name: { type: String, default: "Tombolata" },
  extractedNumbers: { type: [Number], default: [] },
  currentNumber: { type: Number, default: null },
  extractionCount: { type: Number, default: 0 },
  boards: { type: [boardSchema], default: [] },
  wins: { type: [winEventSchema], default: [] },
  lastWin: { type: winEventSchema, default: null },
  wonTypes: { type: [String], default: [] },
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model("Game", gameSchema);
