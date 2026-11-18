import mongoose from "mongoose";

const lotteryDisplaySchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    active: { type: Boolean, default: false },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "LotteryDrawSession", default: null },
    drawn: { type: [Number], default: [] },
    eliminated: { type: [Number], default: [] },
    finalists: { type: [Number], default: [] },
    winnerSerial: { type: String, default: "" },
    winnerNumber: { type: Number, default: null },
    prizeName: { type: String, default: "" },
    status: { type: String, default: "idle" } // idle | drawing | finalists | winner
  },
  { timestamps: true }
);

export default mongoose.model("LotteryDisplay", lotteryDisplaySchema);
