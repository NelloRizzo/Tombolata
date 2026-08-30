import { getActiveGame } from "./gameService.js";

// Invia un evento via WebSocket.
// - gameId: se specificato, l'evento va SOLO ai client connessi a quella
//   partita (client.gameId === gameId); i client "legacy" senza gameId lo
//   ricevono solo se la partita in questione è quella attiva.
// - Nessun gameId: invia a tutti (eventi globali).
export async function broadcastToClients(wss, type, payload, gameId) {
  if (!wss) return;
  const message = JSON.stringify({ type, payload });
  let activeId = null;
  if (gameId) {
    const active = await getActiveGame();
    activeId = active ? String(active._id) : null;
  }
  wss.clients.forEach((client) => {
    if (client.readyState !== 1) return;
    if (!gameId) {
      client.send(message);
      return;
    }
    const c = client.gameId || null;
    if (c === gameId || (c === null && activeId === gameId)) {
      client.send(message);
    }
  });
}

// Legge il gameId di una richiesta (body > query > params).
export function resolveGameId(req) {
  return req.body?.gameId || req.query?.gameId || req.params?.gameId || null;
}