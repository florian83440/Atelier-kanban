// Aiguillage des messages WebSocket + diffusion de l'etat.
// Le serveur est autoritaire : il detient le GameState, cadence les sprints
// et renvoie des snapshots. Les clients n'envoient que des intentions.

import {
  acceptProject,
  assignStaff,
  unassignStaff,
  startGame,
  advanceSprint,
  adjustSprintTime,
  resetGame,
} from '@kanban-it/shared';
import {
  createRoom,
  getRoom,
  allRooms,
  deleteRoom,
  resolveTeam,
  addPlayer,
  findPlayerByToken,
  movePlayerToTeam,
} from './rooms.js';

const OPEN = 1;

function send(ws, obj) {
  if (ws && ws.readyState === OPEN) ws.send(JSON.stringify(obj));
}

function err(ws, message) {
  send(ws, { type: 'error', message });
}

// ---------------------------------------------------------------- snapshots

function teamSummary(team) {
  return {
    id: team.id,
    name: team.name,
    playerCount: team.players.length,
    delivered: team.totalDeliveredValue,
    penalties: team.totalPenalties,
    net: team.totalDeliveredValue - team.totalPenalties,
    completed: team.totalCompletedProjects,
    absent: team.activeMalus.length,
    inProgress: team.activeProjects.filter((p) => p.stage !== 'done').length,
    done: team.activeProjects.filter((p) => p.stage === 'done').length,
    drawnCard: team.drawnCard,
  };
}

function buildSnapshot(room, player) {
  const g = room.game;
  const meta = {
    code: g.code,
    phase: g.phase,
    sprint: g.sprint,
    totalSprints: g.totalSprints,
    sprintDuration: g.sprintDuration,
    sprintEndsAt: g.sprintEndsAt,
    serverNow: Date.now(),
  };
  const teamsSummary = Object.values(g.teams).map(teamSummary);
  const snap = {
    type: 'snapshot',
    you: { id: player.id, name: player.name, teamId: player.teamId, isHost: player.isHost },
    game: meta,
    teamsSummary,
  };
  if (player.isHost) {
    snap.teams = Object.values(g.teams); // etat complet de chaque equipe
  } else {
    snap.team = player.teamId ? g.teams[player.teamId] || null : null;
  }
  return snap;
}

export function broadcastRoom(room) {
  for (const player of room.players.values()) {
    send(player.ws, buildSnapshot(room, player));
  }
}

function sendGameOver(room) {
  for (const player of room.players.values()) {
    const payload = { type: 'gameOver', game: { code: room.game.code, totalSprints: room.game.totalSprints } };
    if (player.isHost) {
      payload.teams = Object.values(room.game.teams);
    } else {
      payload.team = player.teamId ? room.game.teams[player.teamId] || null : null;
    }
    send(player.ws, payload);
  }
}

// ---------------------------------------------------------------- connexion

function attach(ws, room, player) {
  if (player.ws && player.ws !== ws && player.ws.readyState === OPEN) {
    send(player.ws, { type: 'error', message: 'Session reprise sur un autre onglet.' });
  }
  player.ws = ws;
  player.connected = true;
  ws._ctx = { code: room.code, playerId: player.id };
}

function handleCreateGame(ws, msg) {
  const { room } = createRoom();
  const player = addPlayer(room, { name: msg.name || 'Hôte', teamId: null, isHost: true });
  attach(ws, room, player);
  send(ws, { type: 'created', code: room.code, token: player.token, you: { id: player.id, isHost: true } });
  broadcastRoom(room);
}

function handleJoinGame(ws, msg) {
  const room = getRoom(msg.code);
  if (!room) return err(ws, "Code de partie inconnu.");

  // Reconnexion par token
  const known = findPlayerByToken(room, msg.token);
  if (known) {
    attach(ws, room, known);
    if (msg.teamName && !known.isHost) {
      movePlayerToTeam(room, known, resolveTeam(room, msg.teamName));
    }
    send(ws, { type: 'joined', code: room.code, token: known.token, you: { id: known.id, isHost: known.isHost, teamId: known.teamId } });
    broadcastRoom(room);
    return;
  }

  if (msg.asHost) {
    const player = addPlayer(room, { name: msg.name, teamId: null, isHost: true });
    attach(ws, room, player);
    send(ws, { type: 'joined', code: room.code, token: player.token, you: { id: player.id, isHost: true, teamId: null } });
    broadcastRoom(room);
    return;
  }

  const teamId = resolveTeam(room, msg.teamName);
  if (!teamId) return err(ws, "Nom d'équipe requis.");
  const player = addPlayer(room, { name: msg.name, teamId, isHost: false });
  attach(ws, room, player);
  send(ws, { type: 'joined', code: room.code, token: player.token, you: { id: player.id, isHost: false, teamId } });
  broadcastRoom(room);
}

