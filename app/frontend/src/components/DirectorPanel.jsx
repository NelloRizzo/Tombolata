import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";
import GameManager from "./GameManager.jsx";
import ConfirmModal from "./ConfirmModal.jsx";

// Fasi sequenziali (riflettono l'andamento delle vincite).
const SEQUENTIAL_PHASES = [
  { value: "prologue", label: "Prologo" },
  { value: "post-ambo", label: "Post-Ambo" },
  { value: "post-terno", label: "Post-Terno" },
  { value: "post-quaterna", label: "Post-Quaterna" },
  { value: "post-cinquina", label: "Post-Cinquina" },
  { value: "finale", label: "Finale" }
];

// Fasi a toggle: quando sono attive, un nuovo click le disattiva tornando
// alla fase sequenziale precedentemente attiva.
const TOGGLE_PHASES = [
  { value: "spareggio", label: "Spareggio" },
  { value: "live", label: "Live" }
];

// Ordine di avanzamento manuale della sequenza vincite.
const PHASE_ORDER = SEQUENTIAL_PHASES.map((p) => p.value);

const WIN_ORDER = ["ambo", "terno", "quaterna", "cinquina", "tombola"];

export default function DirectorPanel({ ws, gameId }) {
  const { game, narration, firedTriggers } = ws;
  const [triggers, setTriggers] = useState([]);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);
  const [prevStack, setPrevStack] = useState([]);
  const [confirmClaim, setConfirmClaim] = useState(false);

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

  // Imposta una fase. Prologue…finale sono sequenziali; spareggio e live sono
  // toggle: quando già attivi, un nuovo click li disattiva tornando alla fase
  // che era attiva prima dell'attivazione (pila LIFO di rientro).
  async function setPhase(phase) {
    setError(null);
    const current = narration?.phase;
    const isToggle = TOGGLE_PHASES.some((t) => t.value === phase);
    // Toccolo il toggle già attivo → lo disattivo e torno alla fase di rientro.
    if (isToggle && current === phase) {
      const stack = [...prevStack];
      const back = stack.pop() || "finale";
      setPrevStack(stack);
      try {
        await apiRequest("/api/triggers/phase", {
          method: "POST",
          body: bodyRef({ phase: back })
        });
      } catch (e) {
        setError(e.message);
      }
      return;
    }
    try {
      // Toggle attivato: memorizza la fase da cui si è partiti (LIFO).
      if (isToggle) {
        setPrevStack((s) => [...s, current].filter(Boolean));
      } else {
        // Fase sequenziale: azzera ogni rientro precedente.
        setPrevStack([]);
      }
      await apiRequest("/api/triggers/phase", {
        method: "POST",
        body: bodyRef({ phase })
      });
    } catch (e) {
      setError(e.message);
    }
  }

  // Avanza manualmente lungo la sequenza vincite (prologue → … → finale).
  // Se la fase corrente è un toggle (spareggio/live), si prosegue dalla fase
  // che era attiva prima del toggle.
  async function advancePhase() {
    const current = narration?.phase || "prologue";
    const base = PHASE_ORDER.includes(current)
      ? current
      : (prevStack[prevStack.length - 1] || "prologue");
    const idx = PHASE_ORDER.indexOf(base);
    const next = PHASE_ORDER[Math.min(idx + 1, PHASE_ORDER.length - 1)];
    setPrevStack([]);
    await setPhase(next);
  }

  // Prossima vincita da reclamare (prima in ambo → … → tombola non ancora registrata).
  const won = new Set(game?.wonTypes || []);
  const nextWin = WIN_ORDER.find((w) => !won.has(w));

  // Reclama la vincita via endpoint dedicato: registra wonTypes/lastWin e
  // porta automaticamente la narrazione alla fase corrispondente.
  async function claimWin() {
    setError(null);
    if (!nextWin) {
      setError("Tutte le vincite sono già state reclamate");
      return;
    }
    try {
      await apiRequest(`/api/game/${ref}/claim-win`, {
        method: "POST",
        body: JSON.stringify({ winType: nextWin })
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setConfirmClaim(false);
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
              onClick={advancePhase}
              title="Passa alla fase successiva (fino a Live)"
            >
              Avanza fase ▸
            </button>
            <span className="phase-current">Corrente: {narration?.phase || "-"}</span>
          </div>
          <div className="phase-claimed">
            Vincite reclamate: {(game?.wonTypes || []).join(", ") || <em>nessuna</em>}
            {nextWin && <> · prossima: <strong>{nextWin}</strong></>}
          </div>
          <div className="phase-advance">
            <button
              className="btn-sm btn-accent"
              onClick={() => setConfirmClaim(true)}
              disabled={!nextWin || !ref}
              title="Registra la vincita (wonTypes/lastWin) e porta la narrazione alla fase corrispondente"
            >
              Reclama Vincita {nextWin ? `(${nextWin})` : ""}
            </button>
          </div>
          <div className="phase-buttons">
            {SEQUENTIAL_PHASES.map((p) => (
              <button
                key={p.value}
                className={`phase-btn ${narration?.phase === p.value ? "active" : ""}`}
                onClick={() => setPhase(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="phase-buttons phase-toggles">
            {TOGGLE_PHASES.map((p) => {
              const active = narration?.phase === p.value;
              return (
                <button
                  key={p.value}
                  className={`phase-btn ${active ? "phase-toggle-active" : ""}`}
                  onClick={() => setPhase(p.value)}
                  title={active ? `Disattiva ${p.label} e torna a ${prevStack[prevStack.length - 1] || "finale"}` : `Attiva ${p.label}`}
                >
                  {active ? "⬤" : "○"} {p.label}
                </button>
              );
            })}
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
        open={confirmClaim}
        title="Reclama vincita"
        message={`Confermi la vincita "${nextWin}"? Registra la vincita e porta la fase a ${
          { ambo: "post-ambo", terno: "post-terno", quaterna: "post-quaterna", cinquina: "post-cinquina", tombola: "finale" }[nextWin] || nextWin
        }.`}
        confirmLabel="Reclama"
        onConfirm={claimWin}
        onCancel={() => setConfirmClaim(false)}
      />
    </div>
  );
}
