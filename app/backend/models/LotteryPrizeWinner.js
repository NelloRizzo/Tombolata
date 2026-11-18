import mongoose from "mongoose";

const lotteryPrizeWinnerSchema = new mongoose.Schema(
  {
    prizeId: { type: mongoose.Schema.Types.ObjectId, ref: "LotteryPrize", required: true },
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "LotteryTicket", default: null },
    ticketNumber: { type: Number, default: null },
    serial: { type: String, default: "" },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "LotteryDrawEvent", default: null }
  },
  { timestamps: true }
);

export default mongoose.model("LotteryPrizeWinner", lotteryPrizeWinnerSchema);
