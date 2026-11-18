import mongoose from "mongoose";

const lotteryPrizeSchema = new mongoose.Schema(
  {
    extractionId: { type: mongoose.Schema.Types.ObjectId, ref: "LotteryExtraction", required: true },
    name: { type: String, required: true },
    symbolId: { type: Number, default: null },
    value: { type: String, default: "" },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.model("LotteryPrize", lotteryPrizeSchema);
