import { useState } from "react";
import { apiRequest } from "../api.js";

// Input file che carica il media su disco via /api/upload (base64).
// onUploaded(url) viene chiamato quando l'upload riesce.
// resourceType: "video" | "image" | "auto" | "raw".
// mediaType: "videos" | "sounds" (sottocartella upload).
// gameId: partita a cui appartiene il file (sottocartella upload/<gameId>/<mediaType>).
export default function MediaUpload({ label, resourceType = "auto", mediaType = "", gameId = null, onUploaded }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleFile(file) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const pure = base64.split(",").pop();
      const json = await apiRequest("/api/upload", {
        method: "POST",
        body: JSON.stringify({ file: pure, resourceType, mediaType, gameId })
      });
      onUploaded(json.data.url);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="media-upload">
      <input
        type="file"
        accept={resourceType === "video" ? "video/*" : resourceType === "image" ? "image/*" : "*/*"}
        disabled={busy}
        onChange={(e) => handleFile(e.target.files && e.target.files[0])}
      />
      {busy ? "Caricamento…" : label}
      {error && <span className="media-upload-error">{error}</span>}
    </label>
  );
}
