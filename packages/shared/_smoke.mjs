import {
  createGameState, createTeamState, startGame, advanceSprint,
  acceptProject, assignStaff, unassignStaff, disableRole,
  TOTAL_SPRINTS, PROJECT_TEMPLATES,
} from './src/index.js';

function rng32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- 1) 20 sprints, deux equipes, bot naif : ne doit jamais lever d'exception ----
{
  const rng = rng32(42);
  const game = createGameState('TEST', 'host1');
  game.teams.t1 = createTeamState('t1', 'Rouge');
  game.teams.t2 = createTeamState('t2', 'Bleu');
  startGame(game);
  const play = (team) => {
    for (const p of [...team.incomingProjects]) acceptProject(team, p.id, game.sprint);
    const free = team.staff.filter((s) => !s.disabled && !s.isLocked);
    for (const p of team.activeProjects.filter((x) => x.stage !== 'done')) {
      for (const s of free.splice(0, 2)) assignStaff(team, s.id, p.id);
    }
  };
  let guard = 0;
  while (game.phase === 'running' && guard++ < 100) {
    for (const t of Object.values(game.teams)) play(t);
    advanceSprint(game, rng);
  }
  if (game.phase !== 'finished') throw new Error('partie non terminee');
  if (game.teams.t1.history.labels.length !== TOTAL_SPRINTS) throw new Error('history incomplet');
  console.log('[1] 20 sprints x2 equipes : OK (phase', game.phase + ', sprint', game.sprint + ')');
}

// ---- 2) Happy path : livrer un "Portail Client" avec l'effectif correct ----
{
  const rng = rng32(7);
  const game = createGameState('HAPPY', 'host1');
  const team = createTeamState('t1', 'Solo');
  game.teams.t1 = team;

  // Force une demande connue en tete de file
  const tmpl = PROJECT_TEMPLATES.find((t) => t.name === 'Portail Client');
  team.incomingProjects[0] = {
    ...team.incomingProjects[0], name: 'Portail Client #x', type: tmpl.type, value: tmpl.value,
    dur: { ...tmpl.dur }, req: { ...tmpl.req }, margin: tmpl.margin,
    totalTheoDur: tmpl.dur.analyse + tmpl.dur.dev + tmpl.dur.test,
  };
  startGame(game);
  const projId = team.incomingProjects[0].id;
  acceptProject(team, projId, game.sprint);
  const P = () => team.activeProjects.find((p) => p.id === projId);

  const devs = team.staff.filter((s) => s.role === 'dev' && (s.spec === 'front' || s.spec === 'full'));
  const po = team.staff.find((s) => s.role === 'analyst');
  const qa = team.staff.find((s) => s.role === 'qa');

  for (let i = 0; i < 12 && P().stage !== 'done'; i++) {
    const p = P();
    if (p.stage === 'analyse') assignStaff(team, po.id, p.id);
    else if (p.stage === 'dev') { assignStaff(team, devs[0].id, p.id); assignStaff(team, devs[1].id, p.id); }
    else if (p.stage === 'test') assignStaff(team, qa.id, p.id);
    advanceSprint(game, rng);
  }

  const done = P();
  if (done.stage !== 'done') throw new Error('le projet n\'a pas ete livre, stage=' + done.stage);
  if (team.totalDeliveredValue !== tmpl.value) throw new Error('CA attendu ' + tmpl.value + ', obtenu ' + team.totalDeliveredValue);
  console.log('[2] Happy path : Portail Client livre, CA =', team.totalDeliveredValue, '€ : OK');
}

