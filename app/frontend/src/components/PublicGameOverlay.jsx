import { useEffect, useState } from "react";

const EXIT_MS = 700;

// Origlia pubblica dei minigiochi: applica l'effetto scenico di apparizione
// all'attivazione del gioco e, quando lo stato diventa idle, quello di uscita.
// `children` può essere una funzione: riceve il documento del minigioco attivo
// (anche durante l'uscita, quando il doc corrente è già idle) così il contenuto
// resta integro fino alla fine dell'animazione di chiusura.
export default function PublicGameOverlay({ minigame, children }) {
  const active = minigame?.overlayActive;
  const [lastGame, setLastGame] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (active) setLastGame(minigame);
  }, [active, minigame]);

  useEffect(() => {
    if (active) {
      setMounted(true);
      setLeaving(false);
    }
  }, [active]);

  useEffect(() => {
    if (!active && mounted) {
      setLeaving(true);
      const t = setTimeout(() => setMounted(false), EXIT_MS);
      return () => clearTimeout(t);
    }
  }, [active, mounted]);

  if (!mounted && !active) return null;

  const data = active ? minigame : lastGame;
  return (
    <div className={`minigame-overlay ${leaving ? "leaving" : "entering"}`}>
      {typeof children === "function" ? children(data) : children}
    </div>
  );
}