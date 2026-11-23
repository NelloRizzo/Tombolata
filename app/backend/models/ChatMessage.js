import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game", default: null },
    channel: { type: String, default: "presenter-director" },
    sender: { type: String, required: true },
    senderRole: { type: String, default: "" },
    text: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

export default mongoose.model("ChatMessage", chatMessageSchema);
