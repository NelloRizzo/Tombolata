import mongoose from "mongoose";

const soundSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    // Tipo di suono: sintetizzato via Web Audio o file
    kind: { type: String, enum: ["synth", "file"], default: "synth" },
    // Per kind=file: url del file
    fileUrl: { type: String, default: null },
    // Per kind=synth: parametri del suono sintetizzato
    synth: {
      type: { type: String, enum: ["sine", "square", "triangle", "sawtooth"], default: "sine" },
      frequency: { type: Number, default: 440 },
      duration: { type: Number, default: 1 },
      gain: { type: Number, default: 0.3 }
    },
    // Suoni compositi (sequenza di note)
    notes: { type: [mongoose.Schema.Types.Mixed], default: [] },
    category: { type: String, default: "generico" },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("Sound", soundSchema);