// ---------------------------------------------------------------- intents / controle

const PLAYER_INTENTS = new Set(['acceptProject', 'assignStaff', 'unassignStaff']);
const HOST_CONTROLS = new Set(['startGame', 'validateSprint', 'adjustTimer', 'resetGame']);

const INTENT_ERRORS = {
  wip: 'Colonne Analyse pleine (max 4) — impossible d\'accepter une nouvelle demande.',
  'not-found': 'Cette demande n\'existe plus (déjà prise ou sprint validé). Rechargez si besoin.',
  blocked: 'Ce membre est indisponible ou verrouillé sur une tâche.',
};

function ctx(ws) {
  if (!ws._ctx) return null;
  const room = getRoom(ws._ctx.code);
  if (!room) return null;
  const player = room.players.get(ws._ctx.playerId);
  if (!player) return null;
  return { room, player };
}

function handlePlayerIntent(ws, msg) {
  const c = ctx(ws);
  if (!c) return err(ws, 'Session expirée, rechargez la page.');
  const { room, player } = c;
  const team = player.teamId ? room.game.teams[player.teamId] : null;
  if (!team) return err(ws, "Vous n'êtes rattaché à aucune équipe.");

  let res = { ok: true };
  if (msg.type === 'acceptProject') res = acceptProject(team, msg.projectId, room.game.sprint);
  else if (msg.type === 'assignStaff') res = assignStaff(team, msg.staffId, msg.projectId);
  else if (msg.type === 'unassignStaff') res = unassignStaff(team, msg.staffId);

  if (res && res.ok === false) err(ws, INTENT_ERRORS[res.reason] || 'Action impossible.');
  broadcastRoom(room);
}

function handleHostControl(ws, msg) {
  const c = ctx(ws);
  if (!c) return err(ws, 'Session expirée, rechargez la page.');
  const { room, player } = c;
  if (!player.isHost) return err(ws, 'Action réservée à l\'hôte.');
  const g = room.game;

  if (msg.type === 'startGame') {
    if (Object.keys(g.teams).length === 0) return err(ws, 'Aucune équipe connectée.');
    if (g.phase === 'lobby') startGame(g);
  } else if (msg.type === 'validateSprint') {
    if (g.phase === 'running') advanceSprint(g);
  } else if (msg.type === 'adjustTimer') {
    const n = Number(msg.seconds);
    if (Number.isFinite(n) && n !== 0) adjustSprintTime(g, Math.max(-120, Math.min(120, n)));
  } else if (msg.type === 'resetGame') {
    resetGame(g);
  }

  broadcastRoom(room);
  if (g.phase === 'finished') sendGameOver(room);
}

// ---------------------------------------------------------------- entree publique

export function handleMessage(ws, msg) {
  if (!msg || typeof msg.type !== 'string') return;
  switch (msg.type) {
    case 'createGame': return handleCreateGame(ws, msg);
    case 'joinGame': return handleJoinGame(ws, msg);
    case 'ping': return send(ws, { type: 'pong', t: msg.t });
    default:
      if (PLAYER_INTENTS.has(msg.type)) return handlePlayerIntent(ws, msg);
      if (HOST_CONTROLS.has(msg.type)) return handleHostControl(ws, msg);
      return err(ws, `Message inconnu: ${msg.type}`);
  }
}

export function handleDisconnect(ws) {
  const c = ctx(ws);
  if (!c) return;
  const { room, player } = c;
  if (player.ws === ws) {
    player.connected = false;
    player.ws = null;
  }
  broadcastRoom(room);
}

// Minuteur : appele chaque seconde par index.js
export function tick() {
  const now = Date.now();
  for (const room of allRooms()) {
    const g = room.game;
    if (g.phase === 'running' && g.sprintEndsAt && now >= g.sprintEndsAt) {
      advanceSprint(g);
      broadcastRoom(room);
      if (g.phase === 'finished') sendGameOver(room);
    }
    // Menage : room vide et inactive depuis 30 min
    const anyConnected = [...room.players.values()].some((p) => p.connected);
    if (!anyConnected && now - room.createdAt > 30 * 60 * 1000) {
      deleteRoom(room.code);
    }
  }
}
