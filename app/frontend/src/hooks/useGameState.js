import { useEffect, useState } from "react";
import { useWebSocket } from "./useWebSocket.js";
import { playSound } from "../utils/audio.js";

// Hook che aggrega lo stato di gioco + narrazione (player, trigger) via WebSocket
export function useGameState() {
  const { connected, on } = useWebSocket();
  const [game, setGame] = useState(null);
  const [narration, setNarration] = useState(null);
  const [lastWin, setLastWin] = useState(null);
  const [firedTriggers, setFiredTriggers] = useState([]);

  useEffect(() => {
    const offSel = [];
    offSel.push(on("game:state", (s) => s && setGame(s)));
    offSel.push(on("game:update", (s) => s && setGame(s)));
    offSel.push(on("game:new", (s) => s && setGame(s)));
    offSel.push(on("game:selected", (s) => s && setGame(s)));
    offSel.push(
      on("game:win", (wins) => {
        if (wins && wins.length > 0) setLastWin(wins[wins.length - 1]);
      })
    );
    offSel.push(on("narration:state", (n) => n && setNarration(n)));
    offSel.push(on("narration:update", (n) => n && setNarration(n)));
    offSel.push(
      on("sound:play", (s) => {
        playSound(s);
      })
    );
    offSel.push(
      on("trigger:fired", (t) => {
        const arr = Array.isArray(t) ? t : [t];
        setFiredTriggers((prev) => [...arr, ...prev].slice(0, 50));
      })
    );
    return () => offSel.forEach((off) => off());
  }, [on]);

  const clearLastWin = () => setLastWin(null);

  return { connected, game, narration, lastWin, clearLastWin, firedTriggers };
}
