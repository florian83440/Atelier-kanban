// Smoke test bout-en-bout du serveur WebSocket.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { WebSocket } from 'ws';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = 8199;
const URL = `ws://127.0.0.1:${PORT}`;

const srv = spawn(process.execPath, [join(HERE, 'src/index.js')], {
  cwd: HERE,
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
srv.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));

function client(name) {
  const ws = new WebSocket(URL);
  const inbox = [];
  let cursor = 0; // messages < cursor sont deja consommes
  const listeners = [];
  ws.on('message', (raw) => {
    inbox.push(JSON.parse(raw.toString()));
    for (const l of [...listeners]) l();
  });
  const scan = (type, pred) => {
    for (let i = cursor; i < inbox.length; i++) {
      if (inbox[i].type === type && pred(inbox[i])) { cursor = i + 1; return inbox[i]; }
    }
    return null;
  };
  return {
    ws,
    name,
    open: () => new Promise((r) => ws.once('open', r)),
    send: (o) => ws.send(JSON.stringify(o)),
    // Attend, dans l'ordre d'arrivee, le prochain message `type` non consomme qui satisfait `pred`.
    waitFor: (type, pred = () => true, ms = 5000) =>
      new Promise((resolve, reject) => {
        const hit = scan(type, pred);
        if (hit) return resolve(hit);
        const to = setTimeout(() => {
          const i = listeners.indexOf(onMsg);
          if (i !== -1) listeners.splice(i, 1);
          reject(new Error(`${name}: timeout attente ${type}`));
        }, ms);
        const onMsg = () => {
          const m = scan(type, pred);
          if (m) {
            clearTimeout(to);
            const i = listeners.indexOf(onMsg);
            if (i !== -1) listeners.splice(i, 1);
            resolve(m);
          }
        };
        listeners.push(onMsg);
      }),
  };
}

const assert = (c, m) => { if (!c) throw new Error('ECHEC: ' + m); };

