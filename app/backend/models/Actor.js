import mongoose from "mongoose";

const actorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // es. Totonno
    description: { type: String, default: "" },
    object: { type: String, default: "" }, // oggetto personale
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("Actor", actorSchema);
