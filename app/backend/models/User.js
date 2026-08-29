import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, default: "" },
    roles: {
      type: [String],
      enum: ["admin", "regista", "video", "fonico", "drawer", "spettatore", "attore"],
      default: ["spettatore"]
    },
    // Solo per ruolo "attore": personaggio interpretato (da personaggi.md)
    character: { type: String, default: null },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
