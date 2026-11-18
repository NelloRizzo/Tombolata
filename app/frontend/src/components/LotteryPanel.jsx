import { useEffect, useState } from "react";
import { apiRequest, authHeaders } from "../api.js";
import { apiUrl } from "../hooks/useWebSocket.js";

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
    <div className="admin-section lottery-panel">
      <div className="admin-form">
        <h3>Estrazione attiva</h3>
        <label>
          Estrazione
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">-- nuova estrazione --</option>
            {extractions.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name} ({e.ticketCount || 0} biglietti)
              </option>
            ))}
          </select>
        </label>
        <button className="btn-sm btn-ghost" onClick={loadExtractions}>Aggiorna elenco</button>
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
    <div className="admin-form">
      <h3>Nuova estrazione</h3>
      <label>
        Nome estrazione
        <input placeholder="Es. Lotteria Natale 2026" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Data inizio
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      </label>
      <label>
        Data fine
        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      </label>
      <button className="btn-sm btn-accent" onClick={create} disabled={busy}>Crea estrazione</button>
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
      onMsg(`Semina completata: ${json.data?.count || 0} simbolo`);
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
      await apiRequest(`/api/lottery/extractions/${extractionId}/tickets/sell`, {
        method: "POST",
        body: JSON.stringify({ all: true })
      });
      onMsg("Tutti i biglietti segnati come venduti");
    } catch (e) { onError(e); }
    finally { setBusy(false); }
  }

  async function downloadPdf() {
    try {
      const res = await fetch(apiUrl(`/api/lottery/extractions/${extractionId}/booklets/pdf`), { headers: authHeaders() });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `blocchetti-${extractionId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { onError(e); }
  }

  useEffect(() => { loadSymbols(); loadBooklets(); }, [extractionId]);

  return (
    <div>
      <div className="admin-form">
        <h3>Simbolo</h3>
        <label>
          Numero simbolo
          <input type="number" value={symbolsCount} onChange={(e) => setSymbolsCount(Number(e.target.value))} />
        </label>
        <button className="btn-sm btn-accent" onClick={seed} disabled={busy}>Semina simbolo</button>
        <span className="tab-sub">Presenti: {symbols.length}</span>
      </div>
      <div className="admin-form">
        <h3>Generazione biglietti</h3>
        <label>
          Quantità biglietti
          <input type="number" value={count} onChange={(e) => setCount(Number(e.target.value))} />
        </label>
        <label>
          Simbolo
          <input type="number" value={symbolsCount} onChange={(e) => setSymbolsCount(Number(e.target.value))} />
        </label>
        <label>
          Biglietti per blocchetto
          <input type="number" value={bookletSize} onChange={(e) => setBookletSize(Number(e.target.value))} />
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn-sm btn-accent" onClick={generate} disabled={busy}>Genera biglietti</button>
          <button className="btn-sm btn-ghost" onClick={markAllSold} disabled={busy}>Segna tutti venduti</button>
          <button className="btn-sm btn-ghost" onClick={downloadPdf}>Scarica PDF blocchetti</button>
        </div>
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
        <ul className="tab-list" style={{ maxHeight: 160, overflow: "auto" }}>
          {booklets.map((b) => (
            <li className="tab-item" key={b._id}>
              <div className="tab-item-info">
                <span className="tab-name">Blocchetto #{b.number}</span>
                <span className="tab-sub">Biglietti {b.fromNum} - {b.toNum}</span>
              </div>
            </li>
          ))}
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
      onMsg(`Aggiornati ${json.data?.updated} biglietti`);
      load();
    } catch (e) { onError(e); }
  }

  return (
    <div>
      <div className="admin-form">
        <label>
          Filtra per stato
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">tutti</option>
            <option value="available">disponibili</option>
            <option value="sold">venduti</option>
            <option value="winning">vincenti</option>
          </select>
        </label>
        <button className="btn-sm btn-ghost" onClick={load}>Aggiorna</button>
        <span className="tab-sub">Totale: {tickets.length}</span>
      </div>
      <div className="admin-form">
        <label>
          Blocchetto n.
          <input value={bookletNo} onChange={(e) => setBookletNo(e.target.value)} placeholder="Es. 1" />
        </label>
        <button className="btn-sm btn-accent" onClick={markBooklet}>Segna blocchetto venduto</button>
      </div>
      <ul className="tab-list" style={{ maxHeight: 240, overflow: "auto" }}>
        {tickets.slice(0, 80).map((t) => (
          <li className="tab-item" key={t._id}>
            <div className="tab-item-info">
              <span className="tab-name">#{t.number} — {t.serial}</span>
              <span className="tab-sub">{(t.symbols || []).join(", ")} · {t.status}</span>
            </div>
          </li>
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
        <h3>Nuovo premio</h3>
        <label>
          Nome premio
          <input placeholder="Es. Primo premio" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          ID simbolo
          <input placeholder="Es. 7" value={symbolId} onChange={(e) => setSymbolId(e.target.value)} />
        </label>
        <label>
          Valore
          <input placeholder="Es. 500 €" value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <button className="btn-sm btn-accent" onClick={add}>Aggiungi premio</button>
      </div>
      <ul className="tab-list">
        {prizes.map((p) => (
          <li className="tab-item" key={p._id}>
            <div className="tab-item-info">
              <span className="tab-name">{p.name}</span>
              <span className="tab-sub">Simbolo {p.symbolId ?? "-"} · {p.value}</span>
            </div>
            <button className="btn-sm btn-ghost" onClick={() => remove(p._id)}>Elimina</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DrawTab({ extractionId, onError, onMsg }) {
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [batchSize, setBatchSize] = useState(5);
  const [display, setDisplay] = useState(null);
  const [prizes, setPrizes] = useState([]);
  const [prizeId, setPrizeId] = useState("");
  const [symbolId, setSymbolId] = useState("");
  const [revealSerial, setRevealSerial] = useState("");
  const [revealBooklet, setRevealBooklet] = useState("");
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
  async function loadDisplay() {
    try {
      const json = await apiRequest("/api/lottery/display");
      if (json.ok) setDisplay(json.data);
    } catch (e) { onError(e); }
  }
  useEffect(() => { loadSessions(); loadPrizes(); loadDisplay(); }, [extractionId]);

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

  async function prepare() {
    if (!sessionId) return;
    setBusy(true);
    try {
      const json = await apiRequest("/api/lottery/display/prepare", {
        method: "POST",
        body: JSON.stringify({ sessionId, batchSize })
      });
      if (json.ok) {
        setDisplay(json.data);
        onMsg(`Estrazione preparata (batch di ${batchSize})`);
      }
    } catch (e) { onError(e); }
    finally { setBusy(false); }
  }

  async function nextBatch() {
    setBusy(true);
    try {
      const json = await apiRequest("/api/lottery/display/batch", { method: "POST" });
      if (json.ok) {
        setDisplay(json.data);
        const drawn = (json.data.drawn || []).length;
        const total = (json.data.pool || []).length || 40;
        onMsg(drawn >= total ? "Estrazione simbodo completata" : `Estratti ${drawn}/${total}`);
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
        const prize = prizes.find((p) => String(p._id) === String(prizeId));
        await apiRequest("/api/lottery/display", {
          method: "POST",
          body: JSON.stringify({
            active: true,
            sessionId,
            winnerSerial: json.data.winner.serial,
            winnerNumber: json.data.winner.number,
            prizeName: prize?.name || "",
            status: "winner"
          })
        });
        loadDisplay();
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

  const drawnCount = (display?.drawn || []).length;
  const total = (display?.pool || []).length || 40;
  const done = display && drawnCount >= total && total > 0;

  return (
    <div>
      <div className="admin-form">
        <h3>Sessione di estrazione</h3>
        <label>
          Sessione
          <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            <option value="">-- seleziona --</option>
            {sessions.map((s) => <option key={s._id} value={s._id}>Estrazione #{s.number || "?"} {s.closed ? "(chiusa)" : ""}</option>)}
          </select>
        </label>
        <label>
          Simbodo per estrazione (N)
          <input type="number" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} min={1} max={40} />
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn-sm btn-accent" onClick={createSession} disabled={busy}>Nuova sessione</button>
          <button className="btn-sm btn-accent" onClick={prepare} disabled={busy || !sessionId}>Prepara estrazione</button>
          <button className="btn-sm btn-accent" onClick={nextBatch} disabled={busy || !display?.active || display?.status !== "drawing"}>Estrai prossimi {batchSize}</button>
          <button className="btn-sm btn-ghost" onClick={async () => {
            try {
              await apiRequest("/api/lottery/display", {
                method: "POST",
                body: JSON.stringify({ active: true, sessionId, status: "finalists" })
              });
              onMsg("Finaliste presentate sul tabellone");
            } catch (e) { onError(e); }
          }} disabled={!done}>Presenta finaliste</button>
          <button className="btn-sm btn-ghost" onClick={async () => {
            try {
              await apiRequest("/api/lottery/display/clear", { method: "POST" });
              setDisplay(null);
              onMsg("Presentazione rimossa dal tabellone");
            } catch (e) { onError(e); }
          }}>Nascondi dal tabellone</button>
          <button className="btn-sm btn-ghost" onClick={close} disabled={!sessionId}>Chiudi sessione</button>
        </div>
        {display?.active && (
          <div className="tab-sub" style={{ marginTop: 8 }}>
            Estratti {drawnCount}/{total} {done ? "— FINALISTI: " + (display.finalists || []).join(", ") : ""}
          </div>
        )}
      </div>

      <div className="admin-form">
        <h3>Assegna premio</h3>
        <label>
          Premio
          <select value={prizeId} onChange={(e) => setPrizeId(e.target.value)}>
            <option value="">-- seleziona premio --</option>
            {prizes.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </label>
        <label>
          ID simbodo
          <input value={symbolId} onChange={(e) => setSymbolId(e.target.value)} placeholder="Es. 7" />
        </label>
        <button className="btn-sm btn-accent" onClick={assign} disabled={busy || !prizeId || !symbolId}>Assegna premio</button>
      </div>

      <div className="admin-form">
        <h3>Reveal cifra a cifra (biglietto / blocchetto)</h3>
        <label>
          Numero biglietto (seriale)
          <input value={revealSerial} onChange={(e) => setRevealSerial(e.target.value)} placeholder="Es. AAB-012" />
        </label>
        <label>
          Numero blocchetto
          <input value={revealBooklet} onChange={(e) => setRevealBooklet(e.target.value)} placeholder="Es. 7" />
        </label>
        <button className="btn-sm btn-accent" onClick={async () => {
          try {
            await apiRequest("/api/lottery/display/reveal", {
              method: "POST",
              body: JSON.stringify({ serial: revealSerial, booklet: revealBooklet })
            });
            onMsg("Reveal avviato sul tabellone");
          } catch (e) { onError(e); }
        }} disabled={!revealSerial && !revealBooklet}>Avvia reveal cifre</button>
        <span className="tab-sub">Il tabellone rivelerà il seriale e il blocchetto cifra a cifra.</span>
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
      // winners endpoint requires auth; apiRequest already sends token
      if (json.ok) setWinners(json.data || []);
    } catch (e) { onError(e); }
  }
  useEffect(() => { loadWinners(); }, [sessionId]);

  return (
    <div>
      <div className="admin-form">
        <label>
          Sessione
          <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            <option value="">-- seleziona --</option>
            {sessions.map((s) => <option key={s._id} value={s._id}>{s._id}</option>)}
          </select>
        </label>
        <button className="btn-sm btn-ghost" onClick={loadWinners}>Aggiorna vincitori</button>
      </div>
      <ul className="tab-list">
        {winners.map((w, i) => (
          <li className="tab-item" key={i}>
            <div className="tab-item-info">
              <span className="tab-name">Premio {String(w.prizeId).slice(-6)}</span>
              <span className="tab-sub">Biglietto #{w.ticketNumber} — {w.serial} · Simbolo {w.symbolId} · Candidati {w.candidateCount}</span>
            </div>
          </li>
        ))}
        {winners.length === 0 && <li className="tab-sub">Nessun vincitore registrato.</li>}
      </ul>
    </div>
  );
}
