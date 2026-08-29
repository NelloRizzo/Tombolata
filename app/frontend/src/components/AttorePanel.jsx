import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest } from "../api.js";

export default function AttorePanel({ ws }) {
  const { user } = useAuth();
  const { firedTriggers } = ws;
  const [triggers, setTriggers] = useState([]);
  const [done, setDone] = useState({});
  const [error, setError] = useState(null);

  // Copie locali segnate come eseguite (per sessione)
  const character = user?.character;

  async function load() {
    try {
      const json = await apiRequest("/api/triggers");
      if (json.ok) setTriggers(json.data);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [character]);

  return (
    <div className="attore-panel">
      <div className="panel-block">
        <h2>Cue per il tuo personaggio</h2>
        {character ? <p className="empty">Personaggio: <strong>{character}</strong></p>
          : <p className="empty">Nessun personaggio assegnato al tuo account.</p>}

        {error && <div className="error-text">{error}</div>}

        <div className="cue-list">
          {triggers.length === 0 && <p className="empty">Nessun cue attivo per te.</p>}
          {triggers.map((t) => (
            <div className={`cue-item ${done[t._id] ? "done" : ""}`} key={t._id}>
              <div className="cue-info">
                <span className="cue-name">{t.name}</span>
                <span className="cue-phase">({t.phase})</span>
                {t.description && <span className="cue-desc">{t.description}</span>}
              </div>
              <button
                className={`btn-sm ${done[t._id] ? "btn-ghost" : "btn-accent"}`}
                onClick={() => setDone((d) => ({ ...d, [t._id]: !d[t._id] }))}
              >
                {done[t._id] ? "Da rifare" : "Fatto"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-block">
        <h2>Eventi recenti della serata</h2>
        {firedTriggers.length === 0 && <p className="empty">Nessun evento ancora</p>}
        {firedTriggers.map((e, i) => (
          <div className="fired-item" key={i}>
            <span className="fired-name">{e.name || e.actionType}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
