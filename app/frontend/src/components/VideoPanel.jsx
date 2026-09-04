import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";
import MediaUpload from "./MediaUpload.jsx";

const DEFAULT_ICON = "📽️";

export default function VideoPanel({ ws, gameId }) {
  const { narration } = ws;
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", icon: "", fileUrl: "" });

  const ref = gameId || ws.game?._id || null;
  const withRef = { method: "POST", body: ref ? JSON.stringify({ gameId: ref }) : undefined };

  async function load() {
    try {
      const q = ref ? `?gameId=${ref}` : "";
      const json = await apiRequest(`/api/videos${q}`);
      if (json.ok) setVideos(json.data);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [ref]);

  async function create() {
    setError(null);
    if (!form.name.trim() || !form.fileUrl.trim()) {
      setError("Nome e URL del file video sono obbligatori");
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        source: form.fileUrl.trim(),
        icon: form.icon.trim() || DEFAULT_ICON,
        gameId: ref || null
      };
      const json = await apiRequest("/api/videos", { method: "POST", body: JSON.stringify(payload) });
      if (!json.ok) throw new Error(json.message || "Errore salvataggio");
      setForm({ name: "", icon: "", fileUrl: "" });
      setShowAdd(false);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(id) {
    try {
      await apiRequest(`/api/videos/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function play(id) {
    setPlayingId(id);
    setTimeout(() => setPlayingId(null), 1500);
    setError(null);
    try {
      await apiRequest(`/api/videos/${id}/play`, withRef);
    } catch (e) {
      setError(e.message);
    }
  }

  async function control(action) {
    setError(null);
    try {
      await apiRequest(`/api/videos/${action}`, withRef);
    } catch (e) {
      setError(e.message);
    }
  }

  const status = narration?.player?.status || "idle";

  return (
    <div className="video-panel">
      {error && <div className="error-banner">{error}</div>}

      <div className="panel-block">
        <h2>Controllo riproduzione</h2>
        <div className="player-status">
          Stato: <strong>{status}</strong>{" "}
          {narration?.player?.videoName && `— ${narration.player.videoName}`}
          {status === "playing" && (
            <span className="player-clock">
              {" "}⏱ {new Date(narration?.player?.clockMs || 0).toISOString().substr(11, 8)}
            </span>
          )}
          {status === "ended" && " — terminato, chiudi l'overlay"}
        </div>
        <div className="player-controls">
          {status === "playing" && (
            <button className="btn-sm" onClick={() => control("pause")}>Pausa</button>
          )}
          {status === "paused" && (
            <button className="btn-sm btn-accent" onClick={() => control("resume")}>Riprendi</button>
          )}
          <button className="btn-sm btn-ghost" onClick={() => control("stop")}>Stop</button>
        </div>
      </div>

      <div className="panel-block">
        <div className="panel-block-head">
          <h2>Video caricati</h2>
          <button className="btn-sm btn-accent" onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? "Chiudi" : "+ Carica video"}
          </button>
        </div>

        {showAdd && (
          <div className="admin-form video-add-form">
            <input
              placeholder="Nome del video"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              placeholder="Icona (emoji, es. 🎬)"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
            />
            <input
              placeholder="URL file video"
              value={form.fileUrl}
              onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
            />
            <MediaUpload
              label="Carica video"
              resourceType="video"
              mediaType="videos"
              gameId={ref}
              onUploaded={(url) => setForm((f) => ({ ...f, fileUrl: url }))}
            />
            <button className="btn-sm btn-accent" onClick={create}>Aggiungi video</button>
          </div>
        )}

        <div className="sound-grid">
          {videos.length === 0 && !showAdd && (
            <p className="empty">Nessun video caricato</p>
          )}
          {videos.map((v) => (
            <div className={`sound-card ${playingId === v._id ? "playing" : ""}`} key={v._id}>
              <button className="sound-card-btn" onClick={() => play(v._id)}>
                <span className="sound-card-icon">{v.icon || DEFAULT_ICON}</span>
                <span className="sound-card-name">{v.name}</span>
              </button>
              <button className="sound-card-remove" title="Rimuovi" onClick={() => remove(v._id)}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
