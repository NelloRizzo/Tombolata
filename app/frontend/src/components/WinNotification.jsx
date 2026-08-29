import { useEffect } from "react";

export default function WinNotification({ win, onClose, playing }) {
  useEffect(() => {
    if (playing) playing();
  }, [playing]);

  if (!win) return null;
  const labels = {
    ambo: "AMBO",
    terno: "TERNO",
    quaterna: "QUATERNA",
    cinquina: "CINQUINA",
    tombola: "TOMBOLA!!!"
  };
  return (
    <div className="win-overlay" onClick={onClose}>
      <div className="win-card">
        <div className="win-player">{win.playerName || "Giocatore"}</div>
        <div className="win-type">{labels[win.type] || win.type}</div>
        <div className="win-numbers">{win.numbers.join(" - ")}</div>
        {win.boardNumber ? <div className="win-board">Cartella n. {win.boardNumber}</div> : null}
        {onClose && <button className="btn-sm win-close">Chiudi</button>}
      </div>
    </div>
  );
}
