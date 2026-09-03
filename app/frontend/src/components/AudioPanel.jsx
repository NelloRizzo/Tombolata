import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";
import { playExtract, playWin, playWrong } from "../utils/audio.js";

// Pulsanti sonori fissi (file MP3 scaricati in public/sounds/).
const QUICK_SOUNDS = [
  { key: "extract", label: "Estrazione", fn: playExtract },
  { key: "win", label: "Vincita", fn: playWin },
  { key: "wrong", label: "Vincita sbagliata", fn: playWrong }
];

export default function AudioPanel({ ws, gameId }) {
  const { game } = ws;
  const [sounds, setSounds] = useState([]);
  const [error, setError] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const [quickPlaying, setQuickPlaying] = useState(null);

  const ref = gameId || game?._id || null;

  function playQuick(key) {
    const item = QUICK_SOUNDS.find((s) => s.key === key);
    if (!item) return;
    setQuickPlaying(key);
    setTimeout(() => setQuickPlaying(null), 800);
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

  async function triggerSound(id) {
    setError(null);
    try {
      const json = await apiRequest(`/api/sounds/${id}/play`, {
        method: "POST",
        body: ref ? JSON.stringify({ gameId: ref }) : undefined
      }).catch(() => null);
      setPlayingId(id);
      setTimeout(() => setPlayingId(null), 2000);
      if (!json) {
        // endpoint play non presente: segnaliamo localmente
        setSounds((prev) => prev.map((s) => (s._id === id ? { ...s, local: true } : s)));
      }
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="audio-panel">
      {error && <div className="error-banner">{error}</div>}
      <div className="panel-block">
        <h2>Console audio</h2>
        <p className="empty">
          Estratti: {game?.extractedNumbers?.length || 0}/90 — Suona le clip e gli effetti sonori
        </p>
        <div className="quick-sounds">
          {QUICK_SOUNDS.map((s) => (
            <button
              key={s.key}
              className={`btn quick-sound ${quickPlaying === s.key ? "playing" : ""}`}
              onClick={() => playQuick(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="sound-list">
          {sounds.length === 0 && <p className="empty">Nessun suono configurato</p>}
          {sounds.map((s) => (
            <div className={`sound-item ${playingId === s._id ? "playing" : ""}`} key={s._id}>
              <div className="sound-info">
                <span className="sound-name">{s.name}</span>
                <span className="sound-cat">[{s.category}]</span>
              </div>
              <button className="btn-sm btn-accent" onClick={() => triggerSound(s._id)}>
                Suona
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
