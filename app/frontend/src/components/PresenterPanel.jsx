import { useState } from "react";
import { apiRequest } from "../api.js";
import { playExtract, playWin, playWrong } from "../utils/audio.js";
import ExtractedNumbers from "./ExtractedNumbers.jsx";
import NumberGrid from "./NumberGrid.jsx";
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

  function playSound(fn) {
    try { fn(); } catch (e) { /* ignore */ }
  }

  const lastWin = game?.lastWin || null;

  return (
    <div className="presenter-panel">
      {error && <div className="error-banner">{error}</div>}

      <div className="presenter-top">
        <div className="presenter-left">
          <div className="presenter-extract">
            <button
              className="btn-extract"
              onClick={extract}
              disabled={!game || extracting || extracted.length >= 90}
            >
              {extracting ? "Estrazione..." : "Estrai numero"}
            </button>
            <label className="console-stats">
              Estratti: {extracted.length}/90 · Cartelle: {game?.boards?.length || 0}
              {lastWin ? ` · Ultima vincita: ${lastWin.type}` : ""}
            </label>
          </div>
          <div className="presenter-numbers">
            <ExtractedNumbers numbers={extracted} last={last} />
          </div>
        </div>

        <div className="presenter-right">
          <NumberGrid extracted={extracted} />
        </div>
      </div>

      <div className="presenter-bottom">
        <div className="presenter-sounds">
          <div className="quick-sounds">
            <button className="quick-sound" onClick={() => playSound(playWin)} title="Vincita">
              <span className="quick-icon">🎉</span>
              <span className="quick-label">Vincita</span>
            </button>
            <button className="quick-sound" onClick={() => playSound(playWrong)} title="Boo!">
              <span className="quick-icon">👎</span>
              <span className="quick-label">Boo!</span>
            </button>
          </div>
        </div>

        <div className="presenter-chat">
          <ChatPanel
            gameId={gameId}
            quickReplies={["OK", "SPIEGA MEGLIO", "NON SONO D'ACCORDO"]}
          />
        </div>
      </div>
    </div>
  );
}