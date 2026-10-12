import { useState } from "react";
import { apiRequest } from "../api.js";
import GameSolutionBanner from "./GameSolutionBanner.jsx";

// "Parola a categorie" (Regia): il regista avvia una parola segreta (dal mazzo
// interno o scritta a mano) con categoria e indizi; il tabellone li svela uno
// alla volta. Il regista rivela infine la parola. Niente controllo vincite: chi
// indovina (a voce) vince.
export default function CategoriesPanel({ ws, gameId }) {
  const [category, setCategory] = useState("");
  const [word, setWord] = useState("");
  const [hintsText, setHintsText] = useState("");
  const [presentSeconds, setPresentSeconds] = useState(30);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const active = ws.minigame?.overlayActive && ws.minigame?.type === "categories";
  const g = ws.minigame;
  const running = active && g?.status === "running";
  const revealed = Boolean(g?.revealed);
  const totalHints = (g?.payload?.hints || []).length;
  const shownHints = Math.min(g?.revealedHints || 0, totalHints);

  async function start() {
    setError(null);
    setBusy(true);
    try {
      const hints = hintsText
        .split(/\r?\n/)
        .map((h) => h.trim())
        .filter(Boolean);
      const payload = {
        presentSeconds,
        ...(gameId ? { gameId } : {})
      };
      if (word.trim()) {
        payload.word = word.trim();
        if (category.trim()) payload.category = category.trim();
        if (hints.length) payload.hints = hints;
      }
      await apiRequest("/api/games/categories/start", { method: "POST", body: JSON.stringify(payload) });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function nextHint() {
    setError(null);
    setBusy(true);
    try {
      await apiRequest("/api/games/categories/hint", {
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
      await apiRequest("/api/games/categories/reveal", {
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
      await apiRequest("/api/games/categories/stop", {
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
      <GameSolutionBanner solution={g?.solution} type="categories" />
      {active ? (
        <div className="game-active">
          {running && (
            <p className="empty">
              Categoria: <strong>{g?.payload?.category || "-"}</strong> · indizi svelati: {shownHints}/{totalHints}
            </p>
          )}
          {!running && revealed && (
            <p className="empty">
              La parola era <strong>{g?.payload?.word}</strong>
            </p>
          )}
          {!running && !revealed && <p className="empty">Gioco concluso sul tabellone.</p>}
          <button
            className="btn-sm btn-accent"
            onClick={nextHint}
            disabled={busy || !running || shownHints >= totalHints || revealed}
          >
            {shownHints >= totalHints ? "Indizi esauriti" : "Mostra indizio"}
          </button>
          <button className="btn-sm btn-accent" onClick={reveal} disabled={busy || !running || revealed}>
            {revealed ? "Parola rivelata" : "Rivela la parola"}
          </button>
          <button className="btn-sm btn-ghost" onClick={stop} disabled={busy}>
            Termina gioco
          </button>
        </div>
      ) : (
        <div className="admin-form">
          <label>Categoria (vuoto = dal mazzo)</label>
          <input
            type="text"
            value={category}
            placeholder="es. Un oggetto di Natale"
            onChange={(e) => setCategory(e.target.value)}
          />
          <label>Parola segreta (vuoto = dal mazzo)</label>
          <input
            type="text"
            value={word}
            placeholder="es. PRESEPE"
            onChange={(e) => setWord(e.target.value.toUpperCase())}
          />
          <label>Indizi (uno per riga)</label>
          <textarea
            rows={3}
            value={hintsText}
            placeholder={"Si allestisce in salotto\nCi sono Maria e Giuseppe\nHa la capanna"}
            onChange={(e) => setHintsText(e.target.value)}
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
