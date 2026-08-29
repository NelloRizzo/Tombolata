import mongoose from "mongoose";

const narrationSchema = new mongoose.Schema(
  {
    // Singleton doc (fixed key -> single shared state)
    key: { type: String, default: "main", unique: true },
    // Current narrative phase
    phase: {
      type: String,
      enum: ["prologue", "post-ambo", "post-terno", "post-quaterna", "post-cinquina", "finale", "live"],
      default: "prologue"
    },
    // Video player state
    player: {
      status: {
        type: String,
        enum: ["idle", "playing", "paused", "ended"],
        default: "idle"
      },
      videoId: { type: String, default: null },
      videoName: { type: String, default: null },
      startedAt: { type: Date, default: null },
      // Playback clock (used for the "calendar replacement" clock)
      clockMs: { type: Number, default: 0 }
    },
    // Whether an overlay (video/effects) is replacing the normal board
    overlayActive: { type: Boolean, default: false },
    firedEvents: { type: [mongoose.Schema.Types.Mixed], default: [] }
  },
  { timestamps: true }
);

export default mongoose.model("Narration", narrationSchema);
