import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import { connectDB, getDbStatus } from "./services/db.js";
import gameRoutes from "./routes/game.js";
import authRoutes from "./routes/auth.js";
import triggerRoutes from "./routes/triggers.js";
import videoRoutes from "./routes/videos.js";
import soundRoutes from "./routes/sounds.js";
import { getGameState } from "./services/gameService.js";
import { getNarrationState } from "./services/triggerService.js";
import { bootstrap } from "./services/bootstrap.js";
import { broadcastToClients } from "./services/broadcast.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "tombolata-backend",
    db: getDbStatus() ? "connected" : "disconnected",
    time: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.json({ ok: true, db: getDbStatus() ? "connected" : "disconnected" });
});

app.use("/api/auth", authRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/triggers", triggerRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/sounds", soundRoutes);

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });
app.set("wss", wss);

// Export mantenuto per compatibilità: invia l'evento a tutti.
function broadcast(type, payload) {
  return broadcastToClients(wss, type, payload, null);
}

wss.on("connection", async (ws) => {
  // Canale per partita: il client si connette con ?gameId=xxx e riceve solo
  // gli eventi della propria partita (null = partita attiva, legacy).
  const query = (ws.url || "").split("?")[1] || "";
  ws.gameId = new URLSearchParams(query).get("gameId") || null;
  console.log(`Nuovo client connesso via WebSocket (gameId: ${ws.gameId || "auto"})`);

  try {
    const state = await getGameState(ws.gameId);
    ws.send(JSON.stringify({ type: "game:state", payload: state }));
  } catch (error) {
    console.error("Errore nell'inviare lo stato iniziale:", error.message);
  }

  try {
    const narration = await getNarrationState(ws.gameId);
    ws.send(JSON.stringify({ type: "narration:state", payload: narration }));
  } catch (error) {
    console.error("Errore nell'inviare lo stato narrazione:", error.message);
  }

  ws.on("message", (raw) => {
    try {
      const message = JSON.parse(raw);
      if (message.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      }
    } catch (error) {
      // messaggio non JSON: ignoriamo
    }
  });

  ws.on("close", () => {
    console.log("Client disconnesso");
  });
});

async function start() {
  await connectDB();
  await bootstrap();

  server.listen(PORT, () => {
    console.log(`✓ Backend tombolata in ascolto sulla porta ${PORT}`);
  });
}

start().catch((error) => {
  console.error("Impossibile avviare il server:", error.message);
  process.exit(1);
});

export { broadcast };
