import mongoose from "mongoose";

const lotteryTicketSchema = new mongoose.Schema(
  {
    extractionId: { type: mongoose.Schema.Types.ObjectId, ref: "LotteryExtraction", required: true },
    number: { type: Number, required: true },
    serial: { type: String, required: true },
    symbols: { type: [Number], default: [] },
    status: { type: String, enum: ["available", "sold", "winning"], default: "available" },
    bookletId: { type: mongoose.Schema.Types.ObjectId, ref: "LotteryBooklet", default: null }
  },
  { timestamps: true }
);

lotteryTicketSchema.index({ extractionId: 1, number: 1 }, { unique: true });

export default mongoose.model("LotteryTicket", lotteryTicketSchema);
