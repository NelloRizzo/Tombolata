import { useEffect, useState, useRef } from "react";

import { useWebSocket } from "../hooks/useWebSocket.js";
import NumberGrid from "./NumberGrid.jsx";
import ExtractedNumbers from "./ExtractedNumbers.jsx";
import LastNumber from "./LastNumber.jsx";
import WinNotification from "./WinNotification.jsx";
import PublicBoardPopup from "./PublicBoardPopup.jsx";
import { playExtract, playWin, playTombola } from "../utils/audio.js";

// Vista tabellone riutilizzabile.
// - showChrome=true: mostra l'header di stato (Board pubblico).
// - showChrome=false: render a tutto schermo senza header (Monitor proiettore).
// - gameId: partita corrente (null = partita attiva).
export default function BoardView({ showChrome = true, gameId = null }) {
  const { connected, on } = useWebSocket(gameId);
  const [game, setGame] = useState(null);
  const [narration, setNarration] = useState(null);
  const [lastWin, setLastWin] = useState(null);
  const prevNumberRef = useRef(null);

  const gameMatches = (item) => {
    if (!item) return false;
    if (!gameId) return true;
    return String(item._id) === String(gameId);
  };

  useEffect(() => {
    if (game?.currentNumber && game.currentNumber !== prevNumberRef.current) {
      prevNumberRef.current = game.currentNumber;
      playExtract();
    }
  }, [game]);

  useEffect(() => {
    const offs = [];
    offs.push(on("game:state", (s) => gameMatches(s) && setGame(s)));
    offs.push(on("game:update", (s) => gameMatches(s) && setGame(s)));
    offs.push(on("game:new", (s) => gameMatches(s) && setGame(s)));
    offs.push(on("game:selected", (s) => gameMatches(s) && setGame(s)));
    offs.push(
      on("game:win", (wins) => {
        if (wins && wins.length > 0) {
          const latest = wins[wins.length - 1];
          setLastWin(latest);
          if (latest.type === "tombola") playTombola();
          else playWin();
          setTimeout(() => setLastWin(null), 5000);
        }
      })
    );
    offs.push(
      on("narration:state", (n) => {
        if (n && (!n.gameId || !gameId || String(n.gameId) === String(gameId))) setNarration(n);
      })
    );
    offs.push(
      on("narration:update", (n) => {
        if (n && (!n.gameId || !gameId || String(n.gameId) === String(gameId))) setNarration(n);
      })
    );
    offs.push(
      on("narration:clock", (c) => {
        setNarration((prev) => {
          if (!prev || !c || c.videoId !== prev.player?.videoId) return prev;
          return { ...prev, player: { ...prev.player, clockMs: c.clockMs } };
        });
      })
    );

    return () => offs.forEach((off) => off());
  }, [on, gameId]);

  // Vista proiettore: attiva automaticamente il fullscreen all'apertura.
  useEffect(() => {
    if (showChrome) return;
    const el = document.documentElement;
    const goFullscreen = () => {
      if (!document.fullscreenElement && el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      }
    };
    goFullscreen();
    const onFsChange = () => {
      if (!document.fullscreenElement) goFullscreen();
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      document.removeEventListener("fullscreenchange", onFsChange);
    };
  }, [showChrome]);

  return (
    <div className={showChrome ? "board-page" : "board-page board-fullscreen"}>
      {showChrome && (
        <header className="board-header">
          <h1 className="board-title">{game?.name || "Tombolata"}</h1>
          <div className="board-status">
            {connected ? (
              <span className="status-dot connected" />
            ) : (
              <span className="status-dot disconnected" />
            )}
            <span>{connected ? "Connesso" : "Riconnessione..."}</span>
          </div>
        </header>
      )}

      <main className="board-main">
        {!showChrome && (
          <div className="board-vertical-title" title={game?.name || "Tombolata"}>
            {game?.name || "Tombolata"}
          </div>
        )}
        <div className="board-left">
          <NumberGrid extracted={game?.extractedNumbers || []} fill />
        </div>
        <div className="board-right">
          <LastNumber number={game?.currentNumber} />
          <ExtractedNumbers
            numbers={game?.extractedNumbers || []}
            last={game?.currentNumber}
          />
        </div>
      </main>

      {showChrome && lastWin && <WinNotification win={lastWin} />}

      <PublicBoardPopup narration={narration} gameId={gameId} />
    </div>
  );
}
