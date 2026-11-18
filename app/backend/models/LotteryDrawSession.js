import mongoose from "mongoose";

const lotteryDrawSessionSchema = new mongoose.Schema(
  {
    extractionId: { type: mongoose.Schema.Types.ObjectId, ref: "LotteryExtraction", default: null },
    closed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("LotteryDrawSession", lotteryDrawSessionSchema);
