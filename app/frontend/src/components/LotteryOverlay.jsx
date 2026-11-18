import { useMemo } from "react";

function pad(n) {
  return String(n).padStart(2, "0");
}

export default function LotteryOverlay({ lottery }) {
  if (!lottery || !lottery.active) return null;

  const drawn = lottery.drawn || [];
  const eliminated = new Set(lottery.eliminated || []);
  const finalists = new Set(lottery.finalists || []);
  const winnerNum = lottery.winnerNumber;

  const cards = useMemo(() => {
    const ids = drawn.length ? drawn : Array.from({ length: 40 }, (_, i) => i + 1);
    return ids;
  }, [drawn]);

  return (
    <div className="lottery-overlay">
      <div className="lottery-overlay-title">ESTRAZIONE LOTTERIA</div>
      {lottery.prizeName && <div className="lottery-overlay-prize">{lottery.prizeName}</div>}

      <div className="lottery-cards-grid">
        {cards.map((id) => {
          const isElim = eliminated.has(id);
          const isFinal = finalists.has(id);
          const isWinner = winnerNum === id;
          let cls = "lottery-card";
          if (isElim) cls += " eliminated";
          if (isFinal) cls += " finalist";
          if (isWinner) cls += " winner";
          return (
            <div key={id} className={cls}>
              <img
                src={`/lottery-assets/symbols/S${pad(id)}.jpeg`}
                alt={`S${pad(id)}`}
                onError={(e) => { e.target.style.display = "none"; }}
              />
              <span className="lottery-card-num">S{pad(id)}</span>
            </div>
          );
        })}
      </div>

      {lottery.status === "winner" && lottery.winnerSerial && (
        <div className="lottery-winner-banner">
          <div className="lottery-winner-label">BIGLIETTO VINCENTE</div>
          <div className="lottery-winner-serial">{lottery.winnerSerial}</div>
          <div className="lottery-winner-num">#{lottery.winnerNumber}</div>
        </div>
      )}

      {lottery.status === "finalists" && finalists.size > 0 && (
        <div className="lottery-status">5 CARTE FINALISTE</div>
      )}
    </div>
  );
}
