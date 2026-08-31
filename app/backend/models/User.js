import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, default: "" },
    roles: {
      type: [String],
      enum: ["admin", "director", "video", "audio", "drawer", "actor"],
      default: []
    },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
