import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";

// Applica animazioni/effetti speciali sovrapposti al video
function EffectsLayer({ effects }) {
  const [activeEffects, setActiveEffects] = useState([]);

  useEffect(() => {
    // Applica ogni effetto come classe CSS temporanea
    const timers = [];
    (effects || []).forEach((fx, idx) => {
      const dur = fx.duration || 1200;
      const id = `${fx.type}-${idx}-${Date.now()}`;
      const t = setTimeout(() => {
        setActiveEffects((prev) => [...prev, id]);
      }, idx * 600);
      const t2 = setTimeout(() => {
        setActiveEffects((prev) => prev.filter((x) => x !== id));
      }, idx * 600 + dur);
      timers.push(t, t2);
    });
    return () => timers.forEach((t) => clearTimeout(t));
  }, [effects]);

  return (
    <div className="effects-layer">
      {activeEffects.map((id) => {
        const [type] = id.split("-");
        return <div key={id} className={`effect effect-${type}`} />;
      })}
    </div>
  );
}

export default function PublicBoardPopup({ narration }) {
  const [videoMap, setVideoMap] = useState({});
  const playing = narration?.overlayActive && narration?.player?.status === "playing";

  useEffect(() => {
    if (!playing) return;
    (async () => {
      try {
        const json = await apiRequest("/api/videos");
        if (json.ok) {
          const map = {};
          json.data.forEach((v) => (map[v._id] = v));
          setVideoMap(map);
        }
      } catch (e) {
        // ignora
      }
    })();
  }, [playing]);

  if (!playing) return null;

  const video = narration?.player?.videoId ? videoMap[narration.player.videoId] : null;

  return (
    <div className="public-overlay">
      <EffectsLayer effects={video?.effects || []} />
      {video ? (
        <video
          className="overlay-video"
          src={video.source}
          autoPlay
          playsInline
          controls={false}
          muted={false}
        />
      ) : (
        <div className="overlay-placeholder">
          <h1>{narration.player.videoName || "In riproduzione"}</h1>
        </div>
      )}
    </div>
  );
}
