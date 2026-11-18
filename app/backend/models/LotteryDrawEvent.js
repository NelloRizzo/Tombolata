import mongoose from "mongoose";

const lotteryDrawEventSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "LotteryDrawSession", required: true },
    type: { type: String, required: true },
    symbolId: { type: Number, default: null },
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "LotteryTicket", default: null },
    winnerTicketNumber: { type: Number, default: null },
    winnerSerial: { type: String, default: null },
    candidateTicketNumbers: { type: [Number], default: [] },
    prizeId: { type: mongoose.Schema.Types.ObjectId, ref: "LotteryPrize", default: null }
  },
  { timestamps: true }
);

export default mongoose.model("LotteryDrawEvent", lotteryDrawEventSchema);
