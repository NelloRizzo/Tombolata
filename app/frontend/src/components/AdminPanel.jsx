import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";

const ROLES = ["admin", "regista", "video", "fonico", "drawer", "attore", "spettatore"];

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [actors, setActors] = useState([]);
  const [form, setForm] = useState({ username: "", password: "", displayName: "", roles: ["spettatore"], character: "" });
  const [error, setError] = useState(null);

  async function load() {
    try {
      const [u, a] = await Promise.all([apiRequest("/api/auth/users"), apiRequest("/api/actors")]);
      if (u.ok) setUsers(u.data);
      if (a.ok) setActors(a.data);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => { load(); }, []);

  function toggleRole(r) {
    setForm((f) => {
      const roles = f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r];
      return { ...f, roles };
    });
  }

  async function create() {
    setError(null);
    try {
      await apiRequest("/api/auth/users", {
        method: "POST",
        body: JSON.stringify({ ...form, character: form.character || null })
      });
      setForm({ username: "", password: "", displayName: "", roles: ["spettatore"], character: "" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(id) {
    try {
      await apiRequest(`/api/auth/users/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="admin-section">
      {error && <div className="error-text">{error}</div>}
      <div className="admin-form">
        <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <input placeholder="Nome visualizzato" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
        <select value={form.character || ""} onChange={(e) => setForm({ ...form, character: e.target.value })}>
          <option value="">Nessun personaggio</option>
          {actors.map((a) => <option key={a._id} value={a.name}>{a.name}</option>)}
        </select>
        <div className="role-checkboxes">
          {ROLES.map((r) => (
            <label key={r} className="role-check">
              <input type="checkbox" checked={form.roles.includes(r)} onChange={() => toggleRole(r)} />
              {r}
            </label>
          ))}
        </div>
        <button className="btn-sm btn-accent" onClick={create}>Crea utente</button>
      </div>

      <div className="tab-list">
        {users.map((u) => (
          <div className="tab-item" key={u._id}>
            <div className="tab-item-info">
              <span className="tab-name">{u.username}</span>
              <span className="tab-sub">{u.displayName} · {u.roles.join(", ")} {u.character ? `· ${u.character}` : ""}</span>
            </div>
            <button className="btn-sm btn-ghost" onClick={() => remove(u._id)}>Rimuovi</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminActors() {
  const [actors, setActors] = useState([]);
  const [form, setForm] = useState({ name: "", description: "", object: "" });
  const [error, setError] = useState(null);

  async function load() {
    try {
      const json = await apiRequest("/api/actors");
      if (json.ok) setActors(json.data);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setError(null);
    try {
      await apiRequest("/api/actors", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", description: "", object: "" });
      load();
    } catch (e) { setError(e.message); }
  }

  async function remove(id) {
    try {
      await apiRequest(`/api/actors/${id}`, { method: "DELETE" });
      load();
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="admin-section">
      {error && <div className="error-text">{error}</div>}
      <div className="admin-form">
        <input placeholder="Nome personaggio (es. Totonno)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Descrizione" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input placeholder="Oggetto personale" value={form.object} onChange={(e) => setForm({ ...form, object: e.target.value })} />
        <button className="btn-sm btn-accent" onClick={create}>Crea attore</button>
      </div>
      <div className="tab-list">
        {actors.map((a) => (
          <div className="tab-item" key={a._id}>
            <div className="tab-item-info">
              <span className="tab-name">{a.name}</span>
              <span className="tab-sub">{a.object && `oggetto: ${a.object}`}</span>
            </div>
            <button className="btn-sm btn-ghost" onClick={() => remove(a._id)}>Rimuovi</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TriggerForm({ onDone }) {
  const [actors, setActors] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    phase: "always",
    actionType: "live",
    actionRef: "",
    targetActor: "",
    conditions: [{ operator: "and", conditions: [{ type: "number", value: null }] }],
    order: 0,
    autoMode: true,
    active: true
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      const json = await apiRequest("/api/actors").catch(() => ({ ok: false }));
      if (json.ok) setActors(json.data);
    })();
  }, []);

  const cond = form.conditions[0];

  const COND_LABELS = {
    number: "Numero specifico",
    termination: "Terminazione",
    dozen: "Decina",
    range: "Range",
    win: "Vincita",
    count: "N° estrazione"
  };

  function setCondType(type) {
    setForm((f) => ({
      ...f,
      conditions: [{ operator: f.conditions[0].operator, conditions: [{ type, value: null }] }]
    }));
  }

  function setCondValue(value) {
    setForm((f) => ({
      ...f,
      conditions: [{ operator: f.conditions[0].operator, conditions: [{ type: cond.type, value }] }]
    }));
  }

  async function create() {
    setError(null);
    try {
      await apiRequest("/api/triggers", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          targetActor: form.targetActor || null,
          actionRef: form.actionRef || ""
        })
      });
      onDone();
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="admin-form trigger-form">
      {error && <div className="error-text">{error}</div>}
      <input placeholder="Nome trigger" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input placeholder="Descrizione" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

      <label>Fase</label>
      <select value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })}>
        {["always", "prologue", "post-ambo", "post-terno", "post-quaterna", "post-cinquina", "finale", "live"].map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      <label>Azione</label>
      <select value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value })}>
        <option value="live">Live (attore)</option>
        <option value="video">Video</option>
        <option value="sound">Suono</option>
        <option value="effect">Effetto</option>
      </select>

      {form.actionType === "live" && (
        <select value={form.targetActor} onChange={(e) => setForm({ ...form, targetActor: e.target.value })}>
          <option value="">Personaggio...</option>
          {actors.map((a) => <option key={a._id} value={a.name}>{a.name}</option>)}
        </select>
      )}

      <label>Condizione</label>
      <select value={cond.type} onChange={(e) => setCondType(e.target.value)}>
        {Object.entries(COND_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>

      {cond.type === "number" && (
        <input type="number" min="1" max="90" placeholder="Numero (es. 47)" value={cond.value ?? ""}
          onChange={(e) => setCondValue(parseInt(e.target.value))} />
      )}
      {cond.type === "termination" && (
        <input type="number" min="0" max="9" placeholder="Cifra finale (es. 2)" value={cond.value ?? ""}
          onChange={(e) => setCondValue(parseInt(e.target.value))} />
      )}
      {cond.type === "dozen" && (
        <input type="number" min="1" max="9" placeholder="Decina 1-9 (es. 6 = 51-60)" value={cond.value ?? ""}
          onChange={(e) => setCondValue(parseInt(e.target.value))} />
      )}
      {cond.type === "win" && (
        <select value={cond.value || ""} onChange={(e) => setCondValue(e.target.value)}>
          <option value="">Vincita...</option>
          {["ambo", "terno", "quaterna", "cinquina", "tombola"].map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
      )}
      {cond.type === "count" && (
        <input type="number" min="1" max="90" placeholder="N° estrazione (es. 50)" value={cond.value ?? ""}
          onChange={(e) => setCondValue(parseInt(e.target.value))} />
      )}

      <button className="btn-sm btn-accent" onClick={create}>Crea trigger</button>
    </div>
  );
}

function AdminTriggers() {
  const [triggers, setTriggers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const json = await apiRequest("/api/triggers");
      if (json.ok) setTriggers(json.data);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function remove(id) {
    try {
      await apiRequest(`/api/triggers/${id}`, { method: "DELETE" });
      load();
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="admin-section">
      {error && <div className="error-text">{error}</div>}
      <button className="btn-sm btn-accent" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Chiudi" : "+ Nuovo trigger"}
      </button>
      {showForm && <TriggerForm onDone={() => { setShowForm(false); load(); }} />}
      <div className="tab-list">
        {triggers.map((t) => (
          <div className="tab-item" key={t._id}>
            <div className="tab-item-info">
              <span className="tab-name">{t.name}</span>
              <span className="tab-sub">{t.phase} · {t.actionType} · {t.fired} volte</span>
            </div>
            <button className="btn-sm btn-ghost" onClick={() => remove(t._id)}>Rimuovi</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function VideoForm({ onDone }) {
  const [form, setForm] = useState({ name: "", description: "", source: "", aspectRatio: "16:9" });
  const [error, setError] = useState(null);

  async function create() {
    setError(null);
    try {
      await apiRequest("/api/videos", { method: "POST", body: JSON.stringify(form) });
      onDone();
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="admin-form">
      {error && <div className="error-text">{error}</div>}
      <input placeholder="Nome video" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input placeholder="URL / file sorgente" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
      <input placeholder="Descrizione" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <button className="btn-sm btn-accent" onClick={create}>Aggiungi video</button>
    </div>
  );
}

function AdminVideos() {
  const [videos, setVideos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const json = await apiRequest("/api/videos");
      if (json.ok) setVideos(json.data);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function remove(id) {
    try {
      await apiRequest(`/api/videos/${id}`, { method: "DELETE" });
      load();
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="admin-section">
      {error && <div className="error-text">{error}</div>}
      <button className="btn-sm btn-accent" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Chiudi" : "+ Nuovo video"}
      </button>
      {showForm && <VideoForm onDone={() => { setShowForm(false); load(); }} />}
      <div className="tab-list">
        {videos.map((v) => (
          <div className="tab-item" key={v._id}>
            <div className="tab-item-info">
              <span className="tab-name">{v.name}</span>
              <span className="tab-sub">{v.source}</span>
            </div>
            <button className="btn-sm btn-ghost" onClick={() => remove(v._id)}>Rimuovi</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SoundForm({ onDone }) {
  const [form, setForm] = useState({ name: "", category: "generico", kind: "synth", synth: { type: "sine", frequency: 440, duration: 1, gain: 0.3 } });
  const [error, setError] = useState(null);

  async function create() {
    setError(null);
    try {
      await apiRequest("/api/sounds", { method: "POST", body: JSON.stringify(form) });
      onDone();
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="admin-form">
      {error && <div className="error-text">{error}</div>}
      <input placeholder="Nome suono" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input placeholder="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
      <label>Frequenza (Hz)</label>
      <input type="number" value={form.synth.frequency} onChange={(e) => setForm({ ...form, synth: { ...form.synth, frequency: parseInt(e.target.value) } })} />
      <label>Durata (s)</label>
      <input type="number" step="0.1" value={form.synth.duration} onChange={(e) => setForm({ ...form, synth: { ...form.synth, duration: parseFloat(e.target.value) } })} />
      <button className="btn-sm btn-accent" onClick={create}>Aggiungi suono</button>
    </div>
  );
}

function AdminSounds() {
  const [sounds, setSounds] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const json = await apiRequest("/api/sounds");
      if (json.ok) setSounds(json.data);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function remove(id) {
    try {
      await apiRequest(`/api/sounds/${id}`, { method: "DELETE" });
      load();
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="admin-section">
      {error && <div className="error-text">{error}</div>}
      <button className="btn-sm btn-accent" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Chiudi" : "+ Nuovo suono"}
      </button>
      {showForm && <SoundForm onDone={() => { setShowForm(false); load(); }} />}
      <div className="tab-list">
        {sounds.map((s) => (
          <div className="tab-item" key={s._id}>
            <div className="tab-item-info">
              <span className="tab-name">{s.name}</span>
              <span className="tab-sub">{s.category}</span>
            </div>
            <button className="btn-sm btn-ghost" onClick={() => remove(s._id)}>Rimuovi</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const SECTIONS = [
  { key: "users", label: "Utenti", component: AdminUsers },
  { key: "actors", label: "Attori", component: AdminActors },
  { key: "triggers", label: "Trigger", component: AdminTriggers },
  { key: "videos", label: "Video", component: AdminVideos },
  { key: "sounds", label: "Suoni", component: AdminSounds }
];

export default function AdminPanel() {
  const [section, setSection] = useState("users");

  return (
    <div className="admin-panel">
      <nav className="admin-tabs">
        {SECTIONS.map((s) => (
          <button key={s.key} className={`admin-tab ${section === s.key ? "active" : ""}`} onClick={() => setSection(s.key)}>
            {s.label}
          </button>
        ))}
      </nav>
      {SECTIONS.map((s) => {
        if (s.key !== section) return null;
        const Comp = s.component;
        return <Comp key={s.key} />;
      })}
    </div>
  );
}
