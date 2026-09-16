import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";

const EXIT_MS = 700;

// Applica animazioni/effetti speciali sovrapposti al video
function EffectsLayer({ effects }) {
  const [activeEffects, setActiveEffects] = useState([]);

  useEffect(() => {
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

export default function PublicBoardPopup({ narration, gameId }) {
  const [videoMap, setVideoMap] = useState({});
  const playing = narration?.overlayActive && narration?.player?.status === "playing";

  const [lastNarration, setLastNarration] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (playing) setLastNarration(narration);
  }, [playing, narration]);

  useEffect(() => {
    if (playing) {
      setMounted(true);
      setLeaving(false);
    }
  }, [playing]);

  useEffect(() => {
    if (!playing && mounted) {
      setLeaving(true);
      const t = setTimeout(() => setMounted(false), EXIT_MS);
      return () => clearTimeout(t);
    }
  }, [playing, mounted]);

  useEffect(() => {
    if (!playing) return;
    (async () => {
      try {
        const qs = gameId ? `?gameId=${encodeURIComponent(gameId)}` : "";
        const json = await apiRequest(`/api/videos${qs}`);
        if (json.ok) {
          const map = {};
          json.data.forEach((v) => (map[v._id] = v));
          setVideoMap(map);
        }
      } catch (e) {
        // ignora
      }
    })();
  }, [playing, gameId]);

  if (!mounted && !playing) return null;

  const data = playing ? narration : lastNarration;
  const video = data?.player?.videoId ? videoMap[data.player.videoId] : null;

  function handleEnded() {
    const body = {};
    if (video) body.autoCloseOnEnd = video.autoCloseOnEnd;
    body.gameId = data?.gameId || gameId || null;
    apiRequest("/api/videos/ended", {
      method: "POST",
      body: JSON.stringify(body)
    }).catch(() => {});
  }

  const clockMs = data?.player?.clockMs || 0;

  return (
    <div className={`public-overlay ${leaving ? "leaving" : "entering"}`}>
      <EffectsLayer effects={video?.effects || []} />
      <div className="overlay-clock">
        {new Date(clockMs).toISOString().substr(11, 8)}
      </div>
      {video ? (
        <video
          className="overlay-video"
          src={video.source}
          autoPlay
          playsInline
          controls={false}
          muted={false}
          onEnded={handleEnded}
        />
      ) : (
        <div className="overlay-placeholder">
          <h1>{data?.player?.videoName || "In riproduzione"}</h1>
        </div>
      )}
    </div>
  );
}
