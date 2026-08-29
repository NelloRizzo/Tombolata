import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";

export default function GameManager({ game }) {
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [newName, setNewName] = useState("");
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
        body: JSON.stringify({ name: newName.trim() || undefined })
      });
      setNewName("");
      setShowHistory(false);
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
              placeholder="Nome nuova partita"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button className="btn-sm btn-accent" onClick={createGame}>
              Nuova
            </button>
          </div>

          {error && <div className="error-text">{error}</div>}

          <div className="gm-list">
            {history.length === 0 && <p className="empty">Nessuna partita</p>}
            {history.map((g) => {
              const active = game && g._id === game._id;
              return (
                <div key={g._id} className={`gm-item ${active ? "active" : ""}`}>
                  <div className="gm-item-info">
                    <span className="gm-name">{g.name}</span>
                    <span className="gm-sub">
                      {g.boards.length} cartelle · {g.extractedNumbers.length} estratti
                      {g.status === "finished" ? " · chiusa" : active ? " · in corso" : ""}
                    </span>
                  </div>
                  {!active && (
                    <button className="btn-sm" onClick={() => selectGame(g._id)}>
                      Apri
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
