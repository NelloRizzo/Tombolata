import { useState } from "react";
import { apiRequest } from "../api.js";
import GameSolutionBanner from "./GameSolutionBanner.jsx";

// "Trova l'intruso" (Regia): il regista avvia una manche (dal mazzo interno o
// con parole proprie); il tabellone mostra alcune parole, una non c'entra col
// tema. Il regista rivela l'intruso. Niente controllo vincite: chi indovina
// per primo (a voce) vince.
export default function IntruderPanel({ ws, gameId }) {
  const [wordsText, setWordsText] = useState("");
  const [intruderPos, setIntruderPos] = useState(1);
  const [theme, setTheme] = useState("");
  const [presentSeconds, setPresentSeconds] = useState(20);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const active = ws.minigame?.overlayActive && ws.minigame?.type === "intruder";
  const g = ws.minigame;
  const running = active && g?.status === "running";
  const revealed = Boolean(g?.revealed);

  const customWords = wordsText
    .split(/\r?\n|,/)
    .map((w) => w.trim())
    .filter(Boolean);
  const useCustom = customWords.length >= 3;

  async function start() {
    setError(null);
    setBusy(true);
    try {
      const payload = {
        presentSeconds,
        ...(gameId ? { gameId } : {})
      };
      if (useCustom) {
        payload.words = customWords;
        payload.intruder = Math.max(0, intruderPos - 1);
        payload.theme = theme.trim() || undefined;
      }
      await apiRequest("/api/games/intruder/start", { method: "POST", body: JSON.stringify(payload) });
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
      await apiRequest("/api/games/intruder/reveal", {
        method: "POST",
        body: gameId ? JSON.stringify({ gameId }) : undefined
      });
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
      await apiRequest("/api/games/intruder/stop", {
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
      <GameSolutionBanner solution={g?.solution} type="intruder" />
      {active ? (
        <div className="game-active">
          {running && (
            <p className="empty">
              Intruso sul tabellone
              {g?.payload?.theme ? <> · tema: {g.payload.theme}</> : "."}
              {revealed ? <> → <strong>{g?.payload?.words?.[g?.payload?.intruderIndex]}</strong></> : null}
            </p>
          )}
          {!running && revealed && (
            <p className="empty">
              L'intruso era <strong>{g?.payload?.words?.[g?.payload?.intruderIndex]}</strong>
            </p>
          )}
          {!running && !revealed && <p className="empty">Gioco concluso sul tabellone.</p>}
          <button className="btn-sm btn-accent" onClick={reveal} disabled={busy || !running || revealed}>
            {revealed ? "Intruso rivelato" : "Rivela l'intruso"}
          </button>
          <button className="btn-sm btn-ghost" onClick={stop} disabled={busy}>
            Termina gioco
          </button>
        </div>
      ) : (
        <div className="admin-form">
          <label>Parole (una per riga, vuoto = dal mazzo)</label>
          <textarea
            rows={4}
            value={wordsText}
            placeholder={"PALLINA\nSTELLA\nNASTRO\nPADELLA"}
            onChange={(e) => setWordsText(e.target.value)}
          />
          {useCustom && (
            <>
              <label>Posizione intruso (1-{customWords.length})</label>
              <input
                type="number"
                min="1"
                max={customWords.length}
                value={intruderPos}
                onChange={(e) => setIntruderPos(parseInt(e.target.value) || 1)}
              />
              <label>Tema (facoltativo)</label>
              <input
                type="text"
                value={theme}
                placeholder="es. Addobbi di Natale"
                onChange={(e) => setTheme(e.target.value)}
              />
            </>
          )}
          <label>Secondi di presentazione</label>
          <input
            type="number"
            min="5"
            max="120"
            value={presentSeconds}
            onChange={(e) => setPresentSeconds(parseInt(e.target.value) || 0)}
          />
          <button className="btn-sm btn-accent" onClick={start} disabled={busy || presentSeconds < 5}>
            Avvia gioco
          </button>
        </div>
      )}
    </div>
  );
}
