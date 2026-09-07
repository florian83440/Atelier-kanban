// Gestion en memoire des parties (rooms) et de leurs joueurs.

import { randomUUID } from 'node:crypto';
import { createGameState, createTeamState } from '@kanban-it/shared';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I,O,0,1
const rooms = new Map(); // code -> Room

function makeCode() {
  let code;
  do {
    code = Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
  } while (rooms.has(code));
  return code;
}

export function createRoom() {
  const code = makeCode();
  const hostId = `h_${randomUUID().slice(0, 8)}`;
  const room = {
    code,
    game: createGameState(code, hostId),
    players: new Map(), // playerId -> Player
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  return { room, hostId };
}

export function getRoom(code) {
  return rooms.get(String(code || '').toUpperCase()) || null;
}

export function allRooms() {
  return [...rooms.values()];
}

export function deleteRoom(code) {
  rooms.delete(code);
}

// Rattache un joueur a une equipe par NOM (une equipe = un board partage).
// Cree l'equipe si le nom est nouveau. Renvoie l'id d'equipe.
export function resolveTeam(room, teamName) {
  const wanted = String(teamName || '').trim();
  if (!wanted) return null;
  const existing = Object.values(room.game.teams).find(
    (t) => t.name.toLowerCase() === wanted.toLowerCase(),
  );
  if (existing) return existing.id;

  // Id opaque et stable : ne jamais deriver du nombre d'equipes (collision si une
  // equipe est retiree, et fragile en cas de rejeu). L'ordre d'affichage reste
  // l'ordre d'insertion dans game.teams.
  const id = `t_${randomUUID().slice(0, 8)}`;
  room.game.teams[id] = createTeamState(id, wanted);
  return id;
}

// Sous-roles d'equipe : la salle "Direction" negocie les contrats et tient le
// budget, la salle "Delivery" pilote les equipes de dev, la "Passerelle" relaie
// l'info entre les deux (lecture seule), "Solo" gere tout (equipe a un joueur).
const SUB_ROLES = new Set(['solo', 'direction', 'delivery', 'liaison']);
export function normalizeSubRole(v) {
  return SUB_ROLES.has(v) ? v : 'solo';
}

export function addPlayer(room, { name, teamId, isHost, subRole }) {
  const id = isHost ? room.game.hostId : `p_${randomUUID().slice(0, 8)}`;
  const player = {
    id,
    name: String(name || '').trim() || (isHost ? 'Hôte' : 'Joueur'),
    teamId: teamId || null,
    isHost: !!isHost,
    subRole: isHost ? 'host' : normalizeSubRole(subRole),
    token: randomUUID(),
    ws: null,
    connected: false,
  };
  room.players.set(id, player);
  if (player.teamId && room.game.teams[player.teamId]) {
    const list = room.game.teams[player.teamId].players;
    if (!list.includes(id)) list.push(id);
  }
  return player;
}

export function findPlayerByToken(room, token) {
  if (!token) return null;
  for (const p of room.players.values()) if (p.token === token) return p;
  return null;
}

export function movePlayerToTeam(room, player, teamId) {
  if (player.teamId && room.game.teams[player.teamId]) {
    const list = room.game.teams[player.teamId].players;
    const i = list.indexOf(player.id);
    if (i !== -1) list.splice(i, 1);
  }
  player.teamId = teamId;
  if (teamId && room.game.teams[teamId]) {
    const list = room.game.teams[teamId].players;
    if (!list.includes(player.id)) list.push(player.id);
  }
}
