import { useEffect, useState, useMemo } from "react";
import { getBackendUrl } from "../hooks/useWebSocket.js";

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
    const total = (lottery.revealBooklet || "").length + (lottery.revealSerial || "").length;
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
  const drawnSet = new Set(drawn);

  const pool = Array.isArray(lottery.pool) && lottery.pool.length ? lottery.pool : [];
  // Visualizzazione in ordine crescente dei simboli, evidenziando quelli estratti
  const allCards = pool.length ? [...pool].sort((a, b) => a - b) : Array.from({ length: 40 }, (_, i) => i + 1);
  const backendUrl = getBackendUrl().replace(/\/$/, "");

  const isReveal = lottery?.status === "reveal";
  const containerStyle = isReveal
    ? { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, color: "#fff" }
    : { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 16, color: "#fff" };
  return (
    <div style={containerStyle}>
    <div style={isReveal ? { background: "#1a1a2e", padding: 24, borderRadius: 12, border: "2px solid #ff6b6b", maxWidth: "90vw", maxHeight: "80vh", overflow: "auto" } : {}}>
      <div style={{ fontSize: "3rem", fontWeight: 800, color: "#ff6b6b", letterSpacing: "0.2em" }}>ESTRAZIONE LOTTERIA</div>
      {lottery.prizeName && <div style={{ fontSize: "1.4rem", color: "#ffd700" }}>{lottery.prizeName}</div>}

      <div style={{ fontSize: "1.2rem", color: "#aaa", marginBottom: 8 }}>
        {lottery.status === "drawing" && `Estrazione in corso: ${drawn.length}/${(lottery.pool || []).length || 40} simbodo`}
        {lottery.status === "finalists" && "5 CARTE FINALISTE"}
        {lottery.status === "reveal" && "REVEAL IN CORSO"}
        {lottery.status === "winner" && "BIGLIETTO VINCENTE"}
      </div>

      {lottery.status !== "reveal" && (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 10, maxWidth: "92vw" }}>
        {allCards.map((n) => {
          const isDrawn = drawnSet.has(n);
          const isElim = eliminated.has(n);
          const isFinal = finalists.has(n);
          const isWinner = winnerNum === n;
          let border = "2px solid #333";
          let bg = "#0a0a1a";
          let opacity = 0.35;
          if (lottery.status === "drawing") {
            if (isDrawn) { border = "2px solid #3b82f6"; bg = "#1e3a8a"; opacity = 1; }
          } else {
            // finalists/winner/reveal phase
            if (isElim) { opacity = 0.2; }
            else { opacity = 1; }
            if (isFinal) { border = "2px solid #ffd700"; bg = "#3a2e00"; }
            if (isWinner) { border = "3px solid #00ff88"; bg = "#003a1f"; }
          }
          const code = `S${String(n).padStart(2, "0")}`;
          return (
            <div key={n} style={{ minHeight: 70, border, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", opacity, transition: "all 0.4s ease", overflow: "hidden" }}>
              <img src={`${backendUrl}/lottery-assets/symbols/${code}.jpeg`} alt={code} style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={(e) => { const el = e.currentTarget.parentElement; if (el) el.style.display = "none"; }} />
            </div>
          );
        })}
      </div>
      )}

      {lottery.status === "reveal" && (
        <div style={{ marginTop: 16, textAlign: "center", padding: "24px 40px", border: "3px solid #ff6b6b", borderRadius: 12, background: "rgba(255,107,107,0.1)" }}>
          <div style={{ fontSize: "1.2rem", color: "#ff6b6b", letterSpacing: "0.2em", marginBottom: 12 }}>REVEAL BIGLIETTO VINCENTE</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, margin: "8px 0" }}>
            <span style={{ fontSize: "1.2rem", color: "#aaa", minWidth: 120, textAlign: "right" }}>Biglietto:</span>
            <span style={{ fontFamily: "monospace", fontSize: "2.5rem", fontWeight: 800, letterSpacing: "0.15em" }}>
               {(lottery.revealSerial || "").split("").map((ch, idx) => {
                 const offset = (lottery.revealBooklet || "").length;
                 return <span key={idx} style={{ color: offset + idx < revealCount ? "#fff" : "#444", textShadow: offset + idx < revealCount ? "0 0 8px #ff6b6b" : "none" }}>{offset + idx < revealCount ? ch : "_"}</span>;
               })}
              </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, margin: "8px 0" }}>
            <span style={{ fontSize: "1.2rem", color: "#aaa", minWidth: 120, textAlign: "right" }}>Blocchetto:</span>
            <span style={{ fontFamily: "monospace", fontSize: "2.5rem", fontWeight: 800, letterSpacing: "0.15em" }}>
               {(lottery.revealBooklet || "").split("").map((ch, idx) => (
                 <span key={idx} style={{ color: idx < revealCount ? "#fff" : "#444", textShadow: idx < revealCount ? "0 0 8px #ff6b6b" : "none" }}>{idx < revealCount ? ch : "_"}</span>
               ))}
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
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ffd700", letterSpacing: "0.15em", marginBottom: 12 }}>5 CARTE FINALISTE</div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {(lottery.finalists || []).map((n) => {
              const code = `S${String(n).padStart(2, "0")}`;
              return (
                <div key={n} style={{ width: 90, height: 90, border: "3px solid #ffd700", borderRadius: 10, background: "#3a2e00", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <img src={`${backendUrl}/lottery-assets/symbols/${code}.jpeg`} alt={code} style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={(e) => { const el = e.currentTarget.parentElement; if (el) el.style.display = "none"; }} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
