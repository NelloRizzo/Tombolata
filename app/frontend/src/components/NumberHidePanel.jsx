import { useState } from "react";
import { apiRequest } from "../api.js";

// "Il numero nascosto" (Regia): il regista imposta griglia e numero segreto,
// avvia il gioco sul tabellone; quando il pubblico ha scelto la casella, il
// regista rivela dov'era nascosto il numero. Niente controllo vincite: chi
// indovina (a voce) è un vincitore.
export default function NumberHidePanel({ ws, gameId }) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(4);
  const [hiddenNumber, setHiddenNumber] = useState(13);
  const [presentSeconds, setPresentSeconds] = useState(10);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const active = ws.minigame?.overlayActive && ws.minigame?.type === "numberHide";
  const g = ws.minigame;
  const running = active && g?.status === "running";
  const revealed = Boolean(g?.revealed);

  const body = (extra = {}) =>
    JSON.stringify({ ...extra, rows, cols, hiddenNumber, presentSeconds, ...(gameId ? { gameId } : {}) });

  async function start() {
    setError(null);
    setBusy(true);
    try {
      await apiRequest("/api/games/numberhide/start", { method: "POST", body: body() });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setError(null);
    setBusy(true);
    try {
      await apiRequest("/api/games/numberhide/stop", {
        method: "POST",
        body: gameId ? JSON.stringify({ gameId }) : undefined
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function reveal() {
    setError(null);
    setBusy(true);
    try {
      await apiRequest("/api/games/numberhide/reveal", {
        method: "POST",
        body: gameId ? JSON.stringify({ gameId }) : undefined
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="game-panel">
      {error && <div className="error-text">{error}</div>}
      {active ? (
        <div className="game-active">
          {running && (
            <p className="empty">
              Griglia {g?.rows || rows}×{g?.cols || cols} a colori sul tabellone, un numero nascosto
              {revealed ? <>: <strong>{g?.hiddenNumber}</strong></> : "."}
            </p>
          )}
          {!running && <p className="empty">Gioco concluso sul tabellone.</p>}
          <button
            className="btn-sm btn-accent"
            onClick={reveal}
            disabled={busy || !running || revealed}
          >
            {revealed ? "Numero rivelato" : "Rivela il numero nascosto"}
          </button>
          <button className="btn-sm btn-ghost" onClick={stop} disabled={busy}>
            Termina gioco
          </button>
        </div>
      ) : (
        <div className="admin-form">
          <label>Righe</label>
          <input
            type="number"
            min="2"
            max="7"
            value={rows}
            onChange={(e) => setRows(parseInt(e.target.value) || 0)}
          />
          <label>Colonne</label>
          <input
            type="number"
            min="2"
            max="7"
            value={cols}
            onChange={(e) => setCols(parseInt(e.target.value) || 0)}
          />
          <label>Numero nascosto (1-90)</label>
          <input
            type="number"
            min="1"
            max="90"
            value={hiddenNumber}
            onChange={(e) => setHiddenNumber(parseInt(e.target.value) || 0)}
          />
          <label>Secondi di presentazione</label>
          <input
            type="number"
            min="5"
            max="120"
            value={presentSeconds}
            onChange={(e) => setPresentSeconds(parseInt(e.target.value) || 0)}
          />
          <button
            className="btn-sm btn-accent"
            onClick={start}
            disabled={busy || rows < 2 || cols < 2 || !hiddenNumber || presentSeconds < 5}
          >
            Avvia gioco
          </button>
        </div>
      )}
    </div>
  );
}