import { useState } from "react";
import { apiRequest } from "../api.js";
import { boardLabel } from "../utils/boardLabels.js";

// Memory a coppie (Regia): il regista imposta righe/colonne e secondi, avvia il
// gioco sul tabellone e durante la partita scopre le carte chiamando le
// coordinate (griglia "caller"); le coppie sbagliate si rigirano da sole.
// La coppia giusta la indica il pubblico a voce.
export default function MemoryGamePanel({ ws, gameId }) {
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(4);
  const [presentSeconds, setPresentSeconds] = useState(20);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const active = ws.minigame?.overlayActive && ws.minigame?.type === "memory";
  const g = ws.minigame;
  const running = active && g?.status === "running";
  const gridCols = g?.cols || cols;
  const cards = g?.cards || [];
  const even = rows * cols % 2 === 0;

  const body = (extra = {}) =>
    JSON.stringify({ ...extra, rows, cols, presentSeconds, ...(gameId ? { gameId } : {}) });

  async function start() {
    setError(null);
    setBusy(true);
    try {
      await apiRequest("/api/games/memory/start", { method: "POST", body: body() });
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
      await apiRequest("/api/games/memory/stop", {
        method: "POST",
        body: gameId ? JSON.stringify({ gameId }) : undefined
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function flip(index) {
    setError(null);
    try {
      await apiRequest("/api/games/memory/flip", {
        method: "POST",
        body: JSON.stringify({ ...(gameId ? { gameId } : {}), index })
      });
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="game-panel">
      {error && <div className="error-text">{error}</div>}
      {active ? (
        <div className="game-active">
          {running && (
            <>
              <p className="empty">
                Cerca le coppie: tocca le caselle (lettera+numero) per scoprirle.
              </p>
              <div
                className="memory-caller-grid"
                style={{ "--cols": gridCols }}
              >
                {cards.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`mini-memory-cell ${c.face !== "down" ? "open" : ""} ${
                      c.face === "found" ? "found" : ""
                    }`}
                    onClick={() => flip(i)}
                    disabled={busy || c.face === "found"}
                  >
                    <span className="cell-coord">{boardLabel(i, gridCols)}</span>
                    {c.face !== "down" && <span className="memory-sym">{c.sym}</span>}
                  </button>
                ))}
              </div>
            </>
          )}
          {!running && <p className="empty">Gioco concluso sul tabellone.</p>}
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
          {!even && <p className="empty">Carte dispari: righe × colonne devono essere pari.</p>}
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
            disabled={busy || !even || rows < 2 || cols < 2 || presentSeconds < 5}
          >
            Avvia gioco
          </button>
        </div>
      )}
    </div>
  );
}