import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";

export default function VideoPanel({ ws, gameId }) {
  const { narration } = ws;
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);

  const ref = gameId || ws.game?._id || null;
  const withRef = { method: "POST", body: ref ? JSON.stringify({ gameId: ref }) : undefined };

  async function load() {
    try {
      const json = await apiRequest("/api/videos");
      if (json.ok) setVideos(json.data);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [narration?.player?.status]);

  async function play(id) {
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
        <h2>Libreria video</h2>
        <div className="video-list">
          {videos.length === 0 && <p className="empty">Nessun video configurato</p>}
          {videos.map((v) => (
            <div className="video-item" key={v._id}>
              <span className="video-name">{v.name}</span>
              <button className="btn-sm btn-accent" onClick={() => play(v._id)}>
                Riproduci
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
