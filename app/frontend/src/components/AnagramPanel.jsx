import { useState } from "react";
import { apiRequest } from "../api.js";
import GameSolutionBanner from "./GameSolutionBanner.jsx";

// "Anagramma" (Regia): il regista avvia una parola (dal mazzo interno o scritta
// a mano); il tabellone mostra le lettere mescolate e il pubblico indovina.
// Il regista rivela la parola corretta. Niente controllo vincite: chi indovina
// per primo (a voce) vince.
export default function AnagramPanel({ ws, gameId }) {
  const [word, setWord] = useState("");
  const [hint, setHint] = useState("");
  const [presentSeconds, setPresentSeconds] = useState(20);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const active = ws.minigame?.overlayActive && ws.minigame?.type === "anagram";
  const g = ws.minigame;
  const running = active && g?.status === "running";
  const revealed = Boolean(g?.revealed);

  const body = (extra = {}) =>
    JSON.stringify({
      ...extra,
      word: word.trim() || undefined,
      hint: hint.trim() || undefined,
      presentSeconds,
      ...(gameId ? { gameId } : {})
    });

  async function start() {
    setError(null);
    setBusy(true);
    try {
      await apiRequest("/api/games/anagram/start", { method: "POST", body: body() });
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
      await apiRequest("/api/games/anagram/reveal", {
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
      await apiRequest("/api/games/anagram/stop", {
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
      <GameSolutionBanner solution={g?.solution} type="anagram" />
      {active ? (
        <div className="game-active">
          {running && (
            <p className="empty">
              Anagramma sul tabellone
              {g?.payload?.hint ? <> · indizio: {g.payload.hint}</> : "."}
              {revealed ? <> → <strong>{g?.payload?.word}</strong></> : null}
            </p>
          )}
          {!running && revealed && (
            <p className="empty">
              La parola era <strong>{g?.payload?.word}</strong>
            </p>
          )}
          {!running && !revealed && <p className="empty">Gioco concluso sul tabellone.</p>}
          <button className="btn-sm btn-accent" onClick={reveal} disabled={busy || !running || revealed}>
            {revealed ? "Parola rivelata" : "Rivela la parola"}
          </button>
          <button className="btn-sm btn-ghost" onClick={stop} disabled={busy}>
            Termina gioco
          </button>
        </div>
      ) : (
        <div className="admin-form">
          <label>Parola (vuoto = dal mazzo)</label>
          <input
            type="text"
            value={word}
            placeholder="es. REGALO"
            onChange={(e) => setWord(e.target.value.toUpperCase())}
          />
          <label>Indizio (facoltativo)</label>
          <input
            type="text"
            value={hint}
            placeholder="es. Si scarta sotto l'albero"
            onChange={(e) => setHint(e.target.value)}
          />
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