try {
  await sleep(700);

  // --- Hote cree la partie
  const host = client('host');
  await host.open();
  host.send({ type: 'createGame', name: 'Hôte' });
  const created = await host.waitFor('created');
  assert(created.code && created.code.length === 4, 'code de partie a 4 lettres');
  const code = created.code;
  let hs = await host.waitFor('snapshot');
  assert(hs.you.isHost === true, 'hote flagge isHost');
  assert(Array.isArray(hs.teams), 'hote recoit teams[]');

  // --- Deux joueurs, meme equipe (casse differente)
  const p1 = client('p1'); await p1.open();
  p1.send({ type: 'joinGame', code, name: 'Alice', teamName: 'Rouge' });
  const j1 = await p1.waitFor('joined');
  assert(j1.you.teamId, 'joueur1 rattache a une equipe');
  let s1 = await p1.waitFor('snapshot', (m) => m.team);
  assert(s1.team.name === 'Rouge', 'joueur1 voit le board Rouge');
  assert(s1.team.staff.length === 12, '12 ressources');
  assert(s1.team.incomingProjects.length === 3, '3 demandes entrantes au depart');

  const p2 = client('p2'); await p2.open();
  p2.send({ type: 'joinGame', code, name: 'Bob', teamName: 'rouge' });
  await p2.waitFor('joined');
  const s2 = await p2.waitFor('snapshot', (m) => m.team);
  assert(s2.team.id === s1.team.id, 'joueur2 (meme nom, casse differente) => meme board');

  // --- Hote demarre
  host.send({ type: 'startGame' });
  hs = await host.waitFor('snapshot', (m) => m.game.phase === 'running');
  assert(hs.game.sprintEndsAt > Date.now(), 'minuteur de sprint arme');

  // --- Id d'equipe opaque et stable (ne derive pas du nombre d'equipes)
  assert(/^t_/.test(hs.teams[0].id), 'id equipe stable (prefixe t_)');

  // --- Intent invalide => le serveur repond une erreur explicite (plus de no-op silencieux)
  s1 = await p1.waitFor('snapshot', (m) => m.game.phase === 'running');
  p1.send({ type: 'acceptProject', projectId: 'projet-bidon-inexistant' });
  const e1 = await p1.waitFor('error');
  assert(/n'existe plus|impossible/i.test(e1.message), 'erreur renvoyee pour demande inconnue');

  // --- Écarter une demande : retiree de la file, remplacee, file toujours a 3
  const toReject = s1.team.incomingProjects[0].id;
  p1.send({ type: 'rejectProject', projectId: toReject });
  s1 = await p1.waitFor('snapshot', (m) => !m.team.incomingProjects.some((p) => p.id === toReject));
  assert(s1.team.incomingProjects.length === 3, 'file toujours a 3 apres ecart (remplacement)');

  // --- Recruter un dev : effectif +1, cout deduit du net
  const staffBefore = s1.team.staff.length;
  p1.send({ type: 'hireDev', spec: 'full' });
  s1 = await p1.waitFor('snapshot', (m) => m.team.staff.length === staffBefore + 1);
  assert(s1.team.totalHiringCost === 35000, 'recrutement full = 35 000 €');

  // --- Joueur 1 accepte un projet + affecte un PO
  const proj = s1.team.incomingProjects[0];
  p1.send({ type: 'acceptProject', projectId: proj.id });
  s1 = await p1.waitFor('snapshot', (m) => m.team.activeProjects.some((p) => p.id === proj.id));
  assert(s1.team.activeProjects.find((p) => p.id === proj.id).stage === 'analyse', 'projet en analyse');

  const active0 = s1.team.activeProjects.find((p) => p.id === proj.id);
  const needPO = active0.req.analyst;
  const durAnalyse = active0.dur.analyse;
  const pos = s1.team.staff.filter((x) => x.role === 'analyst').slice(0, needPO);
  for (const po of pos) p1.send({ type: 'assignStaff', staffId: po.id, projectId: proj.id });
  s1 = await p1.waitFor('snapshot', (m) => {
    const a = m.team.activeProjects.find((p) => p.id === proj.id);
    return a && pos.every((po) => a.assigned.includes(po.id));
  });
  const s2b = await p2.waitFor('snapshot', (m) => {
    const a = m.team.activeProjects.find((p) => p.id === proj.id);
    return a && pos.every((po) => a.assigned.includes(po.id));
  });
  assert(s2b, 'joueur2 voit l\'affectation (board partage)');

  // --- Validation forcee du sprint
  host.send({ type: 'validateSprint' });
  hs = await host.waitFor('snapshot', (m) => m.game.sprint === 2);
  s1 = await p1.waitFor('snapshot', (m) => m.game.sprint === 2);
  const afterA = s1.team.activeProjects.find((p) => p.id === proj.id);
  if (durAnalyse === 1) {
    assert(afterA.stage === 'dev', `analyse=1 => passe en dev (obtenu ${afterA.stage})`);
  } else {
    assert(afterA.stage === 'analyse' && afterA.progress === 1, `analyse=${durAnalyse} => progress 1/${durAnalyse} (obtenu ${afterA.stage} ${afterA.progress})`);
  }
  assert(s1.team.log.length > 0, 'journal alimente');

  // --- Ajustement du minuteur par l'hote (+30 s / -30 s)
  const endsBefore = hs.game.sprintEndsAt;
  host.send({ type: 'adjustTimer', seconds: 30 });
  hs = await host.waitFor('snapshot', (m) => m.game.sprintEndsAt >= endsBefore + 29000);
  assert(hs.game.sprintEndsAt - endsBefore >= 29000, '+30 s ajoute au minuteur');
  const endsMid = hs.game.sprintEndsAt;
  host.send({ type: 'adjustTimer', seconds: -30 });
  hs = await host.waitFor('snapshot', (m) => m.game.sprintEndsAt <= endsMid - 29000);
  assert(endsMid - hs.game.sprintEndsAt >= 29000, '-30 s retire du minuteur');

  // --- Reset
  host.send({ type: 'resetGame' });
  hs = await host.waitFor('snapshot', (m) => m.game.phase === 'lobby' && m.game.sprint === 1);
  assert(hs.teams[0].activeProjects.length === 0, 'reset: boards remis a zero');

  console.log('SMOKE SERVEUR OK');
  host.ws.close(); p1.ws.close(); p2.ws.close();
  srv.kill();
  process.exit(0);
} catch (e) {
  console.error(e);
  srv.kill();
  process.exit(1);
}
