import { useState } from "react";
import { apiRequest } from "../api.js";
import { playExtract } from "../utils/audio.js";
import ExtractedNumbers from "./ExtractedNumbers.jsx";
import NumberGrid from "./NumberGrid.jsx";
import AudioPanel from "./AudioPanel.jsx";
import ChatPanel from "./ChatPanel.jsx";

export default function PresenterPanel({ ws, gameId }) {
  const game = ws?.game || null;
  const extracted = game?.extractedNumbers || [];
  const last = game?.currentNumber || extracted[extracted.length - 1];
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState(null);

  const ref = gameId || game?._id || null;

  async function extract() {
    if (!game) return;
    setExtracting(true);
    setError(null);
    try {
      await apiRequest("/api/game/extract", {
        method: "POST",
        body: ref ? JSON.stringify({ gameId: ref }) : undefined
      });
      playExtract();
    } catch (e) {
      setError(e.message);
    } finally {
      setExtracting(false);
    }
  }

  const lastWin = game?.lastWin || null;

  return (
    <div className="presenter-panel">
      {error && <div className="error-banner">{error}</div>}

      <div className="panel-block">
        <div className="panel-title">
          <h2>Estrazione</h2>
        </div>
        <label className="console-stats">
          Estratti: {extracted.length}/90 · Cartelle: {game?.boards?.length || 0}
        </label>
        <div className="draw-simple-controls">
          <button
            className="btn-extract"
            onClick={extract}
            disabled={!game || extracting || extracted.length >= 90}
          >
            {extracting ? "Estrazione..." : "Estrai numero"}
          </button>
        </div>
      </div>

      <div className="panel-block">
        <h2>Stato del gioco</h2>
        <p className="empty">
          Vincite reclamate: {(game?.wonTypes || []).join(", ") || "nessuna"}
        </p>
        {lastWin && (
          <p className="empty">
            Ultima vincita: <strong>{lastWin.type}</strong>
            {lastWin.playerName ? ` — ${lastWin.playerName}` : ""}
            {lastWin.timestamp ? ` (${new Date(lastWin.timestamp).toLocaleTimeString()})` : ""}
          </p>
        )}
      </div>

      <div className="panel-block">
        <h2>Tabellone</h2>
        <NumberGrid extracted={extracted} />
      </div>

      <div className="panel-block">
        <ExtractedNumbers numbers={extracted} last={last} />
      </div>

      <AudioPanel ws={ws} gameId={gameId} />

      <div className="panel-block">
        <h2>Chat con il regista</h2>
        <ChatPanel gameId={gameId} />
      </div>
    </div>
  );
}
