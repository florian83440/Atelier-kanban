// Store reactif alimente par les snapshots du serveur + actions (intents / controle hote).

import { reactive } from 'vue';
import { connect, onMsg, send, netStatus } from './socket.js';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || `ws://${location.hostname}:8080`;
// Session PAR ONGLET : sessionStorage n'est pas partage entre onglets (contrairement
// a localStorage) mais survit a un rechargement. Indispensable pour ouvrir plusieurs
// joueurs / equipes dans le meme navigateur sans qu'ils s'ecrasent mutuellement.
const LS_KEY = 'kanban-it-session';
const store = (() => {
  try {
    const t = window.sessionStorage;
    const k = '__kanban_probe__';
    t.setItem(k, '1'); t.removeItem(k);
    return t;
  } catch {
    return null;
  }
})();

export const state = reactive({
  mode: 'join', // 'join' | 'play' | 'host'
  code: null,
  token: null,
  you: null, // { id, name, teamId, isHost }
  game: null, // { code, phase, sprint, totalSprints, sprintDuration, sprintEndsAt, serverNow }
  team: null, // etat complet (joueur)
  teams: [], // etats complets (hote)
  teamsSummary: [],
  gameOver: null, // { team } (joueur) | { teams } (hote)
  clockOffset: 0, // serverNow - Date.now() au dernier snapshot
  error: null,
  pendingName: '',
  pickStaffId: null, // membre selectionne pour affectation par clic (pas de drag&drop)
});

export { netStatus };

function loadSession() {
  try { return JSON.parse(store?.getItem(LS_KEY)) || null; } catch { return null; }
}
function saveSession(patch) {
  const next = { ...(loadSession() || {}), ...patch };
  try { store?.setItem(LS_KEY, JSON.stringify(next)); } catch {}
  return next;
}
export function clearSession() {
  try { store?.removeItem(LS_KEY); } catch {}
  Object.assign(state, {
    mode: 'join', code: null, token: null, you: null, game: null,
    team: null, teams: [], teamsSummary: [], gameOver: null, error: null,
  });
}

let started = false;
export function initNet() {
  if (started) return;
  started = true;
  connect(SERVER_URL);

  onMsg('open', () => {
    const s = loadSession();
    if (s?.code && s?.token) {
      send({ type: 'joinGame', code: s.code, token: s.token, name: s.name, teamName: s.teamName, asHost: s.asHost });
    }
  });

  onMsg('created', (m) => {
    saveSession({ code: m.code, token: m.token, name: state.pendingName, asHost: true, teamName: null });
    state.code = m.code;
    state.token = m.token;
    state.mode = 'host';
    state.error = null;
  });

  onMsg('joined', (m) => {
    saveSession({ code: m.code, token: m.token, asHost: m.you.isHost });
    state.code = m.code;
    state.token = m.token;
    state.mode = m.you.isHost ? 'host' : 'play';
    state.error = null;
  });

  onMsg('snapshot', (m) => {
    state.you = m.you;
    state.game = m.game;
    state.teamsSummary = m.teamsSummary || [];
    state.team = m.team || null;
    state.teams = m.teams || [];
    state.gameOver = null;
    if (m.game) {
      state.code = m.game.code;
      state.clockOffset = (m.game.serverNow || Date.now()) - Date.now();
    }
    state.mode = m.you.isHost ? 'host' : 'play';
  });

  onMsg('gameOver', (m) => { state.gameOver = m; });

  onMsg('error', (m) => { state.error = m.message; });
}

// ---- actions joueur -------------------------------------------------
export function createGame(name) {
  state.pendingName = name;
  send({ type: 'createGame', name });
}
export function joinGame({ name, code, teamName }) {
  const up = String(code || '').trim().toUpperCase();
  saveSession({ name, teamName, code: up, asHost: false });
  send({ type: 'joinGame', code: up, name, teamName });
}
export function acceptProject(projectId) { send({ type: 'acceptProject', projectId }); }
export function rejectProject(projectId) { send({ type: 'rejectProject', projectId }); }
export function hireDev(spec) { send({ type: 'hireDev', spec }); }
export function assignStaff(staffId, projectId) { send({ type: 'assignStaff', staffId, projectId }); }
export function unassignStaff(staffId) { send({ type: 'unassignStaff', staffId }); }

// --- affectation par clic (selection d'un pion puis clic sur un projet) -----
export function togglePick(staffId) {
  state.pickStaffId = state.pickStaffId === staffId ? null : staffId;
}
export function clearPick() { state.pickStaffId = null; }
export function assignPicked(projectId) {
  if (!state.pickStaffId) return;
  assignStaff(state.pickStaffId, projectId);
  state.pickStaffId = null;
}

// Sprints de blocage restants pour un membre (0 si disponible).
export function malusLeft(team, staffId) {
  const m = team?.activeMalus?.find((x) => x.staffId === staffId);
  return m ? m.duration : 0;
}

// ---- actions hote -------------------------------------------------
export function hostStart() { send({ type: 'startGame' }); }
export function hostValidate() { send({ type: 'validateSprint' }); }
export function hostAdjustTimer(seconds) { send({ type: 'adjustTimer', seconds }); }
export function hostReset() { send({ type: 'resetGame' }); }
