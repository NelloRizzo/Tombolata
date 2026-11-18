import mongoose from "mongoose";

const lotteryExtractionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("LotteryExtraction", lotteryExtractionSchema);
