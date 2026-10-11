import { useState } from "react";
import { apiRequest } from "../api.js";
import GameSolutionBanner from "./GameSolutionBanner.jsx";

const SYMBOLS = ["🎄", "🎅", "⛄", "🎁", "⭐", "🕯️", "❄️", "🎀", "🔔", "🍬", "🥂", "🌸"];

// "Conta e grida" (Regia): il regista imposta griglia, numero di simboli
// diversi e quale simbolo contare, avvia il gioco sul tabellone; quando il
// pubblico ha gridato le risposte, rivela il conteggio esatto. Niente
// controllo vincite: chi indovina per primo (a voce) è il vincitore.
export default function CountShoutPanel({ ws, gameId }) {
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(5);
  const [numSymbols, setNumSymbols] = useState(4);
  const [target, setTarget] = useState("⭐");
  const [presentSeconds, setPresentSeconds] = useState(12);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const active = ws.minigame?.overlayActive && ws.minigame?.type === "countShout";
  const g = ws.minigame;
  const running = active && g?.status === "running";
  const revealed = Boolean(g?.revealed);
  const answer = g?.payload?.answer;

  const body = (extra = {}) =>
    JSON.stringify({ ...extra, rows, cols, numSymbols, target, presentSeconds, ...(gameId ? { gameId } : {}) });

  async function start() {
    setError(null);
    setBusy(true);
    try {
      await apiRequest("/api/games/countshout/start", { method: "POST", body: body() });
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
      await apiRequest("/api/games/countshout/stop", {
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
      await apiRequest("/api/games/countshout/reveal", {
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
      <GameSolutionBanner solution={g?.solution} type="countShout" />
      {active ? (
        <div className="game-active">
          {running && (
            <p className="empty">
              Griglia di simboli sul tabellone, si conta {g?.payload?.target || target}.
            </p>
          )}
          {!running && revealed && (
            <p className="empty">
              Risposta: <strong>{g?.payload?.target}</strong> &times; {answer}
            </p>
          )}
          {!running && !revealed && <p className="empty">Gioco concluso sul tabellone.</p>}
          <button className="btn-sm btn-accent" onClick={reveal} disabled={busy || !running || revealed}>
            {revealed ? "Risposta rivelata" : "Rivela il conteggio"}
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
            max="8"
            value={rows}
            onChange={(e) => setRows(parseInt(e.target.value) || 0)}
          />
          <label>Colonne</label>
          <input
            type="number"
            min="2"
            max="8"
            value={cols}
            onChange={(e) => setCols(parseInt(e.target.value) || 0)}
          />
          <label>Simboli diversi</label>
          <input
            type="number"
            min="2"
            max={SYMBOLS.length}
            value={numSymbols}
            onChange={(e) => setNumSymbols(parseInt(e.target.value) || 0)}
          />
          <label>Simbolo da contare</label>
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            {SYMBOLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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