// ---- 3) Blocage RH : tous les devs affectes -> on bloque les 2 derniers affectes ----
{
  const rng = rng32(3);
  const game = createGameState('BLK', 'h1');
  const team = createTeamState('t1', 'Solo');
  game.teams.t1 = team;
  startGame(game);

  // accepte 2 projets, tous deux passes en dev de force, et affecte les 6 devs
  const projs = team.incomingProjects.slice(0, 2).map((p) => p.id);
  for (const id of projs) {
    acceptProject(team, id, game.sprint);
    const p = team.activeProjects.find((x) => x.id === id);
    p.stage = 'dev'; p.progress = 0;
    p.dur = { analyse: 1, dev: 5, test: 1 };
    p.req = { analyst: 1, dev: 2, qa: 1 };
    p.type = 'full'; // evite tout malus d'incompatibilite technique
  }
  const devIds = team.staff.filter((s) => s.role === 'dev').map((s) => s.id);
  // 3 devs sur le projet A, TOUS les autres sur le projet B => les derniers affectes sont sur B
  devIds.slice(0, 3).forEach((id) => assignStaff(team, id, projs[0]));
  devIds.slice(3).forEach((id) => assignStaff(team, id, projs[1]));
  const nOnB = devIds.length - 3;

  const freeDevsBefore = team.staff.filter((s) => s.role === 'dev' && !s.disabled
    && !team.activeProjects.some((p) => p.assigned.includes(s.id)));
  if (freeDevsBefore.length !== 0) throw new Error('pre-condition: tous les devs doivent etre affectes');

  disableRole(team, 'dev', 2, 2, game.sprint);

  const blocked = team.staff.filter((s) => s.role === 'dev' && s.disabled);
  if (blocked.length !== 2) throw new Error('2 devs doivent etre bloques, obtenu ' + blocked.length);
  // les 2 bloques = les 2 derniers affectes (assignedSeq les plus eleves) => sur le projet B
  const projB = team.activeProjects.find((p) => p.id === projs[1]);
  if (!blocked.every((s) => projB.assigned.includes(s.id))) {
    throw new Error('les 2 bloques doivent etre les 2 derniers affectes (projet B)');
  }
  // ils restent sur leur projet (non detaches)
  if (projB.assigned.length !== nOnB) throw new Error('les bloques restent sur le projet, assigned=' + projB.assigned.length);
  if (!team.activeMalus.some((m) => m.staffId === blocked[0].id && m.duration === 2)) {
    throw new Error('malus enregistre avec la bonne duree');
  }

  // le projet B ne progresse pas pendant le blocage ; le projet A avance
  const progA0 = team.activeProjects.find((p) => p.id === projs[0]).progress;
  advanceSprint(game, rng);
  const progB1 = projB.progress;
  const progA1 = team.activeProjects.find((p) => p.id === projs[0]).progress;
  if (progB1 !== 0) throw new Error('projet B fige ne doit pas progresser, progress=' + progB1);
  if (progA1 <= progA0) throw new Error('projet A (sans blocage) doit progresser');
  console.log('[3] Blocage RH : 2 derniers devs affectes bloques, projet fige : OK');
}

// ---- 4) Priorite : un incident frappe un projet ACTIF meme si des devs sont au repos ----
{
  const game = createGameState('PRIO', 'h1');
  const team = createTeamState('t1', 'Solo');
  game.teams.t1 = team;
  startGame(game); // sprint 1

  const pid = team.incomingProjects[0].id;
  acceptProject(team, pid, game.sprint);
  const p = team.activeProjects.find((x) => x.id === pid);
  p.stage = 'dev'; p.progress = 0;
  p.dur = { analyse: 1, dev: 8, test: 1 };
  p.req = { analyst: 1, dev: 2, qa: 1 };
  p.type = 'full';
  const devIds = team.staff.filter((s) => s.role === 'dev').map((s) => s.id);
  assignStaff(team, devIds[0], pid);
  assignStaff(team, devIds[1], pid); // 2 devs affectes, 4 devs AU REPOS

  // sprint 1 (impair) : pas d'incident, le projet avance
  advanceSprint(game, () => 0.99);
  const progAfter1 = p.progress;
  if (progAfter1 !== 1) throw new Error('sprint 1 : le projet devait avancer a 1, obtenu ' + progAfter1);

  // sprint 2 (pair) : incident. Meme avec 4 devs au repos, l'incident frappe les
  // devs AFFECTES -> le projet est fige et NE progresse PAS.
  advanceSprint(game, () => 0.05); // < MALUS_DRAW_RATIO et carte 0 = un blocage de devs
  const disabledOnP = p.assigned.filter((id) => team.staff.find((s) => s.id === id)?.disabled);
  if (disabledOnP.length === 0) throw new Error('un dev affecte doit etre bloque');
  if (p.progress !== progAfter1) throw new Error('projet fige : progress ne doit pas bouger (' + progAfter1 + ' -> ' + p.progress + ')');
  const blockLeft = team.activeMalus.find((m) => m.staffId === disabledOnP[0])?.duration;
  if (!(blockLeft >= 1)) throw new Error('le blocage doit rester visible (duration >= 1) dans ce snapshot');
  console.log('[4] Incident : projet actif fige malgre des devs au repos (blocage visible) : OK');
}

console.log('SMOKE LOGIQUE OK');
