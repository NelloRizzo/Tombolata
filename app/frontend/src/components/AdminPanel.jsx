import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";
import GameManager from "./GameManager.jsx";
import MediaUpload from "./MediaUpload.jsx";

const ROLES = ["admin", "director", "video", "audio", "drawer", "actor"];

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: "", password: "", displayName: "", roles: [] });
  const [error, setError] = useState(null);

  async function load() {
    try {
      const u = await apiRequest("/api/auth/users");
      if (u.ok) setUsers(u.data);
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
        body: JSON.stringify({ ...form })
      });
      setForm({ username: "", password: "", displayName: "", roles: [] });
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
              <span className="tab-sub">{u.displayName} · {u.roles.join(", ")}</span>
            </div>
            <button className="btn-sm btn-ghost" onClick={() => remove(u._id)}>Rimuovi</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminCast({ ws }) {
  const gameId = ws.game?._id;
  const [actors, setActors] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [actorForm, setActorForm] = useState({ name: "", description: "", object: "" });
  const [selUser, setSelUser] = useState("");
  const [selCharacter, setSelCharacter] = useState("");
  const [error, setError] = useState(null);

  async function load() {
    try {
      const [cast, assigns, us] = await Promise.all([
        apiRequest(`/api/game/${gameId}/actors`),
        apiRequest(`/api/game/${gameId}/assignments`),
        apiRequest("/api/auth/users")
      ]);
      if (cast.ok) setActors(cast.data.actors);
      if (assigns.ok) setAssignments(assigns.data);
      if (us.ok) setUsers(us.data);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { if (gameId) { setError(null); load(); } }, [gameId]);

  if (!gameId) {
    return (
      <div className="admin-section">
        <p className="empty">Nessuna partita attiva. Il cast appartiene alla partita:
          crea una partita (Regia → Partite) e poi gestisci qui i personaggi.</p>
      </div>
    );
  }

  async function createActor() {
    setError(null);
    try {
      await apiRequest(`/api/game/${gameId}/actors`, { method: "POST", body: JSON.stringify(actorForm) });
      setActorForm({ name: "", description: "", object: "" });
      load();
    } catch (e) { setError(e.message); }
  }

  async function removeActor(index) {
    try {
      await apiRequest(`/api/game/${gameId}/actors/${index}`, { method: "DELETE" });
      load();
    } catch (e) { setError(e.message); }
  }

  async function assign() {
    setError(null);
    try {
      await apiRequest(`/api/game/${gameId}/assignments`, {
        method: "POST",
        body: JSON.stringify({ userId: selUser, character: selCharacter })
      });
      setSelUser("");
      setSelCharacter("");
      load();
    } catch (e) { setError(e.message); }
  }

  async function unassign(userId) {
    try {
      await apiRequest(`/api/game/${gameId}/assignments/${userId}`, { method: "DELETE" });
      load();
    } catch (e) { setError(e.message); }
  }

  const activeActors = actors.filter((a) => a.active !== false);
  const userName = (id) => users.find((u) => u._id === id)?.username || id;

  return (
    <div className="admin-section">
      {error && <div className="error-text">{error}</div>}

      <div className="admin-form">
        <input placeholder="Nome personaggio (es. Totonno)" value={actorForm.name}
          onChange={(e) => setActorForm({ ...actorForm, name: e.target.value })} />
        <input placeholder="Descrizione" value={actorForm.description}
          onChange={(e) => setActorForm({ ...actorForm, description: e.target.value })} />
        <input placeholder="Oggetto personale" value={actorForm.object}
          onChange={(e) => setActorForm({ ...actorForm, object: e.target.value })} />
        <button className="btn-sm btn-accent" onClick={createActor}>Aggiungi al cast</button>
      </div>

      <div className="tab-list">
        {actors.length === 0 && <p className="empty">Il cast di questa partita è vuoto.</p>}
        {actors.map((a, i) => (
          <div className="tab-item" key={a.name}>
            <div className="tab-item-info">
              <span className="tab-name">{a.name} {a.active === false ? "(inattivo)" : ""}</span>
              <span className="tab-sub">{a.object ? `oggetto: ${a.object}` : a.description}</span>
            </div>
            <button className="btn-sm btn-ghost" onClick={() => removeActor(i)}>Rimuovi</button>
          </div>
        ))}
      </div>

      <div className="cast-assign-head">
        <h3>Chi interpreta chi</h3>
        <div className="admin-form">
          <select value={selUser} onChange={(e) => setSelUser(e.target.value)}>
            <option value="">Utente...</option>
            {users.map((u) => <option key={u._id} value={u._id}>{u.username}</option>)}
          </select>
          <select value={selCharacter} onChange={(e) => setSelCharacter(e.target.value)}>
            <option value="">Personaggio...</option>
            {activeActors.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
          </select>
          <button className="btn-sm btn-accent" onClick={assign}>Associa</button>
        </div>
      </div>

      <div className="tab-list">
        {assignments.length === 0 && <p className="empty">Nessuna associazione: gli attori non hanno ancora un personaggio per questa partita.</p>}
        {assignments.map((as) => (
          <div className="tab-item" key={as.userId}>
            <div className="tab-item-info">
              <span className="tab-name">{userName(as.userId)}</span>
              <span className="tab-sub">{as.character}</span>
            </div>
            <button className="btn-sm btn-ghost" onClick={() => unassign(as.userId)}>Non associa</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TriggerForm({ gameId, onDone }) {
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
    if (!gameId) return;
    (async () => {
      const json = await apiRequest(`/api/game/${gameId}/actors`).catch(() => ({ ok: false }));
      if (json.ok) setActors(json.data.actors);
    })();
  }, [gameId]);

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
          actionRef: form.actionRef || "",
          gameId: gameId || null
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
          {actors.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
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

export function AdminTriggers({ gameId }) {
  const [triggers, setTriggers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const q = gameId ? `?gameId=${gameId}` : "";
      const json = await apiRequest(`/api/triggers${q}`);
      if (json.ok) setTriggers(json.data);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, [gameId]);

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
      {showForm && <TriggerForm gameId={gameId} onDone={() => { setShowForm(false); load(); }} />}
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

const EFFECT_TYPES = [
  { value: "flash", label: "Flash (bianco)" },
  { value: "zoom", label: "Zoom" },
  { value: "fade", label: "Dissolvenza" },
  { value: "particles", label: "Particelle" },
  { value: "shake", label: "Scuotimento" },
  { value: "glitch", label: "Glitch" }
];

function VideoForm({ gameId, video, onDone }) {
  const [form, setForm] = useState({
    name: video?.name || "",
    description: video?.description || "",
    source: video?.source || "",
    aspectRatio: video?.aspectRatio || "16:9",
    autoCloseOnEnd: video ? video.autoCloseOnEnd !== false : true,
    effects: video?.effects || []
  });
  const [fx, setFx] = useState({ type: "flash", intensity: 0.5, duration: 1000 });
  const [error, setError] = useState(null);

  async function save() {
    setError(null);
    try {
      const payload = { ...form };
      if (video) {
        await apiRequest(`/api/videos/${video._id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest("/api/videos", {
          method: "POST",
          body: JSON.stringify({ ...payload, gameId: gameId || null })
        });
      }
      onDone();
    } catch (e) { setError(e.message); }
  }

  function addEffect() {
    const fx2 = { ...fx, intensity: Number(fx.intensity), duration: Number(fx.duration) };
    setForm((f) => ({ ...f, effects: [...f.effects, fx2] }));
  }

  function removeEffect(i) {
    setForm((f) => ({ ...f, effects: f.effects.filter((_, idx) => idx !== i) }));
  }

  return (
    <div className="admin-form">
      {error && <div className="error-text">{error}</div>}
      <input placeholder="Nome video" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input placeholder="URL / file sorgente" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
      <MediaUpload
        label="Carica video (Cloudinary)"
        resourceType="video"
        onUploaded={(url) => setForm((f) => ({ ...f, source: url }))}
      />
      <input placeholder="Descrizione" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

      <label>
        <input
          type="checkbox"
          checked={form.autoCloseOnEnd}
          onChange={(e) => setForm({ ...form, autoCloseOnEnd: e.target.checked })}
        />
        {" "}Chiudi automaticamente al termine
      </label>

      <label>Effetti</label>
      <div className="fx-editor">
        <select value={fx.type} onChange={(e) => setFx({ ...fx, type: e.target.value })}>
          {EFFECT_TYPES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <label>Durata (ms)
          <input type="number" min="100" step="100" value={fx.duration}
            onChange={(e) => setFx({ ...fx, duration: parseInt(e.target.value) || 0 })} />
        </label>
        <label>Intensità
          <input type="range" min="0" max="1" step="0.1" value={fx.intensity}
            onChange={(e) => setFx({ ...fx, intensity: parseFloat(e.target.value) })} />
        </label>
        <button type="button" className="btn-sm btn-accent" onClick={addEffect}>+ Aggiungi</button>
      </div>
      {form.effects.length > 0 && (
        <ul className="fx-list">
          {form.effects.map((e, i) => (
            <li key={i}>
              <span>{e.type} · {e.duration}ms · {e.intensity}</span>
              <button className="btn-sm btn-ghost" onClick={() => removeEffect(i)}>Rimuovi</button>
            </li>
          ))}
        </ul>
      )}

      <button className="btn-sm btn-accent" onClick={save}>
        {video ? "Salva modifiche" : "Aggiungi video"}
      </button>
    </div>
  );
}

export function AdminVideos({ gameId }) {
  const [videos, setVideos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const q = gameId ? `?gameId=${gameId}` : "";
      const json = await apiRequest(`/api/videos${q}`);
      if (json.ok) setVideos(json.data);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, [gameId]);

  async function remove(id) {
    try {
      await apiRequest(`/api/videos/${id}`, { method: "DELETE" });
      load();
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="admin-section">
      {error && <div className="error-text">{error}</div>}
      <button className="btn-sm btn-accent" onClick={() => { setEditing(null); setShowForm((v) => !v); }}>
        {showForm ? "Chiudi" : "+ Nuovo video"}
      </button>
      {(showForm && !editing) && <VideoForm gameId={gameId} onDone={() => { setShowForm(false); load(); }} />}
      {editing && <VideoForm gameId={gameId} video={editing} onDone={() => { setEditing(null); setShowForm(false); load(); }} />}
      <div className="tab-list">
        {videos.map((v) => (
          <div className="tab-item" key={v._id}>
            <div className="tab-item-info">
              <span className="tab-name">{v.name}</span>
              <span className="tab-sub">{v.source}</span>
              {v.effects?.length > 0 && <span className="tab-sub">{v.effects.map((e) => e.type).join(", ")}</span>}
            </div>
            <button className="btn-sm" onClick={() => { setShowForm(false); setEditing(v); }}>Modifica</button>
            <button className="btn-sm btn-ghost" onClick={() => remove(v._id)}>Rimuovi</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SoundForm({ onDone, gameId }) {
  const [form, setForm] = useState({ name: "", category: "generico", kind: "synth", fileUrl: "", synth: { type: "sine", frequency: 440, duration: 1, gain: 0.3 } });
  const [error, setError] = useState(null);

  async function create() {
    setError(null);
    try {
      const payload = {
        ...form,
        name: form.name,
        fileUrl: form.kind === "file" ? form.fileUrl : null,
        gameId: gameId || null
      };
      await apiRequest("/api/sounds", { method: "POST", body: JSON.stringify(payload) });
      onDone();
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="admin-form">
      {error && <div className="error-text">{error}</div>}
      <input placeholder="Nome suono" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input placeholder="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
      <div className="sound-kind-row">
        <button className={`btn-sm ${form.kind === "synth" ? "btn-accent" : ""}`} onClick={() => setForm({ ...form, kind: "synth" })}>Sintetizzato</button>
        <button className={`btn-sm ${form.kind === "file" ? "btn-accent" : ""}`} onClick={() => setForm({ ...form, kind: "file" })}>File audio</button>
      </div>
      {form.kind === "file" ? (
        <>
          <input placeholder="URL file audio (Cloudinary)" value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} />
          <MediaUpload
            label="Carica audio (Cloudinary)"
            resourceType="video"
            mediaType="sounds"
            gameId={gameId}
            onUploaded={(url) => setForm((f) => ({ ...f, kind: "file", fileUrl: url }))}
          />
        </>
      ) : (
        <>
          <label>Frequenza (Hz)</label>
          <input type="number" value={form.synth.frequency} onChange={(e) => setForm({ ...form, synth: { ...form.synth, frequency: parseInt(e.target.value) } })} />
          <label>Durata (s)</label>
          <input type="number" step="0.1" value={form.synth.duration} onChange={(e) => setForm({ ...form, synth: { ...form.synth, duration: parseFloat(e.target.value) } })} />
        </>
      )}
      <button className="btn-sm btn-accent" onClick={create}>Aggiungi suono</button>
    </div>
  );
}

export function AdminSounds({ gameId }) {
  const [sounds, setSounds] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const q = gameId ? `?gameId=${gameId}` : "";
      const json = await apiRequest(`/api/sounds${q}`);
      if (json.ok) setSounds(json.data);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, [gameId]);

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
      {showForm && <SoundForm gameId={gameId} onDone={() => { setShowForm(false); load(); }} />}
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
  { key: "users", label: "Utenti", render: (ws) => <AdminUsers /> },
  { key: "cast", label: "Cast", render: (ws) => <AdminCast ws={ws} /> },
  { key: "triggers", label: "Trigger", render: (ws) => <AdminTriggers gameId={ws.game?._id} /> },
  { key: "videos", label: "Video", render: (ws) => <AdminVideos gameId={ws.game?._id} /> },
  { key: "sounds", label: "Suoni", render: (ws) => <AdminSounds gameId={ws.game?._id} /> }
];

export default function AdminPanel({ ws }) {
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
        return <div key={s.key}>{s.render(ws)}</div>;
      })}
    </div>
  );
}
