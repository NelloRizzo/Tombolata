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
- **Persistenza**: MongoDB (utenti, partite, attori, trigger, video, suoni, narrazione) + upload media su filesystem locale.

## Ruoli

| Ruolo | Dashboard / permessi |
|-------|----------------------|
| **admin** | Gestione completa: utenti, attori, trigger, video, suoni |
| **director** | Fase narrativa, trigger manuali, avvio video, partite |
| **video** | Controllo riproduzione player (play/pausa/stop) |
| **audio** | Console audio (catalogo + riproduzione) |
| **drawer** | Estrazione numeri + gestione cartelle |
| **actor** | Cue personali per il proprio personaggio |

Un utente può appartenere a più ruoli: accede a `https://.../console` e naviga tra le sue postazioni. Chi non ha ruoli operativi vede comunque la postazione **Tabellone** (sola lettura) in console.

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

## Deploy locale con Docker

L'intera applicazione (backend + frontend + MongoDB) gira in container definiti
dal `docker-compose.yml` presente nella root del progetto.

### Build e avvio

Dalla root del progetto:

```bash
docker compose up --build
```

Questo avvia tre servizi:

| Servizio  | Esposto su   | Descrizione                                   |
|-----------|--------------|-----------------------------------------------|
| `mongo`   | `27017`      | Database MongoDB (volume persistente `mongodb_data`) |
| `backend` | `3001`       | API + WebSocket (Node/Express)                |
| `frontend`| `8080`       | Sito statico servito da nginx + proxy API/WS  |

### Accesso

- **Tabellone pubblico**: `http://localhost:8080` (nessun login)
- **Console regia**: `http://localhost:8080/console` (login)

Le credenziali admin di default sono `admin`/`admin` (configurabili tramite le
variabili `ADMIN_USERNAME`/`ADMIN_PASSWORD` in `docker-compose.yml`).

### Persistenza

- **Database**: volume `mongodb_data` → non si perde al riavvio dei container.
- **Upload media**: volume `uploads_data` (cartella `/app/uploads` nel backend,
  servita sotto `/uploads`). I file rimangono anche dopo un `docker compose down`.

### Admin / altri comandi

```bash
docker compose down          # ferma i container (dati preservati)
docker compose down -v       # ferma ED elimina i volumi (azzera tutto)
docker compose logs -f       # log di tutti i servizi in tempo reale
```

## Utilizzo

- **Tabellone pubblico**: apri l'URL del frontend (nessun login richiesto per lo schermo grande).
- **Console regia**: stesso URL + `/console` (login richiesto).

Dopo il login, seleziona la postazione dal menu dei ruoli. Tutti i dispositivi si sincronizzano via WebSocket in tempo reale.
