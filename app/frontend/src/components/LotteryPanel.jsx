import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";

export default function LotteryPanel() {
  const [extractions, setExtractions] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState("config");
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);

  const selected = extractions.find((e) => String(e._id) === String(selectedId));

  async function loadExtractions() {
    try {
      const json = await apiRequest("/api/lottery/extractions");
      if (json.ok) {
        setExtractions(json.data || []);
        if (!selectedId && json.data?.length) setSelectedId(json.data[0]._id);
      }
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    loadExtractions();
  }, []);

  function notify(m) { setMsg(m); setError(null); }
  function fail(e) { setError(e?.message || String(e)); setMsg(null); }

  return (
    <div className="lottery-panel">
      <div className="lottery-toolbar">
        <label>
          Estrazione:
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">-- nuova --</option>
            {extractions.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name} ({e.ticketCount || 0} bigl.)
              </option>
            ))}
          </select>
        </label>
        <button onClick={loadExtractions}>Aggiorna</button>
      </div>

      {error && <div className="error-text">{error}</div>}
      {msg && <div className="success-text">{msg}</div>}

      <CreateExtractionForm onCreated={(doc) => { loadExtractions(); setSelectedId(doc._id); notify("Estrazione creata"); }} onError={fail} />

      {selectedId && (
        <>
          <nav className="page-tabs">
            {["config", "tickets", "prizes", "draw", "winners"].map((t) => (
              <button key={t} className={`role-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
                {t === "config" ? "Configurazione" : t === "tickets" ? "Biglietti" : t === "prizes" ? "Premi" : t === "draw" ? "Estrazione" : "Vincitori"}
              </button>
            ))}
          </nav>
          <div className="lottery-tab">
            {tab === "config" && <ConfigTab extractionId={selectedId} onError={fail} onMsg={notify} />}
            {tab === "tickets" && <TicketsTab extractionId={selectedId} onError={fail} onMsg={notify} />}
            {tab === "prizes" && <PrizesTab extractionId={selectedId} onError={fail} onMsg={notify} />}
            {tab === "draw" && <DrawTab extractionId={selectedId} onError={fail} onMsg={notify} />}
            {tab === "winners" && <WinnersTab extractionId={selectedId} onError={fail} />}
          </div>
        </>
      )}
    </div>
  );
}

function CreateExtractionForm({ onCreated, onError }) {
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const json = await apiRequest("/api/lottery/extractions", {
        method: "POST",
        body: JSON.stringify({ name, startDate: start || null, endDate: end || null })
      });
      if (json.ok) {
        onCreated(json.data);
        setName(""); setStart(""); setEnd("");
      }
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-form" style={{ marginTop: 12 }}>
      <h3>Nuova estrazione</h3>
      <input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
      <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      <button onClick={create} disabled={busy}>Crea</button>
    </div>
  );
}

function ConfigTab({ extractionId, onError, onMsg }) {
  const [count, setCount] = useState(10000);
  const [symbolsCount, setSymbolsCount] = useState(40);
  const [bookletSize, setBookletSize] = useState(100);
  const [report, setReport] = useState(null);
  const [symbols, setSymbols] = useState([]);
  const [booklets, setBooklets] = useState([]);
  const [busy, setBusy] = useState(false);

  async function seed() {
    setBusy(true);
    try {
      const json = await apiRequest(`/api/lottery/extractions/${extractionId}/symbols/seed`, {
        method: "POST",
        body: JSON.stringify({ count: symbolsCount })
      });
      onMsg(`Simbolo ${json.data?.count || 0} seminati`);
      await loadSymbols();
    } catch (e) { onError(e); }
    finally { setBusy(false); }
  }

  async function loadSymbols() {
    try {
      const json = await apiRequest(`/api/lottery/extractions/${extractionId}/symbols`);
      if (json.ok) setSymbols(json.data || []);
    } catch (e) { onError(e); }
  }

  async function generate() {
    setBusy(true);
    try {
      const json = await apiRequest(`/api/lottery/extractions/${extractionId}/generate`, {
        method: "POST",
        body: JSON.stringify({ count, symbolsCount, bookletSize })
      });
      if (json.ok) {
        setReport(json.data.report);
        onMsg(`Generati ${json.data.count} biglietti (${json.data.startNumber}-${json.data.endNumber})`);
        await loadBooklets();
      }
    } catch (e) { onError(e); }
    finally { setBusy(false); }
  }

  async function loadBooklets() {
    try {
      const json = await apiRequest(`/api/lottery/extractions/${extractionId}/booklets`);
      if (json.ok) setBooklets(json.data || []);
    } catch (e) { onError(e); }
  }

  async function markAllSold() {
    setBusy(true);
    try {
      const json = await apiRequest(`/api/lottery/extractions/${extractionId}/tickets/sell`, {
        method: "POST",
        body: JSON.stringify({ all: true })
      });
      onMsg("Tutti i biglietti segnati come venduti");
    } catch (e) { onError(e); }
    finally { setBusy(false); }
  }

  useEffect(() => { loadSymbols(); loadBooklets(); }, [extractionId]);

  return (
    <div>
      <div className="admin-form">
        <h3>Simbolo</h3>
        <button onClick={seed} disabled={busy}>Semina simbolo ({symbolsCount})</button>
        <span> ({symbols.length} presenti)</span>
      </div>
      <div className="admin-form">
        <h3>Generazione biglietti</h3>
        <label>Quantità <input type="number" value={count} onChange={(e) => setCount(Number(e.target.value))} /></label>
        <label>Simbolo <input type="number" value={symbolsCount} onChange={(e) => setSymbolsCount(Number(e.target.value))} /></label>
        <label>Blocchetto <input type="number" value={bookletSize} onChange={(e) => setBookletSize(Number(e.target.value))} /></label>
        <button onClick={generate} disabled={busy}>Genera</button>
        <button onClick={markAllSold} disabled={busy}>Segna tutti venduti</button>
      </div>
      {report && (
        <div className="admin-form">
          <h3>Report validazione</h3>
          <p>Totale: {report.totalTickets} — Valido: {report.isValid ? "SÌ" : "NO"}</p>
          {report.errors?.length > 0 && <ul>{report.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
        </div>
      )}
      <div className="admin-form">
        <h3>Blocchetti ({booklets.length})</h3>
        <ul style={{ maxHeight: 120, overflow: "auto" }}>
          {booklets.slice(0, 20).map((b) => <li key={b._id}>#{b.number}: {b.fromNum}-{b.toNum}</li>)}
        </ul>
      </div>
    </div>
  );
}

function TicketsTab({ extractionId, onError, onMsg }) {
  const [tickets, setTickets] = useState([]);
  const [status, setStatus] = useState("");
  const [bookletNo, setBookletNo] = useState("");

  async function load() {
    try {
      const q = status ? `?status=${status}` : "";
      const json = await apiRequest(`/api/lottery/extractions/${extractionId}/tickets${q}`);
      if (json.ok) setTickets(json.data || []);
    } catch (e) { onError(e); }
  }

  useEffect(() => { load(); }, [extractionId, status]);

  async function markBooklet() {
    try {
      const json = await apiRequest(`/api/lottery/extractions/${extractionId}/tickets/sell`, {
        method: "POST",
        body: JSON.stringify({ bookletNumber: Number(bookletNo) })
      });
      onMsg(`Aggiornati ${json.data?.updated}`);
      load();
    } catch (e) { onError(e); }
  }

  return (
    <div>
      <div className="admin-form">
        <label>Stato
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">tutti</option>
            <option value="available">disponibili</option>
            <option value="sold">venduti</option>
            <option value="winning">vincenti</option>
          </select>
        </label>
        <button onClick={load}>Aggiorna</button>
        <span> ({tickets.length} biglietti)</span>
      </div>
      <div className="admin-form">
        <label>Blocchetto n. <input value={bookletNo} onChange={(e) => setBookletNo(e.target.value)} /></label>
        <button onClick={markBooklet}>Segna blocchetto venduto</button>
      </div>
      <ul style={{ maxHeight: 200, overflow: "auto" }}>
        {tickets.slice(0, 50).map((t) => (
          <li key={t._id}>#{t.number} {t.serial} [{(t.symbols || []).join(",")}] {t.status}</li>
        ))}
      </ul>
    </div>
  );
}

function PrizesTab({ extractionId, onError, onMsg }) {
  const [prizes, setPrizes] = useState([]);
  const [name, setName] = useState("");
  const [symbolId, setSymbolId] = useState("");
  const [value, setValue] = useState("");

  async function load() {
    try {
      const json = await apiRequest(`/api/lottery/extractions/${extractionId}/prizes`);
      if (json.ok) setPrizes(json.data || []);
    } catch (e) { onError(e); }
  }
  useEffect(() => { load(); }, [extractionId]);

  async function add() {
    try {
      await apiRequest(`/api/lottery/extractions/${extractionId}/prizes`, {
        method: "POST",
        body: JSON.stringify({ name, symbolId: symbolId ? Number(symbolId) : null, value })
      });
      setName(""); setSymbolId(""); setValue("");
      onMsg("Premio creato");
      load();
    } catch (e) { onError(e); }
  }

  async function remove(id) {
    try {
      await apiRequest(`/api/lottery/prizes/${id}`, { method: "DELETE" });
      load();
    } catch (e) { onError(e); }
  }

  return (
    <div>
      <div className="admin-form">
        <input placeholder="Nome premio" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Simbolo (id)" value={symbolId} onChange={(e) => setSymbolId(e.target.value)} />
        <input placeholder="Valore" value={value} onChange={(e) => setValue(e.target.value)} />
        <button onClick={add}>Aggiungi premio</button>
      </div>
      <ul>
        {prizes.map((p) => (
          <li key={p._id}>
            {p.name} (simbolo {p.symbolId ?? "-"}) {p.value} <button onClick={() => remove(p._id)}>Elimina</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DrawTab({ extractionId, onError, onMsg }) {
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [drawn, setDrawn] = useState(null);
  const [finalists, setFinalists] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [prizeId, setPrizeId] = useState("");
  const [symbolId, setSymbolId] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadSessions() {
    try {
      const json = await apiRequest(`/api/lottery/draw/sessions?extractionId=${extractionId}`);
      if (json.ok) setSessions(json.data || []);
    } catch (e) { onError(e); }
  }
  async function loadPrizes() {
    try {
      const json = await apiRequest(`/api/lottery/extractions/${extractionId}/prizes`);
      if (json.ok) setPrizes(json.data || []);
    } catch (e) { onError(e); }
  }
  useEffect(() => { loadSessions(); loadPrizes(); }, [extractionId]);

  async function createSession() {
    setBusy(true);
    try {
      const json = await apiRequest("/api/lottery/draw/sessions", {
        method: "POST",
        body: JSON.stringify({ extractionId })
      });
      if (json.ok) {
        setSessionId(json.data._id);
        onMsg("Sessione creata");
        loadSessions();
      }
    } catch (e) { onError(e); }
    finally { setBusy(false); }
  }

  async function draw() {
    if (!sessionId) return;
    setBusy(true);
    try {
      const json = await apiRequest(`/api/lottery/draw/sessions/${sessionId}/draw-cards`, { method: "POST" });
      if (json.ok) {
        setDrawn(json.data.drawn);
        setFinalists(json.data.finalists || []);
        onMsg("Carte estratte");
      }
    } catch (e) { onError(e); }
    finally { setBusy(false); }
  }

  async function assign() {
    if (!sessionId || !prizeId || !symbolId) return;
    setBusy(true);
    try {
      const json = await apiRequest(`/api/lottery/draw/sessions/${sessionId}/assign-prize`, {
        method: "POST",
        body: JSON.stringify({ prizeId, symbolId: Number(symbolId) })
      });
      if (json.ok) {
        onMsg(`Vincitore: ${json.data.winner.serial} (candidati: ${json.data.candidateCount})`);
      }
    } catch (e) { onError(e); }
    finally { setBusy(false); }
  }

  async function close() {
    if (!sessionId) return;
    try {
      await apiRequest(`/api/lottery/draw/sessions/${sessionId}/close`, { method: "POST" });
      onMsg("Sessione chiusa");
    } catch (e) { onError(e); }
  }

  return (
    <div>
      <div className="admin-form">
        <label>Sessione
          <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            <option value="">--</option>
            {sessions.map((s) => <option key={s._id} value={s._id}>{s._id} {s.closed ? "(chiusa)" : ""}</option>)}
          </select>
        </label>
        <button onClick={createSession} disabled={busy}>Nuova sessione</button>
        <button onClick={draw} disabled={busy || !sessionId}>Estrai 40 carte</button>
        <button onClick={close} disabled={!sessionId}>Chiudi sessione</button>
      </div>
      {finalists.length > 0 && (
        <div className="admin-form">
          <h3>5 finaliste</h3>
          <p>{finalists.map((f) => f.id ?? f).join(", ")}</p>
        </div>
      )}
      <div className="admin-form">
        <h3>Assegna premio</h3>
        <label>Premio
          <select value={prizeId} onChange={(e) => setPrizeId(e.target.value)}>
            <option value="">--</option>
            {prizes.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </label>
        <label>Simbolo <input value={symbolId} onChange={(e) => setSymbolId(e.target.value)} placeholder="id simbolo" /></label>
        <button onClick={assign} disabled={busy}>Assegna</button>
      </div>
    </div>
  );
}

function WinnersTab({ extractionId, onError }) {
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [winners, setWinners] = useState([]);

  async function loadSessions() {
    try {
      const json = await apiRequest(`/api/lottery/draw/sessions?extractionId=${extractionId}`);
      if (json.ok) setSessions(json.data || []);
    } catch (e) { onError(e); }
  }
  useEffect(() => { loadSessions(); }, [extractionId]);

  async function loadWinners() {
    if (!sessionId) return;
    try {
      const json = await apiRequest(`/api/lottery/draw/sessions/${sessionId}/winners`);
      if (json.ok) setWinners(json.data || []);
    } catch (e) { onError(e); }
  }
  useEffect(() => { loadWinners(); }, [sessionId]);

  return (
    <div>
      <div className="admin-form">
        <label>Sessione
          <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            <option value="">--</option>
            {sessions.map((s) => <option key={s._id} value={s._id}>{s._id}</option>)}
          </select>
        </label>
        <button onClick={loadWinners}>Aggiorna</button>
      </div>
      <ul>
        {winners.map((w, i) => (
          <li key={i}>Premio {w.prizeId} — Biglietto #{w.ticketNumber} {w.serial} (simbolo {w.symbolId}, candidati {w.candidateCount})</li>
        ))}
      </ul>
    </div>
  );
}
