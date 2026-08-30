import { useState } from "react";
import { apiRequest } from "../api.js";
import NumberGrid from "./NumberGrid.jsx";
import ExtractedNumbers from "./ExtractedNumbers.jsx";
import BoardManager from "./BoardManager.jsx";
import WinNotification from "./WinNotification.jsx";
import { playExtract, playWin, playTombola } from "../utils/audio.js";

export default function DrawerPanel({ ws, gameId }) {
  const { game, lastWin, clearLastWin } = ws;
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

  function onWinSound() {
    if (lastWin) {
      if (lastWin.type === "tombola") playTombola();
      else playWin();
    }
  }

  return (
    <div className="drawer-panel">
      {error && <div className="error-banner">{error}</div>}

      <section className="console-controls">
        <button
          className="btn-extract"
          onClick={extract}
          disabled={!game || extracting || (game && game.extractedNumbers.length >= 90)}
        >
          {extracting ? "Estrazione..." : "Estrai numero"}
        </button>
        <div className="console-stats">
          <span>Estratti: {game?.extractedNumbers?.length || 0}/90</span>
          <span>Cartelle: {game?.boards?.length || 0}</span>
          <span>Fase: {ws.narration?.phase || "-"}</span>
        </div>
      </section>

      <section className="console-grid">
        <NumberGrid extracted={game?.extractedNumbers || []} />
        <ExtractedNumbers numbers={game?.extractedNumbers || []} last={game?.currentNumber} />
      </section>

      {game && (
        <section className="console-boards">
          <BoardManager game={game} />
        </section>
      )}

      {lastWin && (
        <WinNotification win={lastWin} onClose={clearLastWin} playing={onWinSound} />
      )}
    </div>
  );
}
