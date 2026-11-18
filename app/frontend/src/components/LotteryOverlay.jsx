import { useEffect, useState, useMemo } from "react";

function pad(n) {
  return String(n).padStart(2, "0");
}

export default function LotteryOverlay({ lottery }) {
  const [revealCount, setRevealCount] = useState(0);

  useEffect(() => {
    if (lottery?.status !== "reveal") {
      setRevealCount(0);
      return;
    }
    const total = (lottery.revealSerial || "").length + (lottery.revealBooklet || "").length;
    let i = 0;
    setRevealCount(0);
    const timer = setInterval(() => {
      i += 1;
      setRevealCount(i);
      if (i >= total) clearInterval(timer);
    }, 600);
    return () => clearInterval(timer);
  }, [lottery?.status, lottery?.revealSerial, lottery?.revealBooklet]);

  if (!lottery || !lottery.active) return null;

  const drawn = Array.isArray(lottery.drawn) ? lottery.drawn : [];
  const eliminated = new Set(Array.isArray(lottery.eliminated) ? lottery.eliminated : []);
  const finalists = new Set(Array.isArray(lottery.finalists) ? lottery.finalists : []);
  const winnerNum = lottery.winnerNumber;

  const cards = drawn.length ? drawn : Array.from({ length: 40 }, (_, i) => i + 1);

  return (
    <div className="lottery-overlay">
      <div className="lottery-overlay-title">ESTRAZIONE LOTTERIA</div>
      {lottery.prizeName && <div className="lottery-overlay-prize">{lottery.prizeName}</div>}

      <div className="lottery-cards-grid">
        {cards.map((id) => {
          const n = typeof id === "object" ? (id.id ?? id) : id;
          const isElim = eliminated.has(n);
          const isFinal = finalists.has(n);
          const isWinner = winnerNum === n;
          let cls = "lottery-card";
          if (isElim) cls += " eliminated";
          if (isFinal) cls += " finalist";
          if (isWinner) cls += " winner";
          return (
            <div key={n} className={cls}>
              <span className="lottery-card-num">S{pad(n)}</span>
            </div>
          );
        })}
      </div>

      {lottery.status === "reveal" && (
        <div className="lottery-reveal-banner">
          <div className="lottery-reveal-label">REVEAL BIGLIETTO VINCENTE</div>
          <div className="lottery-reveal-row">
            <span className="lottery-reveal-tag">Biglietto:</span>
            <span className="lottery-reveal-value">
              {(lottery.revealSerial || "").split("").map((ch, idx) => (
                <span key={idx} className={idx < revealCount ? "revealed" : "hidden"}>{idx < revealCount ? ch : "_"}</span>
              ))}
            </span>
          </div>
          <div className="lottery-reveal-row">
            <span className="lottery-reveal-tag">Blocchetto:</span>
            <span className="lottery-reveal-value">
              {(lottery.revealBooklet || "").split("").map((ch, idx) => {
                const offset = (lottery.revealSerial || "").length;
                return (
                  <span key={idx} className={offset + idx < revealCount ? "revealed" : "hidden"}>
                    {offset + idx < revealCount ? ch : "_"}
                  </span>
                );
              })}
            </span>
          </div>
        </div>
      )}

      {lottery.status === "winner" && lottery.winnerSerial && (
        <div className="lottery-winner-banner">
          <div className="lottery-winner-label">BIGLIETTO VINCENTE</div>
          <div className="lottery-winner-serial">{lottery.winnerSerial}</div>
          <div className="lottery-winner-num">#{lottery.winnerNumber}</div>
        </div>
      )}

      {lottery.status === "finalists" && (lottery.finalists || []).length > 0 && (
        <div className="lottery-status">5 CARTE FINALISTE: {(lottery.finalists || []).join(" · ")}</div>
      )}
    </div>
  );
}
