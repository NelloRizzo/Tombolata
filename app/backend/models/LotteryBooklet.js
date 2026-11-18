import mongoose from "mongoose";

const lotteryBookletSchema = new mongoose.Schema(
  {
    extractionId: { type: mongoose.Schema.Types.ObjectId, ref: "LotteryExtraction", required: true },
    number: { type: Number, required: true },
    fromNum: { type: Number, default: null },
    toNum: { type: Number, default: null },
    ticketNumbers: { type: [Number], default: [] }
  },
  { timestamps: true }
);

export default mongoose.model("LotteryBooklet", lotteryBookletSchema);
