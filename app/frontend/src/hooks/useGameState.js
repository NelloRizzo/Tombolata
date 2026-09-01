import { useCallback, useEffect, useState } from "react";
import { useWebSocket } from "./useWebSocket.js";
import { playSound } from "../utils/audio.js";

// Hook che aggrega lo stato di gioco + narrazione (player, trigger) via WebSocket.
// gameId: partita corrente del browser; gli eventi di altre partite sono ignorati.
export function useGameState(gameId = null) {
  const { connected, on } = useWebSocket(gameId);
  const [game, setGame] = useState(null);
  const [narration, setNarration] = useState(null);
  const [lastWin, setLastWin] = useState(null);
  const [firedTriggers, setFiredTriggers] = useState([]);

  // Accetta un evento di gioco solo se riguarda la partita corrente
  // (o qualsiasi se non è stata selezionata alcuna partita).
  const gameMatches = useCallback(
    (item) => {
      if (!item) return false;
      if (!gameId) return true;
      return String(item._id) === String(gameId);
    },
    [gameId]
  );

  useEffect(() => {
    const offSel = [];
    offSel.push(on("game:state", (s) => gameMatches(s) && setGame(s)));
    offSel.push(on("game:update", (s) => gameMatches(s) && setGame(s)));
    offSel.push(on("game:new", (s) => gameMatches(s) && setGame(s)));
    offSel.push(on("game:selected", (s) => gameMatches(s) && setGame(s)));
    offSel.push(
      on("game:win", (wins) => {
        if (wins && wins.length > 0) setLastWin(wins[wins.length - 1]);
      })
    );
    offSel.push(
      on("narration:state", (n) => {
        if (n && (!n.gameId || !gameId || String(n.gameId) === String(gameId))) setNarration(n);
      })
    );
    offSel.push(
      on("narration:update", (n) => {
        if (n && (!n.gameId || !gameId || String(n.gameId) === String(gameId))) setNarration(n);
      })
    );
    offSel.push(
      on("narration:clock", (c) => {
        setNarration((prev) => {
          if (!prev || !c || c.videoId !== prev.player?.videoId) return prev;
          return { ...prev, player: { ...prev.player, clockMs: c.clockMs } };
        });
      })
    );
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
  }, [on, gameId, gameMatches]);

  const clearLastWin = () => setLastWin(null);

  return { connected, game, narration, lastWin, clearLastWin, firedTriggers };
}
