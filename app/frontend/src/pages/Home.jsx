import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api.js";

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) +
    " · " + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function GameCard({ game, badge }) {
  const desc = game.description || "Partita di tombola.";
  return (
    <div className={`program-card ${badge ? `program-card-${badge}` : ""}`}>
      <div className="program-card-head">
        <span className="program-name">{game.name}</span>
        {badge === "live" && <span className="program-badge">In corso</span>}
        {badge === "upcoming" && <span className="program-badge">In programma</span>}
        {badge === "future" && <span className="program-badge">Futura</span>}
      </div>
      <p className="program-desc">{desc}</p>
      {game.scheduledAt && (
        <p className="program-date">{formatDate(game.scheduledAt)}</p>
      )}
      {badge === "live" && (
        <Link to="/board" className="btn-sm btn-accent program-open">
          Apri tabellone
        </Link>
      )}
    </div>
  );
}

function Section({ title, count, children }) {
  if (!children || children.length === 0) return null;
  return (
    <section className="program-section">
      <h2 className="program-section-title">{title} <span className="program-count">{count}</span></h2>
      <div className="program-grid">{children}</div>
    </section>
  );
}

export default function Home() {
  const [program, setProgram] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const json = await apiRequest("/api/game/program");
        if (!cancelled && json.ok) setProgram(json.data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const active = program?.active || [];
  const upcoming = program?.upcoming || [];
  const future = program?.future || [];
  const nothing = !error && program && active.length === 0 && upcoming.length === 0 && future.length === 0;

  return (
    <div className="home-page">
      <div className="home-topbar">
        <span className="home-brand">Gestione Tombola</span>
        <Link to="/login" className="home-manage-link">Gestione / Login</Link>
      </div>

      <header className="home-hero">
        <h1 className="home-title">Tombolata di Natale</h1>
        <p className="home-subtitle">il segreto di Natale</p>
        <p className="home-intro">
          Serata di tombola con estrazioni dal vivo, vincite progressive e sorprese.
          Qui trovi il programma delle partite in corso, quelle in programma e quelle già fissate per il futuro.
        </p>
        {active.length > 0 && (
          <Link to="/board" className="home-open-board">Vai al tabellone in corso</Link>
        )}
      </header>

      <main className="home-main">
        {error && <div className="error-text">{error}</div>}

        <Section title="Partite aperte" count={active.length}>
          {active.map((g) => <GameCard key={g._id} game={g} badge="live" />)}
        </Section>

        <Section title="Prossime partite in programma" count={upcoming.length}>
          {upcoming.map((g) => <GameCard key={g._id} game={g} badge="upcoming" />)}
        </Section>

        <Section title="Partite programmate in futuro" count={future.length}>
          {future.map((g) => <GameCard key={g._id} game={g} badge="future" />)}
        </Section>

        {nothing && (
          <p className="empty">
            Nessuna partita al momento. Il programma della serata comparirà qui appena verrà pubblicato.
          </p>
        )}
        {!program && !error && <p className="empty">Caricamento programma...</p>}
      </main>
    </div>
  );
}