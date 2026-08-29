import { useEffect, useState, useRef } from "react";
import { useWebSocket } from "../hooks/useWebSocket.js";
import NumberGrid from "../components/NumberGrid.jsx";
import ExtractedNumbers from "../components/ExtractedNumbers.jsx";
import LastNumber from "../components/LastNumber.jsx";
import WinNotification from "../components/WinNotification.jsx";
import PublicBoardPopup from "../components/PublicBoardPopup.jsx";
import { playExtract, playWin, playTombola, playSound } from "../utils/audio.js";

export default function Board() {
  const { connected, on } = useWebSocket();
  const [game, setGame] = useState(null);
  const [narration, setNarration] = useState(null);
  const [lastWin, setLastWin] = useState(null);
  const prevNumberRef = useRef(null);

  useEffect(() => {
    if (game?.currentNumber && game.currentNumber !== prevNumberRef.current) {
      prevNumberRef.current = game.currentNumber;
      playExtract();
    }
  }, [game]);

  useEffect(() => {
    const offState = on("game:state", (state) => {
      if (state) setGame(state);
    });
    const offUpdate = on("game:update", (state) => {
      if (state) setGame(state);
    });
    const offNew = on("game:new", (state) => {
      if (state) setGame(state);
    });
    const offSelected = on("game:selected", (state) => {
      if (state) setGame(state);
    });
    const offWin = on("game:win", (wins) => {
      if (wins && wins.length > 0) {
        const latest = wins[wins.length - 1];
        setLastWin(latest);
        if (latest.type === "tombola") playTombola();
        else playWin();
        setTimeout(() => setLastWin(null), 5000);
      }
    });
    const offNarState = on("narration:state", (n) => n && setNarration(n));
    const offNarUpdate = on("narration:update", (n) => n && setNarration(n));
    const offSound = on("sound:play", (s) => playSound(s));

    return () => {
      offState();
      offUpdate();
      offNew();
      offSelected();
      offWin();
      offNarState();
      offNarUpdate();
      offSound();
    };
  }, [on]);

  return (
    <div className="board-page">
      <header className="board-header">
        <h1 className="board-title">{game?.name || "Tombolata di Natale"}</h1>
        <div className="board-status">
          {connected ? (
            <span className="status-dot connected" />
          ) : (
            <span className="status-dot disconnected" />
          )}
          <span>{connected ? "Connesso" : "Riconnessione..."}</span>
        </div>
      </header>

      <main className="board-main">
        <div className="board-left">
          <LastNumber number={game?.currentNumber} />
          <NumberGrid extracted={game?.extractedNumbers || []} />
        </div>
        <div className="board-right">
          <ExtractedNumbers
            numbers={game?.extractedNumbers || []}
            last={game?.currentNumber}
          />
        </div>
      </main>

      {lastWin && <WinNotification win={lastWin} />}

      <PublicBoardPopup narration={narration} />
    </div>
  );
}
