// Aiguillage des messages WebSocket + diffusion de l'etat.
// Le serveur est autoritaire : il detient le GameState, cadence les sprints
// et renvoie des snapshots. Les clients n'envoient que des intentions.

import {
  acceptProject,
  rejectProject,
  renegotiateDeadline,
  hireStaff,
  assignStaff,
  unassignStaff,
  startGame,
  resumeSprint,
  advanceSprint,
  adjustSprintTime,
  resetGame,
  netValue,
  getAssignedDetails,
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
  normalizeSubRole,
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
    hiring: team.totalHiringCost || 0,
    net: netValue(team),
    completed: team.totalCompletedProjects,
    absent: team.activeMalus.length,
    inProgress: team.activeProjects.filter((p) => p.stage !== 'done').length,
    done: team.activeProjects.filter((p) => p.stage === 'done').length,
    drawnCard: team.drawnCard,
  };
}

// ------------------------------------------------------------ lentilles de role
// Les deux salles d'une meme equipe ne voient pas les memes informations.
//  - Direction : file d'appels d'offres + montants + suivi MACRO (pas d'effectif,
//    pas d'avancement fin, pas d'incident RH).
//  - Delivery  : board complet + effectif + incidents, mais AUCUN montant.

const EURO_RE = /[-+]?\s?\d[\d\s.  ]*\s*(?:k€|€)/g;
function maskAmounts(log) {
  return log.map((e) => ({ ...e, msg: e.msg.replace(EURO_RE, 'montant masqué') }));
}

const RH_RE = /(bloqué|indisponible|figé|FIGÉE|de retour|au complet|INCIDENT AUTOMATIQUE|MALUS|absent)/i;
function withoutRH(log) {
  return log.filter((e) => !RH_RE.test(e.msg));
}

// Vue Delivery : on retire les montants partout (valeur, encaissé, totaux, file).
function deliveryLens(team) {
  const stripProject = (p) => {
    const { value, baseValue, earned, ...rest } = p;
    return rest;
  };
  return {
    ...team,
    incomingProjects: [], // la file appartient a la Direction
    activeProjects: team.activeProjects.map(stripProject),
    totalDeliveredValue: null,
    totalPenalties: null,
    totalHiringCost: null,
    history: { labels: [], revenue: [], penalties: [], spending: [], staffUsage: team.history.staffUsage.slice() },
    log: maskAmounts(team.log),
  };
}

// Vue Direction : suivi macro (stade + drapeaux + echeance + montants), pas
// d'effectif ni d'avancement fin, pas d'incident RH.
function directionLens(team, sprint) {
  const macro = (p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    stage: p.stage,
    value: p.value,
    baseValue: p.baseValue,
    earned: p.earned,
    terms: p.terms,
    renegotiations: p.renegotiations || 0,
    margin: p.margin,
    totalTheoDur: p.totalTheoDur,
    acceptedSprint: p.acceptedSprint,
    maxSprintDeadline: p.maxSprintDeadline,
    hasMaintenanceBug: !!p.hasMaintenanceBug,
    overdue: p.stage !== 'done' && sprint > p.maxSprintDeadline,
    frozen: p.stage !== 'done' && getAssignedDetails(team, p).hasDisabledStaff,
    staffedCount: p.assigned.length,
  });
  return {
    ...team,
    staff: [],
    activeMalus: [],
    drawnCard: null,
    activeProjects: team.activeProjects.map(macro),
    log: withoutRH(team.log),
  };
}

