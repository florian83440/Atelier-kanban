// Wrapper WebSocket : connexion, file d'attente hors-ligne, reconnexion avec backoff,
// bus d'evenements minimal. Un seul socket pour toute l'app.

import { reactive } from 'vue';

export const netStatus = reactive({
  connected: false,
  reconnecting: false,
  everConnected: false,
});

const listeners = new Map(); // type -> Set<cb> ; '*' recoit tout

let ws = null;
let url = null;
let outbox = [];
let retry = 0;
let reconnectTimer = null;

export function onMsg(type, cb) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(cb);
  return () => listeners.get(type)?.delete(cb);
}

function emit(msg) {
  listeners.get(msg.type)?.forEach((cb) => cb(msg));
  listeners.get('*')?.forEach((cb) => cb(msg));
}

export function connect(serverUrl) {
  url = serverUrl;
  open();
}

function open() {
  clearTimeout(reconnectTimer);
  try {
    ws = new WebSocket(url);
  } catch {
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    netStatus.connected = true;
    netStatus.reconnecting = false;
    netStatus.everConnected = true;
    retry = 0;
    const pending = outbox;
    outbox = [];
    pending.forEach((m) => send(m));
    emit({ type: 'open' });
  };

  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    emit(msg);
  };

  ws.onclose = () => {
    netStatus.connected = false;
    scheduleReconnect();
  };

  ws.onerror = () => { /* onclose suivra */ };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  netStatus.reconnecting = true;
  retry = Math.min(retry + 1, 6);
  const delay = Math.min(1000 * 2 ** (retry - 1), 10000);
  reconnectTimer = setTimeout(() => { reconnectTimer = null; open(); }, delay);
}

export function send(obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  } else {
    outbox.push(obj);
  }
}
