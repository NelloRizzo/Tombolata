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

Sono previsti **2 servizi**, gestiti da un unico **Blueprint** (`render.yaml` nella root del repo):

| Servizio | Tipo | Root dir | Publish |
|----------|------|----------|---------|
| tombolasolidale-api | Web Service (Node) | `backend` | — |
| tombolasolidale | Static Site (React) | `frontend` | `dist` |

Il Blueprint si collega al repo GitHub: **ogni push su `main` ridispiega automaticamente entrambi i servizi** (niente click manuali).

### 1. MongoDB Atlas
Creare un cluster **M0 (free)** sul sito Atlas, creare un database user e ottenere la connection string (es. `mongodb+srv://...`).

### 2. Creare il Blueprint su Render
1. Da app.render.com → **New → Blueprint**.
2. Connetti il repo GitHub `Tombolata`.
3. Render rileva `render.yaml` e propone i 2 servizi.
4. Al primo deploy Render **chiede i valori segreti** (`sync: false`): imposta
   `MONGODB_URI`, `JWT_SECRET` (stringa casuale lunga) e `ADMIN_PASSWORD`
   (cambia la password admin di default `admin`).
5. Avvia il deploy.

### 3. Verifica l'URL del backend
Dopo il primo deploy il backend ha l'URL `https://tombolasolidale-api.onrender.com`.

- Il frontend usa `VITE_BACKEND_URL` **a build-time** (iniettato da
  `vite.config.js`). Verifica che il valore in `render.yaml`
  (attualmente `https://tombolasolidale-api.onrender.com`) corrisponda
  all'URL reale del backend; se diverso, aggiornalo e fai un nuovo push.

### 4. Dopo
- Tabellone pubblico: `https://tombolasolidale.onrender.com`
- Console regia: `https://tombolasolidale.onrender.com/console`
- Deploy automatico: ogni `git push origin main` ridispiega i servizi.

> **Nota piano free**: i servizi free di Render si "addormentano" dopo
> ~15 minuti di inattività e si risvegliano al primo accesso (~30-60s di
> cold start). Va bene per la serata dal vivo, ma non è "always on".

## Utilizzo

- **Tabellone pubblico**: apri l'URL del frontend, es. `https://tombolata.onrender.com` (nessun login richiesto per lo schermo grande).
- **Console regia**: stesso URL + `/console`, es. `https://tombolata.onrender.com/console` (login richiesto).

Dopo il login, seleziona la postazione dal menu dei ruoli. Tutti i dispositivi si sincronizzano via WebSocket in tempo reale.