function lensTeam(team, role, sprint) {
  if (!team) return null;
  if (role === 'delivery') return deliveryLens(team);
  if (role === 'direction') return directionLens(team, sprint);
  return team; // solo, liaison : vue complete
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
    paused: !!g.paused,
    serverNow: Date.now(),
  };
  const role = player.isHost ? 'host' : player.subRole || 'solo';
  const fullSummary = Object.values(g.teams).map(teamSummary);
  const teamsSummary = role === 'delivery'
    ? fullSummary.map((s) => ({ id: s.id, name: s.name, playerCount: s.playerCount, completed: s.completed, inProgress: s.inProgress, done: s.done }))
    : fullSummary;
  const snap = {
    type: 'snapshot',
    you: { id: player.id, name: player.name, teamId: player.teamId, isHost: player.isHost, subRole: role },
    game: meta,
    teamsSummary,
  };
  if (player.isHost) {
    snap.teams = Object.values(g.teams); // etat complet de chaque equipe
  } else {
    const full = player.teamId ? g.teams[player.teamId] || null : null;
    snap.team = lensTeam(full, role, g.sprint);
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
    if (msg.subRole && !known.isHost) known.subRole = normalizeSubRole(msg.subRole);
    send(ws, { type: 'joined', code: room.code, token: known.token, you: { id: known.id, isHost: known.isHost, teamId: known.teamId, subRole: known.subRole } });
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
  const player = addPlayer(room, { name: msg.name, teamId, isHost: false, subRole: msg.subRole });
  attach(ws, room, player);
  send(ws, { type: 'joined', code: room.code, token: player.token, you: { id: player.id, isHost: false, teamId, subRole: player.subRole } });
  broadcastRoom(room);
}

// ---------------------------------------------------------------- intents / controle

const PLAYER_INTENTS = new Set(['acceptProject', 'rejectProject', 'renegotiateDeadline', 'hireStaff', 'assignStaff', 'unassignStaff']);
const HOST_CONTROLS = new Set(['startGame', 'resumeSprint', 'validateSprint', 'adjustTimer', 'resetGame']);

// Qui a le droit de faire quoi selon le sous-role d'equipe.
const ROLE_INTENTS = {
  solo: PLAYER_INTENTS,
  direction: new Set(['acceptProject', 'rejectProject', 'renegotiateDeadline', 'hireStaff']),
  delivery: new Set(['assignStaff', 'unassignStaff']),
  liaison: new Set(), // passerelle : lecture seule
};

const INTENT_ERRORS = {
  wip: 'Colonne Analyse pleine (max 4) — impossible d\'accepter une nouvelle demande.',
  'not-found': 'Cette demande n\'existe plus (déjà prise ou sprint validé). Rechargez si besoin.',
  blocked: 'Ce membre est indisponible.',
  'bad-spec': 'Type de recrutement inconnu.',
  'not-running': 'La partie n\'a pas encore démarré.',
  'wrong-room': 'Cette action est gérée par l\'autre salle de votre équipe.',
  'too-late': 'Projet déjà livré — renégociation impossible.',
  'reneg-max': 'Ce contrat a déjà été renégocié au maximum.',
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

  const allowed = ROLE_INTENTS[player.subRole] || ROLE_INTENTS.solo;
  if (!allowed.has(msg.type)) return err(ws, INTENT_ERRORS['wrong-room']);

  let res = { ok: true };
  if (msg.type === 'acceptProject') res = acceptProject(team, msg.projectId, room.game.sprint, msg.terms || null);
  else if (msg.type === 'rejectProject') res = rejectProject(team, msg.projectId, room.game.sprint);
  else if (msg.type === 'renegotiateDeadline') res = renegotiateDeadline(team, msg.projectId, room.game.sprint);
  else if (msg.type === 'hireStaff') {
    res = room.game.phase === 'running'
      ? hireStaff(team, msg.kind, room.game.sprint)
      : { ok: false, reason: 'not-running' };
  } else if (msg.type === 'assignStaff') res = assignStaff(team, msg.staffId, msg.projectId);
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
  } else if (msg.type === 'resumeSprint') {
    if (g.phase === 'running' && g.paused) resumeSprint(g);
  } else if (msg.type === 'validateSprint') {
    if (g.phase === 'running' && !g.paused) advanceSprint(g);
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
    if (g.phase === 'running' && !g.paused && g.sprintEndsAt && now >= g.sprintEndsAt) {
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
