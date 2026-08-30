import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useWebSocket } from "../hooks/useWebSocket.js";
import NumberGrid from "./NumberGrid.jsx";
import ExtractedNumbers from "./ExtractedNumbers.jsx";
import LastNumber from "./LastNumber.jsx";
import WinNotification from "./WinNotification.jsx";
import PublicBoardPopup from "./PublicBoardPopup.jsx";
import { playExtract, playWin, playTombola } from "../utils/audio.js";

// Vista tabellone riutilizzabile.
// - showChrome=true: mostra l'header e il link verso il monitor (Board pubblico).
// - showChrome=false: render a tutto schermo senza header/link (Monititor proiettore).
export default function BoardView({ showChrome = true }) {
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
    const offs = [];
    offs.push(on("game:state", (s) => s && setGame(s)));
    offs.push(on("game:update", (s) => s && setGame(s)));
    offs.push(on("game:new", (s) => s && setGame(s)));
    offs.push(on("game:selected", (s) => s && setGame(s)));
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
    offs.push(on("narration:state", (n) => n && setNarration(n)));
    offs.push(on("narration:update", (n) => n && setNarration(n)));

    return () => offs.forEach((off) => off());
  }, [on]);

  return (
    <div className={showChrome ? "board-page" : "board-page board-fullscreen"}>
      {showChrome && (
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
      )}

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

      {showChrome && (
        <div className="board-links">
          <Link to="/" className="board-monitor-link">Programma</Link>
          <Link to="/monitor" className="board-monitor-link" title="Apri il tabellone a schermo intero">
            Schermo intero
          </Link>
        </div>
      )}

      {lastWin && <WinNotification win={lastWin} />}

      <PublicBoardPopup narration={narration} />
    </div>
  );
}
