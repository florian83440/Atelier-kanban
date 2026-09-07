import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { handleMessage, handleDisconnect, tick } from './game.js';

const PORT = Number(process.env.PORT) || 8080;

// Origines autorisees a ouvrir un WebSocket (CSV). Vide = toutes (dev / LAN).
// En prod derriere quai : ALLOWED_ORIGINS=https://kanban.example.com
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Serveur HTTP explicite : bind 0.0.0.0 (contrat quai) + endpoint de
// healthcheck sans dependance (sonde de bascule quai + healthcheck Traefik).
const server = createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/healthz' || req.url === '/')) {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('not found');
});

const wss = new WebSocketServer({
  server,
  verifyClient: ({ origin }) => {
    if (ALLOWED_ORIGINS.length === 0) return true;
    return !origin || ALLOWED_ORIGINS.includes(origin);
  },
});

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    try {
      handleMessage(ws, msg);
    } catch (e) {
      console.error('handleMessage error:', e);
      try { ws.send(JSON.stringify({ type: 'error', message: 'Erreur serveur.' })); } catch {}
    }
  });

  ws.on('close', () => {
    try { handleDisconnect(ws); } catch (e) { console.error('handleDisconnect error:', e); }
  });

  ws.on('error', () => {});
});

setInterval(() => {
  try { tick(); } catch (e) { console.error('tick error:', e); }
}, 1000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Kanban IT — serveur WebSocket sur ws://0.0.0.0:${PORT} (health: /healthz)`);
});
