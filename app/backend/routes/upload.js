import { Router } from "express";
import { authenticate, requireRoles } from "../services/authMiddleware.js";
import { uploadBase64, isCloudinaryConfigured, getCloudinaryConfig } from "../services/cloudinary.js";

const router = Router();

// Config / stato Cloudinary (per mostrare lo stato nella console)
router.get("/config", authenticate, async (req, res) => {
  res.json({ ok: true, data: getCloudinaryConfig() });
});

// Upload di un file media. Il body contiene:
//   { file: "<base64>", resourceType: "video"|"image"|"auto"|"raw",
//     mediaType: "videos"|"sounds", gameId?: "<id partita>" }
// I file finiscono in: tombola/<gameId>/<mediaType>  (oppure tombola/<mediaType>)
// Restituisce { secure_url, public_id, resource_type, ... }
router.post("/", authenticate, requireRoles("admin", "regista", "video", "fonico"), async (req, res) => {
  try {
    if (!isCloudinaryConfigured()) {
      return res.status(500).json({ ok: false, message: "Cloudinary non configurato nel backend" });
    }
    const { file, resourceType = "auto", mediaType = "", gameId } = req.body || {};
    if (!file) {
      return res.status(400).json({ ok: false, message: "File mancante" });
    }
    const parts = ["tombola"];
    if (gameId) parts.push(gameId);
    if (mediaType) parts.push(mediaType);
    // Rimuovi eventuale prefisso data URI (es. "data:video/mp4;base64,")
    const pure = file.includes(",") ? file.split(",").pop() : file;
    const result = await uploadBase64(pure, { resourceType, folder: parts.join("/") });
    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

export default router;
