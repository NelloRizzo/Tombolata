import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";
import GameManager from "./GameManager.jsx";
import ConfirmModal from "./ConfirmModal.jsx";

const PHASES = [
  { value: "prologue", label: "Prologo" },
  { value: "post-ambo", label: "Post-Ambo" },
  { value: "post-terno", label: "Post-Terno" },
  { value: "post-quaterna", label: "Post-Quaterna" },
  { value: "post-cinquina", label: "Post-Cinquina" },
  { value: "finale", label: "Finale" },
  { value: "live", label: "Live" }
];

const WIN_ORDER = ["ambo", "terno", "quaterna", "cinquina", "tombola"];

export default function DirectorPanel({ ws, gameId }) {
  const { game, narration, firedTriggers } = ws;
  const [triggers, setTriggers] = useState([]);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);
  const [confirmClaim, setConfirmClaim] = useState(null);

  // Prossima vincita da reclamare (ambo → … → tombola) in base a quelle già ottenute.
  const nextClaim =
    game?.wonTypes?.length >= WIN_ORDER.length
      ? null
      : WIN_ORDER.find((w) => !(game?.wonTypes || []).includes(w));

  const ref = gameId || game?._id || null;
  const bodyRef = (extra = {}) => JSON.stringify({ ...extra, ...(ref ? { gameId: ref } : {}) });

  async function load() {
    try {
      const q = ref ? `?gameId=${ref}` : "";
      const [t, v] = await Promise.all([
        apiRequest(`/api/triggers${q}`),
        apiRequest(`/api/videos${q}`)
      ]);
      if (t.ok) setTriggers(t.data);
      if (v.ok) setVideos(v.data);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [narration?.phase, ref]);

  async function fire(id) {
    setError(null);
    try {
      await apiRequest(`/api/triggers/${id}/fire`, { method: "POST", body: bodyRef() });
    } catch (e) {
      setError(e.message);
    }
  }

  async function setPhase(phase) {
    setError(null);
    try {
      await apiRequest("/api/triggers/phase", {
        method: "POST",
        body: bodyRef({ phase })
      });
    } catch (e) {
      setError(e.message);
    }
  }

  // Ultima vincita reclamata finora (ultima presente in game.wonTypes, che è
  // mantenuto in ordine cronologico).
  const lastClaimed = (game?.wonTypes?.length ? game.wonTypes[game.wonTypes.length - 1] : null)
    ? game.wonTypes[game.wonTypes.length - 1]
    : null;

  // Conferma e reclama la vincita segnalata (ambo → terno → quaterna →
  // cinquina → tombola), poi la narrazione passa automaticamente alla fase
  // corrispondente. Il modale evita i reclami per errore.
  async function claimWin() {
    setError(null);
    setConfirmClaim(null);
    try {
      await apiRequest(`/api/game/${ref}/claim-win`, {
        method: "POST",
        body: bodyRef()
      });
    } catch (e) {
      setError(e.message);
    }
  }

  async function playVideo(id) {
    setError(null);
    try {
      await apiRequest(`/api/videos/${id}/play`, { method: "POST", body: ref ? JSON.stringify({ gameId: ref }) : undefined });
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="director-panel">
      {error && <div className="error-banner">{error}</div>}

      <div className="panel-block">
        <div className="panel-title">
          <h2>Partite</h2>
        </div>
        <GameManager game={game} />
      </div>

      <div className="panel-grid">
        <div className="panel-block">
          <h2>Fase narrativa</h2>
          <div className="phase-advance">
            <button
              className="btn-sm btn-accent"
              onClick={() => setConfirmClaim(nextClaim)}
              disabled={!nextClaim}
              title={nextClaim ? `Reclama la vincita "${nextClaim}"` : "Tutte le vincite sono già state reclamate"}
            >
              Reclama Vincita
            </button>
            <span className="phase-current">Corrente: {narration?.phase || "-"}</span>
          </div>
          <div className="phase-claimed">
            Ultima vincita reclamata: {lastClaimed ? <strong>{lastClaimed}</strong> : <em>nessuna</em>}
          </div>
          <div className="phase-buttons">
            {PHASES.map((p) => (
              <button
                key={p.value}
                className={`phase-btn ${narration?.phase === p.value ? "active" : ""}`}
                onClick={() => setPhase(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="panel-block">
          <h2>Video disponibili</h2>
          <div className="video-list">
            {videos.length === 0 && <p className="empty">Nessun video configurato</p>}
            {videos.map((v) => (
              <div className="video-item" key={v._id}>
                <span className="video-name">{v.name}</span>
                <button className="btn-sm btn-accent" onClick={() => playVideo(v._id)}>
                  Riproduci
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel-block">
        <h2>Trigger manuali</h2>
        <div className="trigger-list">
          {triggers.length === 0 && <p className="empty">Nessun trigger configurato</p>}
          {triggers.map((t) => (
            <div className="trigger-item" key={t._id}>
              <div className="trigger-info">
                <span className="trigger-name">{t.name}</span>
                <span className="trigger-phase">({t.phase})</span>
                <span className="trigger-action">{t.actionType}</span>
                {t.fired > 0 && <span className="trigger-fired">x{t.fired}</span>}
              </div>
              <button className="btn-sm btn-accent" onClick={() => fire(t._id)}>
                Attiva
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-block">
        <h2>Eventi attivati</h2>
        <div className="fired-log">
          {firedTriggers.length === 0 && <p className="empty">Nessun evento ancora</p>}
          {firedTriggers.map((e, i) => (
            <div className="fired-item" key={i}>
              <span className="fired-name">{e.name || e.actionType}</span>
              <span className="fired-src">[{e.source || "-"}]</span>
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal
        open={!!confirmClaim}
        title="Reclama la vincita?"
        message={`Confermi la vincita "${confirmClaim}" in sala? La narrazione passerà automaticamente alla fase corrispondente.`}
        confirmLabel="Conferma vincita"
        onCancel={() => setConfirmClaim(null)}
        onConfirm={claimWin}
      />
    </div>
  );
}
