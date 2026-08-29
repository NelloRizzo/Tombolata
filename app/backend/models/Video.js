import mongoose from "mongoose";

const effectSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["flash", "zoom", "fade", "particles", "shake", "glitch"],
      default: "fade"
    },
    intensity: { type: Number, default: 0.5 }, // 0-1
    duration: { type: Number, default: 1000 }, // ms
    params: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { _id: false }
);

const videoSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    // URL o path del file video (può essere un file caricato o un URL esterno)
    source: { type: String, required: true },
    // L'effetto visivo che accompagna il video
    effects: { type: [effectSchema], default: [] },
    // Suono di accompagnamento (id da catalogo suoni)
    soundOnPlay: { type: String, default: null },
    aspectRatio: { type: String, default: "16:9" },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("Video", videoSchema);
