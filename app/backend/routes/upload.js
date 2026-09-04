import { Router } from "express";
import { randomBytes } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { authenticate, requireRoles } from "../services/authMiddleware.js";

const router = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

const MIME_EXT = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/x-msvideo": ".avi",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/ogg": ".ogg",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp"
};

function guessExtension(dataUri, resourceType) {
  if (dataUri.startsWith("data:")) {
    const mime = dataUri.split(";")[0].split(":").pop();
    if (MIME_EXT[mime]) return MIME_EXT[mime];
  }
  if (resourceType === "video") return ".mp4";
  if (resourceType === "image") return ".png";
  return ".bin";
}

router.get("/config", authenticate, async (_req, res) => {
  res.json({
    ok: true,
    data: { configured: true, provider: "local", uploadDir: UPLOAD_DIR }
  });
});

router.post("/", authenticate, requireRoles("admin", "director", "video", "audio"), async (req, res) => {
  try {
    const { file, resourceType = "auto", mediaType = "", gameId } = req.body || {};
    if (!file) {
      return res.status(400).json({ ok: false, message: "File mancante" });
    }

    const dir = join(UPLOAD_DIR, ...[gameId, mediaType].filter(Boolean));
    await mkdir(dir, { recursive: true });

    const raw = file.includes(",") ? file.split(",").pop() : file;
    const buf = Buffer.from(raw, "base64");

    const ext = guessExtension(file, resourceType);
    const name = `${Date.now()}_${randomBytes(6).toString("hex")}${ext}`;
    await writeFile(join(dir, name), buf);

    const url = `/uploads/${[gameId, mediaType].filter(Boolean).join("/")}/${name}`;
    res.json({ ok: true, data: { url, filename: name } });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

export default router;
