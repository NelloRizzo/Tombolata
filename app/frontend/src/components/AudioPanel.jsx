import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";
import MediaUpload from "./MediaUpload.jsx";
import { playExtract, playWin, playWrong, playSound } from "../utils/audio.js";

// Pulsanti sonori fissi (file MP3 scaricati in public/sounds/).
const QUICK_SOUNDS = [
  { key: "extract", label: "Estrazione", icon: "🎰", fn: playExtract },
  { key: "win", label: "Vincita", icon: "🎉", fn: playWin },
  { key: "wrong", label: "Vin. sbagliata", icon: "👎", fn: playWrong }
];

const DEFAULT_ICON = "🔊";

export default function AudioPanel({ ws, gameId }) {
  const { game } = ws;
  const [sounds, setSounds] = useState([]);
  const [error, setError] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const [quickPlaying, setQuickPlaying] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", icon: "", fileUrl: "" });

  const ref = gameId || game?._id || null;

  function playQuick(key) {
    const item = QUICK_SOUNDS.find((s) => s.key === key);
    if (!item) return;
    setQuickPlaying(key);
    setTimeout(() => setQuickPlaying(null), 1200);
    item.fn();
  }

  async function load() {
    try {
      const json = await apiRequest("/api/sounds");
      if (json.ok) setSounds(json.data);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function playCustom(s) {
    setPlayingId(s._id);
    setTimeout(() => setPlayingId(null), 1200);
    playSound(s);
  }

  async function create() {
    setError(null);
    if (!form.name.trim() || !form.fileUrl.trim()) {
      setError("Nome e URL del file audio sono obbligatori");
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        category: "remoto",
        kind: "file",
        fileUrl: form.fileUrl.trim(),
        icon: form.icon.trim() || DEFAULT_ICON,
        gameId: ref || null
      };
      const json = await apiRequest("/api/sounds", { method: "POST", body: JSON.stringify(payload) });
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
      await apiRequest(`/api/sounds/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  const customSounds = sounds.filter((s) => s.kind === "file");

  return (
    <div className="audio-panel">
      {error && <div className="error-banner">{error}</div>}

      <div className="panel-block">
        <h2>Effetti fissi</h2>
        <p className="empty">
          Estratti: {game?.extractedNumbers?.length || 0}/90 — Suona i tuoi effetti sonori
        </p>
        <div className="quick-sounds">
          {QUICK_SOUNDS.map((s) => (
            <button
              key={s.key}
              className={`quick-sound ${quickPlaying === s.key ? "playing" : ""}`}
              onClick={() => playQuick(s.key)}
              title={s.label}
            >
              <span className="quick-icon">{s.icon}</span>
              <span className="quick-label">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-block">
        <div className="panel-block-head">
          <h2>Suoni caricati</h2>
          <button className="btn-sm btn-accent" onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? "Chiudi" : "+ Carica suono"}
          </button>
        </div>

        {showAdd && (
          <div className="admin-form sound-add-form">
            <input
              placeholder="Nome del suono"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              placeholder="Icona (emoji, es. 🎺)"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
            />
            <input
              placeholder="URL file audio"
              value={form.fileUrl}
              onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
            />
            <MediaUpload
              label="Carica audio da remoto"
              resourceType="video"
              mediaType="sounds"
              gameId={ref}
              onUploaded={(url) => setForm((f) => ({ ...f, fileUrl: url }))}
            />
            <button className="btn-sm btn-accent" onClick={create}>Aggiungi suono</button>
          </div>
        )}

        <div className="sound-grid">
          {customSounds.length === 0 && !showAdd && (
            <p className="empty">Nessun suono caricato da remoto</p>
          )}
          {customSounds.map((s) => (
            <div className={`sound-card ${playingId === s._id ? "playing" : ""}`} key={s._id}>
              <button className="sound-card-btn" onClick={() => playCustom(s)}>
                <span className="sound-card-icon">{s.icon || DEFAULT_ICON}</span>
                <span className="sound-card-name">{s.name}</span>
              </button>
              <button className="sound-card-remove" title="Rimuovi" onClick={() => remove(s._id)}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
