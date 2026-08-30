import mongoose from "mongoose";

const conditionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["number", "termination", "dozen", "range", "win", "count"],
      required: true
    },
    // type=number: il numero (es. 47)
    // type=termination: la cifra finale (es. 2)
    // type=dozen: il numero della decina 1-9
    // type=range: { min, max }
    // type=win: la vincita (ambo|terno|quaterna|cinquina|tombola)
    // type=count: numero progressivo di estrazione (es. 50)
    value: { type: mongoose.Schema.Types.Mixed },
    min: { type: Number },
    max: { type: Number }
  },
  { _id: false }
);

const conditionGroupSchema = new mongoose.Schema(
  {
    operator: { type: String, enum: ["and", "or"], default: "and" },
    conditions: { type: [conditionSchema], default: [] }
  },
  { _id: false }
);

const triggerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game", default: null },
    // Narrative phase in which the trigger is active
    phase: {
      type: String,
      enum: ["prologue", "post-ambo", "post-terno", "post-quaterna", "post-cinquina", "finale", "always"],
      default: "always"
    },
    // Gruppi di condizioni (gruppi multipli = combinati in AND tra loro,
    // all'interno di ciascun gruppo operator and/or tra le condizioni)
    conditions: { type: [conditionGroupSchema], default: [] },
    // Azione da attivare
    actionType: {
      type: String,
      enum: ["video", "live", "sound", "effect"],
      required: true
    },
    actionRef: { type: String, default: "" }, // id/nome del video, attore, sound, effect
    // Attore coinvolto (per actionType=live o per trigger personali dell'attore)
    targetActor: { type: String, default: null }, // nome personaggio
    // Priorità di valutazione
    order: { type: Number, default: 0 },
    // Fallback: dopo quante estrazioni forzare l'attivazione (se >0)
    forceAfterExtractions: { type: Number, default: 0 },
    // Stato
    autoMode: { type: Boolean, default: true }, // attivazione automatica
    active: { type: Boolean, default: true },
    fired: { type: Number, default: 0 }, // contatore attivazioni
    lastFiredAt: { type: Date, default: null }
  },
  { timestamps: true }
);

triggerSchema.index({ phase: 1, order: 1 });
triggerSchema.index({ targetActor: 1 });
triggerSchema.index({ gameId: 1, phase: 1, order: 1 });

export default mongoose.model("Trigger", triggerSchema);
