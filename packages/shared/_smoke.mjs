import {
  createGameState, createTeamState, startGame, advanceSprint,
  acceptProject, rejectProject, assignStaff, unassignStaff, disableRole,
  devEffectiveness, drawIncident, createIncomingProject, hireDev, netValue,
  TOTAL_SPRINTS, PROJECT_TEMPLATES, HIRE_COST, STAGE_PAYOUT,
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
    const free = team.staff.filter((s) => !s.disabled);
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
  p.type = 'back';
  // 2 devs "back" affectes (plein regime sur un projet back), les autres AU REPOS
  const backDevs = team.staff.filter((s) => s.role === 'dev' && s.spec === 'back').map((s) => s.id);
  assignStaff(team, backDevs[0], pid);
  assignStaff(team, backDevs[1], pid);

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

// ---- 5) Avancement proportionnel + demi-regime "hors type", sans malus de tour ----
{
  // devEffectiveness pur
  if (devEffectiveness('full', 'back') !== 1) throw new Error('un dev full doit etre plein regime partout');
  if (devEffectiveness('back', 'back') !== 1) throw new Error('bon type = plein regime');
  if (devEffectiveness('front', 'back') !== 0.5) throw new Error('hors type = demi-regime');
  if (devEffectiveness('front', 'full') !== 0.5) throw new Error('projet full : seul un dev full est plein regime');

  const game = createGameState('PROP', 'h1');
  const team = createTeamState('t1', 'Solo');
  game.teams.t1 = team;
  startGame(game);

  const pid = team.incomingProjects[0].id;
  acceptProject(team, pid, game.sprint);
  const p = team.activeProjects.find((x) => x.id === pid);
  p.stage = 'dev'; p.progress = 0;
  p.dur = { analyse: 1, dev: 10, test: 1 };
  p.req = { analyst: 1, dev: 2, qa: 1 };
  p.type = 'back';
  const durBefore = p.dur.dev;

  const backDevs = team.staff.filter((s) => s.role === 'dev' && s.spec === 'back').map((s) => s.id);
  const frontDevs = team.staff.filter((s) => s.role === 'dev' && s.spec === 'front').map((s) => s.id);

  // a) 1 dev "back" sur 2 requis -> avance de moitie (0.5 / sprint)
  assignStaff(team, backDevs[0], pid);
  advanceSprint(game, () => 0.99);
  if (Math.abs(p.progress - 0.5) > 1e-9) throw new Error('1 dev / 2 -> +0.5, obtenu ' + p.progress);

  // b) + 2 devs "front" (hors type) = +1 effectif -> effectif total 2 -> plein (+1 / sprint)
  assignStaff(team, frontDevs[0], pid);
  assignStaff(team, frontDevs[1], pid);
  advanceSprint(game, () => 0.99);
  if (Math.abs(p.progress - 1.5) > 1e-9) throw new Error('1 back + 2 front (=2 effectif) -> +1, obtenu ' + p.progress);

  // c) aucun tour de malus ajoute a la duree
  if (p.dur.dev !== durBefore) throw new Error('la duree dev ne doit pas etre rallongee, ' + durBefore + ' -> ' + p.dur.dev);

  // d) retrait libre : un dev peut quitter un projet a tout moment (plus de verrou)
  const r = unassignStaff(team, frontDevs[0]);
  if (!r.ok) throw new Error('un membre affecte doit pouvoir etre retire a tout moment');
  console.log('[5] Avancement proportionnel + demi-regime hors type + retrait libre : OK');
}

// ---- 6) Écarter une demande : retiree de la file + remplacee aussitot ----
{
  const game = createGameState('REJ', 'h1');
  const team = createTeamState('t1', 'Solo');
  game.teams.t1 = team;
  startGame(game);

  const before = team.incomingProjects.map((p) => p.id);
  if (before.length !== 3) throw new Error('3 demandes au depart, obtenu ' + before.length);
  const r = rejectProject(team, before[0], game.sprint, () => 0.5);
  if (!r.ok) throw new Error('rejectProject doit reussir');
  const after = team.incomingProjects.map((p) => p.id);
  if (after.length !== 3) throw new Error('la file doit rester a 3 (remplacement immediat), obtenu ' + after.length);
  if (after.includes(before[0])) throw new Error('la demande ecartee ne doit plus etre dans la file');
  if (!team.log.some((l) => /ÉCARTÉE/.test(l.msg))) throw new Error('le journal doit mentionner l\'ecart');
  if (rejectProject(team, 'inexistant', game.sprint).ok) throw new Error('rejeter un id inconnu doit echouer');
  console.log('[6] Écarter une demande + remplacement immediat : OK');
}

// ---- 7) Jamais deux fois le même malus d'affilee ----
{
  const team = createTeamState('t1', 'Solo');
  // rng qui force TOUJOURS un malus (< 0.7) et TOUJOURS l'indice 0 du deck
  const rngAlwaysCard0 = () => 0.0;
  const c1 = drawIncident(team, 2, rngAlwaysCard0);
  const c2 = drawIncident(team, 4, rngAlwaysCard0); // meme tirage brut -> doit basculer
  if (c1.id === c2.id) throw new Error('deux incidents identiques d\'affilee : ' + c1.id);
  // au 3e, on peut revenir sur le premier (plus consecutif)
  const c3 = drawIncident(team, 6, rngAlwaysCard0);
  if (c3.id === c2.id) throw new Error('3e incident encore identique au 2e : ' + c2.id);
  console.log('[7] Pas deux fois le meme malus d\'affilee : OK (', c1.id, '->', c2.id, '->', c3.id, ')');
}

// ---- 8) L'offre évolue avec l'avancement : big verrouillés tôt, plus de fast tard ----
{
  const tierAtSprint = (sprint, n = 2000) => {
    const t = createTeamState('t1', 'S');
    const c = { fast: 0, std: 0, big: 0 };
    for (let i = 0; i < n; i++) {
      t.incomingProjects = [];
      const p = createIncomingProject(t, Math.random, sprint);
      const tmpl = PROJECT_TEMPLATES.find((x) => p.name.startsWith(x.name));
      c[tmpl.tier]++;
    }
    return c;
  };

  const early = tierAtSprint(1);
  if (early.big !== 0) throw new Error('sprint 1 : aucun projet "big" ne doit apparaitre, obtenu ' + early.big);
  if (early.fast === 0) throw new Error('sprint 1 : des projets "fast" doivent apparaitre');

  const late = tierAtSprint(TOTAL_SPRINTS);
  if (late.big === 0) throw new Error('sprint 20 : des projets "big" doivent apparaitre');
  // les "fast" sont proportionnellement plus fréquents en fin de partie
  if (late.fast / 2000 <= early.fast / 2000) {
    throw new Error(`les "fast" doivent etre plus frequents tard (tot ${early.fast}, tard ${late.fast})`);
  }
  console.log('[8] Offre evolutive : sprint1', early, '| sprint20', late, ': OK');
}

// ---- 9) 2 nouvelles demandes par sprint, plafonnees a MAX_INCOMING (4) ----
{
  const game = createGameState('QUEUE', 'h1');
  const team = createTeamState('t1', 'Solo');
  game.teams.t1 = team;
  startGame(game); // 3 demandes au depart

  // On vide la file puis on valide un sprint : +2 attendus
  team.incomingProjects = [];
  advanceSprint(game, () => 0.5);
  if (team.incomingProjects.length !== 2) throw new Error('file vide + 1 sprint -> 2 demandes, obtenu ' + team.incomingProjects.length);

  // File a 3 : +2 mais plafonne a 4
  while (team.incomingProjects.length < 3) createIncomingProject(team, () => 0.5, game.sprint);
  advanceSprint(game, () => 0.5);
  if (team.incomingProjects.length !== 4) throw new Error('file a 3 + 1 sprint -> plafond 4, obtenu ' + team.incomingProjects.length);

  // File pleine : reste a 4
  advanceSprint(game, () => 0.5);
  if (team.incomingProjects.length !== 4) throw new Error('file pleine reste a 4, obtenu ' + team.incomingProjects.length);
  console.log('[9] 2 demandes / sprint, plafond 4 : OK');
}

// ---- 10) Recrutement de devs : cout deduit du CA net, dev dispo immediatement ----
{
  const team = createTeamState('t1', 'Solo');
  const devsBefore = team.staff.filter((s) => s.role === 'dev').length;
  team.totalDeliveredValue = 100000;
  if (netValue(team) !== 100000) throw new Error('net initial = CA livre');

  let r = hireDev(team, 'full', 1);
  if (!r.ok) throw new Error('hireDev full doit reussir');
  if (team.totalHiringCost !== HIRE_COST.full) throw new Error('cout full = ' + HIRE_COST.full);
  if (netValue(team) !== 100000 - HIRE_COST.full) throw new Error('net = CA - recrutement');

  r = hireDev(team, 'back', 1);
  if (netValue(team) !== 100000 - HIRE_COST.full - HIRE_COST.back) throw new Error('cumul recrutement');

  const devsAfter = team.staff.filter((s) => s.role === 'dev');
  if (devsAfter.length !== devsBefore + 2) throw new Error('2 devs ajoutes a l\'effectif');
  const last = devsAfter[devsAfter.length - 1];
  if (last.spec !== 'back' || last.disabled) throw new Error('le dev recrute est dispo, du bon type');
  if (hireDev(team, 'senior', 1).ok) throw new Error('specialite inconnue doit echouer');
  console.log('[10] Recrutement : cout deduit du net, dev dispo : OK');
}

// ---- 11) CA encaisse par etapes : analyse 5% / dev 20% / livraison 75% ----
{
  const game = createGameState('PAY', 'h1');
  const team = createTeamState('t1', 'Solo');
  game.teams.t1 = team;
  startGame(game);

  const pid = team.incomingProjects[0].id;
  acceptProject(team, pid, game.sprint);
  const P = () => team.activeProjects.find((p) => p.id === pid);
  const p = P();
  p.value = 100000;
  p.dur = { analyse: 1, dev: 1, test: 1 };
  p.req = { analyst: 1, dev: 1, qa: 1 };
  p.type = 'full';

  const po = team.staff.find((s) => s.role === 'analyst').id;
  const dev = team.staff.find((s) => s.role === 'dev' && s.spec === 'full').id;
  const qa = team.staff.find((s) => s.role === 'qa').id;

  assignStaff(team, po, pid); advanceSprint(game, () => 0.99); // analyse -> dev
  const afterAnalyse = team.totalDeliveredValue;
  if (afterAnalyse !== Math.round(100000 * STAGE_PAYOUT.analyse)) throw new Error('part analyse = 5% (' + afterAnalyse + ')');

  assignStaff(team, dev, pid); advanceSprint(game, () => 0.99); // dev -> test
  const afterDev = team.totalDeliveredValue;
  if (afterDev !== afterAnalyse + Math.round(100000 * STAGE_PAYOUT.dev)) throw new Error('part dev = 20% (' + afterDev + ')');

  assignStaff(team, qa, pid); advanceSprint(game, () => 0.99); // test -> done
  if (P().stage !== 'done') throw new Error('le projet doit etre livre, stage=' + P().stage);
  if (team.totalDeliveredValue !== 100000) throw new Error('total encaisse == valeur du projet (' + team.totalDeliveredValue + ')');
  if (P().earned !== 100000) throw new Error('project.earned == value');
  if (team.totalCompletedProjects !== 1) throw new Error('1 projet livre');
  console.log('[11] CA par etapes 5/20/75, total exact : OK');
}

console.log('SMOKE LOGIQUE OK');
