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

  console.log("LotteryOverlay render", lottery && lottery.active, lottery && lottery.status, lottery && (lottery.drawn || []).length);

  if (!lottery || !lottery.active) return null;

  const drawn = Array.isArray(lottery.drawn) ? lottery.drawn : [];
  const eliminated = new Set(Array.isArray(lottery.eliminated) ? lottery.eliminated : []);
  const finalists = new Set(Array.isArray(lottery.finalists) ? lottery.finalists : []);
  const winnerNum = lottery.winnerNumber;

  const cards = drawn.length ? drawn : Array.from({ length: 40 }, (_, i) => i + 1);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 16, color: "#fff" }}>
      <div style={{ fontSize: "3rem", fontWeight: 800, color: "#ff6b6b", letterSpacing: "0.2em" }}>ESTRAZIONE LOTTERIA</div>
      {lottery.prizeName && <div style={{ fontSize: "1.4rem", color: "#ffd700" }}>{lottery.prizeName}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 10, maxWidth: "92vw" }}>
        {cards.map((id) => {
          const n = typeof id === "object" ? (id.id ?? id) : id;
          const isElim = eliminated.has(n);
          const isFinal = finalists.has(n);
          const isWinner = winnerNum === n;
          let bg = "#16213e";
          let border = "2px solid #3a3a5a";
          let opacity = 1;
          if (isElim) { opacity = 0.25; }
          if (isFinal) { border = "2px solid #ffd700"; }
          if (isWinner) { border = "3px solid #00ff88"; }
          return (
            <div key={n} style={{ minHeight: 70, border, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", opacity }}>
              <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff" }}>S{pad(n)}</span>
            </div>
          );
        })}
      </div>

      {lottery.status === "reveal" && (
        <div style={{ marginTop: 16, textAlign: "center", padding: "24px 40px", border: "3px solid #ff6b6b", borderRadius: 12, background: "rgba(255,107,107,0.1)" }}>
          <div style={{ fontSize: "1.2rem", color: "#ff6b6b", letterSpacing: "0.2em", marginBottom: 12 }}>REVEAL BIGLIETTO VINCENTE</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, margin: "8px 0" }}>
            <span style={{ fontSize: "1.2rem", color: "#aaa", minWidth: 120, textAlign: "right" }}>Biglietto:</span>
            <span style={{ fontFamily: "monospace", fontSize: "2.5rem", fontWeight: 800, letterSpacing: "0.15em" }}>
              {(lottery.revealSerial || "").split("").map((ch, idx) => (
                <span key={idx} style={{ color: idx < revealCount ? "#fff" : "#444", textShadow: idx < revealCount ? "0 0 8px #ff6b6b" : "none" }}>{idx < revealCount ? ch : "_"}</span>
              ))}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, margin: "8px 0" }}>
            <span style={{ fontSize: "1.2rem", color: "#aaa", minWidth: 120, textAlign: "right" }}>Blocchetto:</span>
            <span style={{ fontFamily: "monospace", fontSize: "2.5rem", fontWeight: 800, letterSpacing: "0.15em" }}>
              {(lottery.revealBooklet || "").split("").map((ch, idx) => {
                const offset = (lottery.revealSerial || "").length;
                return <span key={idx} style={{ color: offset + idx < revealCount ? "#fff" : "#444", textShadow: offset + idx < revealCount ? "0 0 8px #ff6b6b" : "none" }}>{offset + idx < revealCount ? ch : "_"}</span>;
              })}
            </span>
          </div>
        </div>
      )}

      {lottery.status === "winner" && lottery.winnerSerial && (
        <div style={{ marginTop: 16, textAlign: "center", padding: "16px 32px", border: "3px solid #00ff88", borderRadius: 12, background: "rgba(0,255,136,0.1)" }}>
          <div style={{ fontSize: "1rem", color: "#00ff88", letterSpacing: "0.2em" }}>BIGLIETTO VINCENTE</div>
          <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#fff" }}>{lottery.winnerSerial}</div>
          <div style={{ fontSize: "1.2rem", color: "#aaa" }}>#{lottery.winnerNumber}</div>
        </div>
      )}

      {lottery.status === "finalists" && (lottery.finalists || []).length > 0 && (
        <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ffd700", letterSpacing: "0.15em" }}>5 CARTE FINALISTE: {(lottery.finalists || []).join(" · ")}</div>
      )}
    </div>
  );
}
