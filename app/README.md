# Tombolata di Natale

Piattaforma web per gestire una tombolata dal vivo con **tabellone pubblico** (schermo grande), **console regia multi-ruolo** e **sistema narrativo a trigger**, sincronizzati in tempo reale tramite WebSocket. Più dispositivi nella sala possono visualizzare lo stesso tabellone.

## Struttura

```
app/
├── backend/     # API + WebSocket (Node.js + Express + MongoDB)
└── frontend/    # UI React (Vite)
```

## Funzionalità

- **Tabellone pubblico** (`/`): griglia 9x10, lista numeri estratti, ultimo numero animato, notifiche vincite, suoni.
- **Autenticazione multi-ruolo** (JWT): ogni utente può avere più ruoli e la sua dashboard si popola di conseguenza.
- **Rilevamento vincite automatico**: ambo, terno, quaterna, cinquina, tombola per ogni cartella.
- **Sistema trigger narrativi**: condizioni su numeri/decine/terminazioni/vincite/conteggio, attivazione automatica o manuale dal regista.
- **Player video fullscreen con effetti speciali**: sostituisce il tabellone con un video in riproduzione (flash, zoom, fade, shake, glitch, particelle).
- **Console audio (fonico)**: catalogo di suoni, riproduzione sincronizzata su tutti i dispositivi.
- **Attori**: personaggi definiti dall'admin, ognuno con i propri trigger (cue) personali.
- **Persistenza**: MongoDB Atlas (utenti, partite, attori, trigger, video, suoni, narrazione).

## Ruoli

| Ruolo | Dashboard / permessi |
|-------|----------------------|
| **admin** | Gestione completa: utenti, attori, trigger, video, suoni |
| **regista** | Fase narrativa, trigger manuali, avvio video, partite |
| **video** | Controllo riproduzione player (play/pausa/stop) |
| **fonico** | Console audio (catalogo + riproduzione) |
| **drawer** | Estrazione numeri + gestione cartelle |
| **attore** | Cue personali per il proprio personaggio |
| **spettatore** | Tabellone e vincite (sola lettura) |

Un utente può appartenere a più ruoli: accede a `https://.../console` e naviga tra le sue postazioni.

## Trigger — condizioni disponibili

| Tipo | Descrizione |
|------|-------------|
| `number` | Esce un numero specifico (es. 47) |
| `termination` | Numero che termina con una certa cifra (es. 2) |
| `dozen` | Numero appartenente a una decina 1-9 (es. 6 = 51-60) |
| `range` | Numero in un intervallo |
| `win` | Si verifica una vincita (ambo/terno/quaterna/cinquina/tombola) |
| `count` | Dopo N estrazioni |

Ogni trigger ha: fase narrativa, gruppo/i di condizioni, tipo azione (`live`/`video`/`sound`/`effect`), attore target, priorità, e fallback (`forceAfterExtractions`).

## Fasi narrative

`prologue` → `post-ambo` → `post-terno` → `post-quaterna` → `post-cinquina` → `finale` → `live`

La fase avanza automaticamente quando si verifica una vincita e viene trasmessa in tempo reale.

## Sviluppo locale

Serve **MongoDB Atlas** (free tier). Crea un cluster e ottieni la connection string.

### Backend

```bash
cd backend
cp .env.example .env   # inserisci MONGODB_URI (e modifica ADMIN_PASSWORD)
npm install
npm run dev            # porta 3001
```

Al primo avvio crea automaticamente i **personaggi di default** e l'utente **admin** (da `ADMIN_USERNAME`/`ADMIN_PASSWORD`, default `admin`/`admin`).

### Frontend

```bash
cd frontend
cp .env.example .env   # VITE_BACKEND_URL=http://localhost:3001
npm install
npm run dev            # porta 5173
```

### Test backend

```bash
cd backend
npm test               # usa mongodb-memory-server, non serve Atlas
```

## Deploy su Render.com

Sono previsti **3 servizi**:

| Servizio | Tipo | Dove |
|----------|------|------|
| MongoDB Atlas | Database (free M0) | atlas.mongodb.com |
| tombolata-backend | Web Service (Node) | render.com |
| tombolata-frontend | Static Site (React) | render.com |

### 1. MongoDB Atlas
Creare un cluster **M0 (free)**. Creare un database user e ottenere la connection string.

### 2. Backend (Web Service)
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Root Directory**: `backend`
- Variabili d'ambiente:
  - `MONGODB_URI` = la connection string Atlas (es. `mongodb+srv://...`)
  - `MONGODB_DB_NAME` = `tombolata`
  - `PORT` = `10000`
  - `JWT_SECRET` = stringa casuale lunga
  - `ADMIN_USERNAME` / `ADMIN_PASSWORD` = credenziali admin (cambiale subito)

Annotati l'URL del backend (es. `https://tombolata-backend.onrender.com`).

### 3. Frontend (Static Site)
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Root Directory**: `frontend`
- Variabile d'ambiente:
  - `VITE_BACKEND_URL` = URL del backend, es. `https://tombolata-backend.onrender.com`

## Utilizzo

- **Tabellone pubblico**: apri l'URL del frontend, es. `https://tombolata.onrender.com` (nessun login richiesto per lo schermo grande).
- **Console regia**: stesso URL + `/console`, es. `https://tombolata.onrender.com/console` (login richiesto).

Dopo il login, seleziona la postazione dal menu dei ruoli. Tutti i dispositivi si sincronizzano via WebSocket in tempo reale.
