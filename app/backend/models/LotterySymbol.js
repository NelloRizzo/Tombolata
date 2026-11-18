import mongoose from "mongoose";

const lotterySymbolSchema = new mongoose.Schema(
  {
    extractionId: { type: mongoose.Schema.Types.ObjectId, ref: "LotteryExtraction", required: true },
    id: { type: Number, required: true },
    code: { type: String, default: "" },
    name: { type: String, default: "" }
  },
  { timestamps: true }
);

lotterySymbolSchema.index({ extractionId: 1, id: 1 }, { unique: true });

export default mongoose.model("LotterySymbol", lotterySymbolSchema);
