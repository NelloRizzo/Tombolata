import { useState } from "react";
import { apiRequest } from "../api.js";

// Pannello del minigioco "colorCount" per il regista. Il regista sceglie il
// totale dei quadrati e il numero di colori, avvia il gioco (che si sostituisce
// al tabellone, colorandosi in 5 secondi) e decide quando tornare al tabellone.
// La partecipazione e il vincitore sono gestiti a mano dal presentatore.
export default function ColorGamePanel({ ws, gameId }) {
  const [totalSquares, setTotalSquares] = useState(100);
  const [numColors, setNumColors] = useState(2);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const active = ws.minigame?.overlayActive;
  const status = ws.minigame?.status;

  const body = (extra = {}) =>
    JSON.stringify({ ...extra, totalSquares, numColors, ...(gameId ? { gameId } : {}) });

  async function start() {
    setError(null);
    setBusy(true);
    try {
      await apiRequest("/api/games/color/start", { method: "POST", body: body() });
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
      await apiRequest("/api/games/color/stop", {
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
    <div className="panel-block">
      <h2>Gioco: colore più presente</h2>
      {error && <div className="error-text">{error}</div>}
      {active ? (
        <div className="game-active">
          <p className="empty">
            {status === "running"
              ? "Il riquadro si sta colorando sul tabellone..."
              : "Colori rivelati sul tabellone."}
          </p>
          <p className="empty">Quadrati: {ws.minigame?.totalSquares} · Colori: {ws.minigame?.numColors}</p>
          <button className="btn-sm btn-ghost" onClick={stop} disabled={busy}>
            Torna al tabellone
          </button>
        </div>
      ) : (
        <div className="admin-form">
          <label>Quadrati da colorare</label>
          <input
            type="number"
            min="9"
            max="900"
            value={totalSquares}
            onChange={(e) => setTotalSquares(parseInt(e.target.value) || 0)}
          />
          <label>Numero di colori</label>
          <input
            type="number"
            min="2"
            max="10"
            value={numColors}
            onChange={(e) => setNumColors(parseInt(e.target.value) || 0)}
          />
          <button className="btn-sm btn-accent" onClick={start} disabled={busy || totalSquares < 9 || numColors < 2}>
            Avvia gioco
          </button>
        </div>
      )}
    </div>
  );
}
