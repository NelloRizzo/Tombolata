import { useEffect, useState } from "react";

// Countdown dei secondi di presentazione di un minigioco. Per i giochi "a
// cascata" i secondi partono alla FINE della composizione (la griglia si
// rivela in ~5s); per i giochi immediati (memory) partono subito.
export default function GameCountdown({ minigame }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
    // eseguire solo una volta: la stessa istanza segue solo questo gioco
  }, []);

  const expiresAt = minigame?.expiresAt ? new Date(minigame.expiresAt).getTime() : 0;
  const presentMs = (minigame?.presentSeconds || 0) * 1000;
  const remaining = Math.max(0, expiresAt - now);
  const inPresentation = presentMs > 0 && remaining <= presentMs;
  const secondsLeft = inPresentation ? Math.max(0, Math.ceil(remaining / 1000)) : 0;

  return (
    <div className="minigame-countdown">
      {inPresentation ? (
        <span className="mini-count-num">{secondsLeft}</span>
      ) : (
        <span className="mini-count-num idle">…</span>
      )}
      <span className="mini-count-lab">
        {inPresentation ? "secondi" : "composizione in corso"}
      </span>
    </div>
  );
}