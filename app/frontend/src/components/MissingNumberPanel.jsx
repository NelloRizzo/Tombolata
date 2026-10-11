import { useState } from "react";
import { apiRequest } from "../api.js";
import GameSolutionBanner from "./GameSolutionBanner.jsx";

// "Che numero manca?" (Regia): il regista imposta la griglia (da 1 a N con
// un numero mancante), avvia il gioco sul tabellone; quando qualcuno grida la
// risposta giusta, rivela il numero mancante. Niente controllo vincite: chi
// indovina per primo (a voce) è il vincitore.
export default function MissingNumberPanel({ ws, gameId }) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [presentSeconds, setPresentSeconds] = useState(12);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const active = ws.minigame?.overlayActive && ws.minigame?.type === "missingNumber";
  const g = ws.minigame;
  const running = active && g?.status === "running";
  const revealed = Boolean(g?.revealed);
  const missing = g?.payload?.missing;

  const body = (extra = {}) =>
    JSON.stringify({ ...extra, rows, cols, presentSeconds, ...(gameId ? { gameId } : {}) });

  async function start() {
    setError(null);
    setBusy(true);
    try {
      await apiRequest("/api/games/missingnumber/start", { method: "POST", body: body() });
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
      await apiRequest("/api/games/missingnumber/stop", {
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
      await apiRequest("/api/games/missingnumber/reveal", {
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
      <GameSolutionBanner solution={g?.solution} type="missingNumber" />
      {active ? (
        <div className="game-active">
          {running && (
            <p className="empty">
              Griglia {g?.rows || rows}&times;{g?.cols || cols} sul tabellone, un numero manca
              {revealed ? <>: <strong>{missing}</strong></> : "."}
            </p>
          )}
          {!running && revealed && (
            <p className="empty">
              Il numero mancante era <strong>{missing}</strong>
            </p>
          )}
          {!running && !revealed && <p className="empty">Gioco concluso sul tabellone.</p>}
          <button className="btn-sm btn-accent" onClick={reveal} disabled={busy || !running || revealed}>
            {revealed ? "Numero rivelato" : "Rivela il numero mancante"}
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
            max="6"
            value={rows}
            onChange={(e) => setRows(parseInt(e.target.value) || 0)}
          />
          <label>Colonne</label>
          <input
            type="number"
            min="2"
            max="6"
            value={cols}
            onChange={(e) => setCols(parseInt(e.target.value) || 0)}
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
            disabled={busy || rows < 2 || cols < 2 || presentSeconds < 5}
          >
            Avvia gioco
          </button>
        </div>
      )}
    </div>
  );
}