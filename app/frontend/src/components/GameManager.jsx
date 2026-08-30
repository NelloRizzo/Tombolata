import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";

export default function GameManager({ game }) {
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newScheduled, setNewScheduled] = useState("");
  const [error, setError] = useState(null);

  async function refresh() {
    try {
      const json = await apiRequest("/api/game/history");
      if (json.ok) setHistory(json.data);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    refresh();
  }, [game]);

  async function createGame() {
    setError(null);
    try {
      const json = await apiRequest("/api/game/start", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim() || undefined,
          description: newDesc.trim() || undefined,
          scheduledAt: newScheduled ? new Date(newScheduled).toISOString() : undefined
        })
      });
      setNewName("");
      setNewDesc("");
      setNewScheduled("");
      setShowHistory(false);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function selectGame(id) {
    setError(null);
    try {
      await apiRequest(`/api/game/${id}/select`, { method: "POST" });
      setShowHistory(false);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="game-manager">
      <button className="btn-sm" onClick={() => setShowHistory((v) => !v)}>
        Partite
      </button>

      {showHistory && (
        <div className="game-manager-panel">
          <div className="gm-new">
            <input
              type="text"
              placeholder="Nome partita"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Descrizione"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <label className="gm-date-label">
              Inizia il (opzionale)
              <input
                type="datetime-local"
                value={newScheduled}
                onChange={(e) => setNewScheduled(e.target.value)}
              />
            </label>
            <button className="btn-sm btn-accent" onClick={createGame}>
              Nuova
            </button>
          </div>

          {error && <div className="error-text">{error}</div>}

          <div className="gm-list">
            {history.length === 0 && <p className="empty">Nessuna partita</p>}
            {history.map((g) => {
              const active = game && g._id === game._id;
              const sub = [
                g.scheduledAt
                  ? new Date(g.scheduledAt).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                  : null,
                g.status === "scheduled" ? "programmata" : null,
                g.status === "finished" ? "chiusa" : null,
                active ? "in corso" : null
              ].filter(Boolean).join(" · ");
              return (
                <div key={g._id} className={`gm-item ${active ? "active" : ""}`}>
                  <div className="gm-item-info">
                    <span className="gm-name">{g.name}</span>
                    <span className="gm-sub">
                      {g.boards.length} cartelle · {g.extractedNumbers.length} estratti · {g.actors ? g.actors.length : 0} attori
                      {sub ? " · " + sub : ""}
                    </span>
                  </div>
                  {!active && (
                    <button className="btn-sm" onClick={() => selectGame(g._id)}>
                      {g.status === "scheduled" ? "Attiva" : "Apri"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
