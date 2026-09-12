// Logique de jeu PURE (aucun DOM, aucun timer, aucun reseau).
// Portage fidele de la boucle processNextTour() de legacy/standalone.html.
// Toutes les fonctions mutent l'objet `team` passe en argument.
// `rng` est injectable (0..1) pour rendre les tirages reproductibles / testables.

import {
  WIP_LIMITS,
  MAX_INCOMING,
  PENALTY,
  MAINTENANCE_BUG_CHANCE,
  MALUS_DRAW_RATIO,
  LOG_CAP,
  MIN_SPRINT_TIME,
  PAUSE_EVERY_SPRINTS,
  MAINTENANCE_BUG_CAP,
  MAINTENANCE_BUG_PENALTY_RATE,
  HIRE_COST,
  STAGE_PAYOUT,
  NEGOTIATION,
  RENEGOTIATE_MARGIN_GAIN,
  RENEGOTIATE_VALUE_MULT,
  RENEGOTIATE_MAX,
} from './constants.js';
import { MALUS_CARDS, BONUS_CARDS } from './data.js';
import { createIncomingProject, createTeamState } from './factory.js';

// ---------------------------------------------------------------- helpers

export function findStaff(team, id) {
  return team.staff.find((s) => s.id === id) || null;
}

export function staffAssignedCount(team) {
  return team.activeProjects.reduce((n, p) => n + p.assigned.length, 0);
}

// CA net d'une equipe = livre - penalites - recrutements.
export function netValue(team) {
  return team.totalDeliveredValue - team.totalPenalties - (team.totalHiringCost || 0);
}

export function logEvent(team, msg, type = 'system', sprint = null) {
  team.log.unshift({ msg, type, sprint, ts: Date.now() });
  if (team.log.length > LOG_CAP) team.log.length = LOG_CAP;
}

export function getAssignedDetails(team, project) {
  const d = { analyst: 0, dev: 0, qa: 0, devSpecs: [], ids: [], hasDisabledStaff: false };
  for (const id of project.assigned) {
    d.ids.push(id);
    const s = findStaff(team, id);
    if (!s) continue;
    if (s.disabled) d.hasDisabledStaff = true;
    if (s.role === 'analyst') d.analyst++;
    if (s.role === 'dev') { d.dev++; d.devSpecs.push(s.spec); }
    if (s.role === 'qa') d.qa++;
  }
  return d;
}

function removeFromAssignments(team, staffId) {
  for (const p of team.activeProjects) {
    const i = p.assigned.indexOf(staffId);
    if (i !== -1) p.assigned.splice(i, 1);
  }
  const s = findStaff(team, staffId);
  if (s) s.assignedSeq = 0;
}

function freeAssigned(team, project) {
  for (const id of project.assigned) {
    const s = findStaff(team, id);
    if (s) s.assignedSeq = 0;
  }
  project.assigned = [];
}

// Projet (non termine) sur lequel un membre est affecte, ou null.
function projectOfStaff(team, staffId) {
  return team.activeProjects.find((p) => p.stage !== 'done' && p.assigned.includes(staffId)) || null;
}

// Efficacite d'un dev sur un projet selon sa specialite : plein regime (1) s'il
// est du bon type, demi-regime (0.5) sinon. Un dev "full" convient partout ;
// un projet "full" n'est couvert a plein que par des devs "full".
export function devEffectiveness(devSpec, projectType) {
  if (devSpec === 'full') return 1;
  if (projectType === 'full') return 0.5;
  return devSpec === projectType ? 1 : 0.5;
}

// Somme des efficacites des devs affectes au projet (2 devs "hors type" = 1).
function effectiveDevs(team, project) {
  let total = 0;
  for (const id of project.assigned) {
    const s = findStaff(team, id);
    if (s && s.role === 'dev' && !s.disabled) total += devEffectiveness(s.spec, project.type);
  }
  return total;
}

const PROGRESS_EPS = 1e-9;

// Pénalité (par sprint) d'un bug de maintenance non résolu : proportionnelle au
// budget de base du projet, jamais moins que PENALTY.
export function bugPenalty(project) {
  return Math.max(PENALTY, Math.round(project.value * MAINTENANCE_BUG_PENALTY_RATE));
}

// Encaisse la part de CA associee au franchissement d'une etape. Pour la
// livraison ('test'), on solde le reste pour que le total encaisse == p.value.
function payStage(team, project, stageKey, sprint) {
  const amount = stageKey === 'test'
    ? project.value - project.earned
    : Math.round(project.value * STAGE_PAYOUT[stageKey]);
  project.earned += amount;
  team.totalDeliveredValue += amount;
  return amount;
}

// ---------------------------------------------------------------- negociation

const round100 = (n) => Math.round(n / 100) * 100;

// Applique les curseurs de negociation a une demande SANS muter l'objet.
// `base` = un template ou un projet en file (besoin de .value, .margin, .req).
// `terms` = { delai, perimetre } (cles de NEGOTIATION ; valeurs inconnues -> 'standard').
// Retourne { delai, perimetre, value, margin, req, baseValue }.
export function negotiateTerms(base, terms = {}) {
  const dKey = NEGOTIATION.delai[terms.delai] ? terms.delai : 'standard';
  const pKey = NEGOTIATION.perimetre[terms.perimetre] ? terms.perimetre : 'standard';
  const d = NEGOTIATION.delai[dKey];
  const p = NEGOTIATION.perimetre[pKey];
  return {
    delai: dKey,
    perimetre: pKey,
    baseValue: base.value,
    value: Math.max(1000, round100(base.value * d.valueMult * p.valueMult)),
    margin: Math.max(0, base.margin + d.marginDelta),
    req: {
      analyst: base.req.analyst,
      dev: Math.max(1, base.req.dev + p.devDelta),
      qa: Math.max(1, base.req.qa + p.qaDelta),
    },
  };
}

// ---------------------------------------------------------------- intents joueur

// `terms` (optionnel) = { delai, perimetre } issus de la negociation Direction.
export function acceptProject(team, projId, sprint, terms = null) {
  const analyseCount = team.activeProjects.filter((p) => p.stage === 'analyse').length;
  if (analyseCount >= WIP_LIMITS.analyse) {
    logEvent(team, `WIP BLOCAGE : la colonne Analyse est pleine (${WIP_LIMITS.analyse}).`, 'malus', sprint);
    return { ok: false, reason: 'wip' };
  }
  const idx = team.incomingProjects.findIndex((p) => p.id === projId);
  if (idx === -1) return { ok: false, reason: 'not-found' };

  const proj = team.incomingProjects.splice(idx, 1)[0];
  const n = negotiateTerms(proj, terms || {});
  proj.baseValue = proj.value;
  proj.value = n.value;
  proj.margin = n.margin;
  proj.req = n.req;
  proj.terms = { delai: n.delai, perimetre: n.perimetre };
  proj.renegotiations = 0;
  proj.stage = 'analyse';
  proj.progress = 0;
  proj.assigned = [];
  proj.acceptedSprint = sprint;
  proj.maxSprintDeadline = sprint + proj.totalTheoDur + proj.margin;
  team.activeProjects.push(proj);

  const negotiated = n.delai !== 'standard' || n.perimetre !== 'standard';
  const suffix = negotiated
    ? ` — contrat ${NEGOTIATION.delai[n.delai].label} / ${NEGOTIATION.perimetre[n.perimetre].label} (${proj.value.toLocaleString('fr-FR')} €)`
    : '';
  logEvent(team, `PROJET ACCEPTÉ : ${proj.name} placé en ANALYSE (échéance Sprint ${proj.maxSprintDeadline})${suffix}.`, 'system', sprint);
  return { ok: true };
}

// Renegocie l'echeance d'un projet deja signe : +RENEGOTIATE_MARGIN_GAIN sprint
// d'echeance contre -RENEGOTIATE_VALUE_MULT de valeur, RENEGOTIATE_MAX fois max.
export function renegotiateDeadline(team, projId, sprint) {
  const p = team.activeProjects.find((x) => x.id === projId);
  if (!p) return { ok: false, reason: 'not-found' };
  if (p.stage === 'done') return { ok: false, reason: 'too-late' };
  if ((p.renegotiations || 0) >= RENEGOTIATE_MAX) return { ok: false, reason: 'reneg-max' };

  p.renegotiations = (p.renegotiations || 0) + 1;
  p.margin += RENEGOTIATE_MARGIN_GAIN;
  p.maxSprintDeadline += RENEGOTIATE_MARGIN_GAIN;
  const before = p.value;
  p.value = Math.max(p.earned || 0, round100(p.value * RENEGOTIATE_VALUE_MULT));
  logEvent(
    team,
    `RENÉGOCIATION : ${p.name} — +${RENEGOTIATE_MARGIN_GAIN} sprint d'échéance (Sprint ${p.maxSprintDeadline}), valeur ${before.toLocaleString('fr-FR')} → ${p.value.toLocaleString('fr-FR')} €.`,
    'system',
    sprint,
  );
  return { ok: true };
}

// Écarte une demande de la file d'attente et la remplace aussitôt par une
// nouvelle (évite de rester bloqué avec, p. ex., uniquement des projets back).
export function rejectProject(team, projId, sprint, rng = Math.random) {
  const idx = team.incomingProjects.findIndex((p) => p.id === projId);
  if (idx === -1) return { ok: false, reason: 'not-found' };
  const [proj] = team.incomingProjects.splice(idx, 1);
  logEvent(team, `DEMANDE ÉCARTÉE : ${proj.name} retirée de la file.`, 'system', sprint);
  createIncomingProject(team, rng, sprint);
  return { ok: true };
}

// Correspondance kind (bouton de recrutement) -> role/spec/etiquette du staff.
const HIRE_KIND = {
  front: { role: 'dev', spec: 'front', label: 'Dev' },
  back: { role: 'dev', spec: 'back', label: 'Dev' },
  full: { role: 'dev', spec: 'full', label: 'Dev' },
  analyst: { role: 'analyst', spec: 'all', label: 'PO' },
  qa: { role: 'qa', spec: 'all', label: 'QA' },
};

// Recrute un membre d'equipe (dev/PO/QA) d'un type donne. Cout deduit du CA
// net (totalHiringCost). Le membre arrive au repos (pool), immediatement affectable.
export function hireStaff(team, kind, sprint) {
  const cost = HIRE_COST[kind];
  const meta = HIRE_KIND[kind];
  if (!cost || !meta) return { ok: false, reason: 'bad-spec' };
  const n = team.staff.filter((s) => s.role === meta.role).length + 1;
  const specLabel = kind === 'back' ? 'Back' : kind === 'front' ? 'Front' : kind === 'full' ? 'Full' : '';
  const label = specLabel ? `${meta.label} #${n} (${specLabel})` : `${meta.label} #${n}`;
  const member = {
    id: `h${++team.hireSeq}`,
    role: meta.role,
    spec: meta.spec,
    label,
    disabled: false,
    assignedSeq: 0,
  };
  team.staff.push(member);
  team.totalHiringCost += cost;
  logEvent(team, `RECRUTEMENT : ${label} engagé (-${cost.toLocaleString('fr-FR')} €).`, 'malus', sprint);
  return { ok: true };
}

export function assignStaff(team, staffId, projId) {
  const member = findStaff(team, staffId);
  if (!member || member.disabled) return { ok: false, reason: 'blocked' };
  const target = team.activeProjects.find((p) => p.id === projId);
  if (!target) return { ok: false, reason: 'not-found' };

  removeFromAssignments(team, staffId);
  target.assigned.push(staffId);
  member.assignedSeq = ++team.assignSeq;
  return { ok: true };
}

export function unassignStaff(team, staffId) {
  const member = findStaff(team, staffId);
  if (!member || member.disabled) return { ok: false, reason: 'blocked' };
  removeFromAssignments(team, staffId);
  return { ok: true };
}

// ---------------------------------------------------------------- incidents RH

// Rend `count` membres du role indisponibles pour `duration` sprints.
// Priorite : on frappe D'ABORD les membres AFFECTES a un projet en cours, les PLUS
// RECEMMENT affectes (assignedSeq le plus eleve). Ils restent sur leur projet -> celui-ci
// est FIGE tant que le blocage dure. On ne prend des membres au repos que s'il n'y a pas
// assez de membres affectes.
export function disableRole(team, role, count, duration, sprint) {
  let remaining = count;

  const onProjects = team.staff
    .filter((s) => s.role === role && !s.disabled && projectOfStaff(team, s.id))
    .sort((a, b) => (b.assignedSeq || 0) - (a.assignedSeq || 0)); // derniers affectes d'abord

  for (const s of onProjects) {
    if (remaining <= 0) break;
    s.disabled = true;
    team.activeMalus.push({ staffId: s.id, duration });
    const p = projectOfStaff(team, s.id);
    logEvent(
      team,
      `MALUS : ${s.label} bloqué ${duration} sprint(s)${p ? ` — ${p.name} figé` : ''}.`,
      'malus',
      sprint,
    );
    remaining--;
  }

  if (remaining > 0) {
    const assignedNow = new Set(team.activeProjects.flatMap((p) => p.assigned));
    const idle = team.staff.filter(
      (s) => s.role === role && !s.disabled && !assignedNow.has(s.id),
    );
    while (remaining > 0 && idle.length > 0) {
      const target = idle.pop();
      target.disabled = true;
      removeFromAssignments(team, target.id);
      team.activeMalus.push({ staffId: target.id, duration });
      logEvent(team, `MALUS : ${target.label} indisponible pour ${duration} sprint(s).`, 'malus', sprint);
      remaining--;
    }
  }
}

export function cureAllStaff(team, sprint) {
  team.staff.forEach((s) => { s.disabled = false; });
  team.activeMalus = [];
  logEvent(team, `L'équipe est de nouveau au complet !`, 'bonus', sprint);
}

// Fait vieillir les blocages d'un sprint et libere ceux arrives a terme.
// Appele en DEBUT de sprint : un blocage "1 tour" gele donc exactement le sprint
// pendant lequel il est visible dans l'interface.
export function expireMalus(team, sprint) {
  team.activeMalus.forEach((m) => { m.duration--; });
  team.activeMalus = team.activeMalus.filter((m) => {
    if (m.duration <= 0) {
      const s = findStaff(team, m.staffId);
      if (s) s.disabled = false;
      logEvent(team, `Un membre d'équipe est de retour !`, 'system', sprint);
      return false;
    }
    return true;
  });
}

export function applyIncident(team, card, sprint) {
  if (!card) return;
  if (card.action.kind === 'cureAll') {
    cureAllStaff(team, sprint);
  } else if (card.action.kind === 'disable') {
    for (const [role, count, duration] of card.action.roles) {
      disableRole(team, role, count, duration, sprint);
    }
  }
}

export function drawIncident(team, sprint, rng = Math.random) {
  const type = rng() < MALUS_DRAW_RATIO ? 'malus' : 'bonus';
  const deck = type === 'bonus' ? BONUS_CARDS : MALUS_CARDS;
  let card = deck[Math.floor(rng() * deck.length)];
  // Jamais deux fois le même incident d'affilée (si le deck offre une alternative).
  if (card.id === team.lastIncidentId && deck.length > 1) {
    const others = deck.filter((c) => c.id !== team.lastIncidentId);
    card = others[Math.floor(rng() * others.length)];
  }
  team.lastIncidentId = card.id;
  team.drawnCard = { id: card.id, title: card.title, type: card.type, effect: card.effect, sprint };
  logEvent(team, `INCIDENT AUTOMATIQUE : ${card.title} — ${card.effect}`, card.type, sprint);
  applyIncident(team, card, sprint);
  return card;
}

// ---------------------------------------------------------------- resolution de sprint

export function processSprint(team, sprint, rng = Math.random) {
  logEvent(team, `--- VALIDATION DU SPRINT ${sprint} ---`, 'system', sprint);

  for (const p of team.activeProjects) {
    const details = getAssignedDetails(team, p);

    if (p.stage !== 'done' && sprint > p.maxSprintDeadline) {
      team.totalPenalties += PENALTY;
      logEvent(team, `ÉCHÉANCE DÉPASSÉE : ${p.name} est en retard ! -${PENALTY.toLocaleString('fr-FR')} € pénalité.`, 'malus', sprint);
    }

    if (details.hasDisabledStaff && p.stage !== 'done') {
      logEvent(team, `TÂCHE FIGÉE sur ${p.name} : un membre affecté est indisponible !`, 'malus', sprint);
      continue;
    }

    if (p.stage === 'analyse') {
      // Avancement proportionnel : effectif affecté / effectif requis, plafonné à 1.
      const rate = Math.min(1, details.analyst / p.req.analyst);
      if (rate > 0) {
        p.progress += rate;
        if (p.progress >= p.dur.analyse - PROGRESS_EPS) {
          const devCount = team.activeProjects.filter((x) => x.stage === 'dev').length;
          if (devCount < WIP_LIMITS.dev) {
            p.stage = 'dev';
            p.progress = 0;
            const gain = payStage(team, p, 'analyse', sprint);
            logEvent(team, `${p.name} : specs terminées -> DÉVELOPPEMENT (+${gain.toLocaleString('fr-FR')} €).`, 'bonus', sprint);
            freeAssigned(team, p);
          } else {
            p.progress = p.dur.analyse;
            logEvent(team, `WIP DEV SATURÉ : ${p.name} reste en Analyse (Dev à ${WIP_LIMITS.dev}).`, 'malus', sprint);
          }
        }
      }
    } else if (p.stage === 'dev') {
      // Efficacité des devs : hors type = demi-régime (2 hors type = 1). Pas de
      // malus de tour, l'avancement est simplement plus lent.
      const rate = Math.min(1, effectiveDevs(team, p) / p.req.dev);
      if (rate > 0) {
        p.progress += rate;
        if (p.progress >= p.dur.dev - PROGRESS_EPS) {
          const testCount = team.activeProjects.filter((x) => x.stage === 'test').length;
          if (testCount < WIP_LIMITS.test) {
            p.stage = 'test';
            p.progress = 0;
            const gain = payStage(team, p, 'dev', sprint);
            logEvent(team, `${p.name} : dev terminé -> TEST / QA (+${gain.toLocaleString('fr-FR')} €).`, 'bonus', sprint);
            freeAssigned(team, p);
          } else {
            p.progress = p.dur.dev;
            logEvent(team, `WIP TEST SATURÉ : ${p.name} reste en Dev (QA à ${WIP_LIMITS.test}).`, 'malus', sprint);
          }
        }
      }
    } else if (p.stage === 'test') {
      const rate = Math.min(1, details.qa / p.req.qa);
      if (rate > 0) {
        p.progress += rate;
        if (p.progress >= p.dur.test - PROGRESS_EPS) {
          p.stage = 'done';
          p.progress = 0;
          const gain = payStage(team, p, 'test', sprint);
          team.totalCompletedProjects++;
          logEvent(team, `${p.name} : recette validée -> LIVRÉ EN PRODUCTION (+${gain.toLocaleString('fr-FR')} €) !`, 'bonus', sprint);
          freeAssigned(team, p);
        }
      }
    } else if (p.stage === 'done' && p.hasMaintenanceBug) {
      if (details.dev >= 1) {
        p.hasMaintenanceBug = false;
        logEvent(team, `MAINTENANCE : bug corrigé sur ${p.name} par un Dev !`, 'bonus', sprint);
        freeAssigned(team, p);
      } else {
        const cost = bugPenalty(p);
        team.totalPenalties += cost;
        logEvent(team, `MAINTENANCE : bug critique non résolu sur ${p.name} (-${cost.toLocaleString('fr-FR')} €) !`, 'malus', sprint);
      }
    }
  }

  // Maintenance : UN SEUL tirage par sprint pour toute l'équipe (pas par projet),
  // plafonné à MAINTENANCE_BUG_CAP bugs actifs — évite qu'une équipe qui livre
  // beaucoup se retrouve noyée sous les incidents.
  {
    const done = team.activeProjects.filter((x) => x.stage === 'done');
    const activeBugs = done.filter((x) => x.hasMaintenanceBug).length;
    const eligible = done.filter((x) => !x.hasMaintenanceBug);
    if (eligible.length > 0 && activeBugs < MAINTENANCE_BUG_CAP && rng() < MAINTENANCE_BUG_CHANCE) {
      const target = eligible[Math.floor(rng() * eligible.length)];
      target.hasMaintenanceBug = true;
      logEvent(team, `ALERTE PROD : incident technique sur ${target.name} ! Dev requis.`, 'malus', sprint);
    }
  }

  // 2 nouvelles demandes par sprint (createIncomingProject plafonne à MAX_INCOMING).
  createIncomingProject(team, rng, sprint);
  createIncomingProject(team, rng, sprint);

  team.history.labels.push(`T${sprint}`);
  team.history.revenue.push(team.totalDeliveredValue);
  team.history.penalties.push(team.totalPenalties);
  team.history.spending.push(team.totalHiringCost);
  team.history.staffUsage.push(staffAssignedCount(team));
}

// ---------------------------------------------------------------- orchestration partie

export function startGame(game) {
  game.phase = 'running';
  game.sprint = 1;
  game.paused = false;
  game.sprintEndsAt = Date.now() + game.sprintDuration * 1000;
  for (const team of Object.values(game.teams)) {
    logEvent(team, `Partie démarrée — Sprint 1.`, 'system', 1);
  }
}

// L'hote relance le minuteur apres une pause d'animation.
export function resumeSprint(game) {
  if (game.phase !== 'running' || !game.paused) return;
  game.paused = false;
  game.sprintEndsAt = Date.now() + game.sprintDuration * 1000;
  for (const team of Object.values(game.teams)) {
    logEvent(team, `Reprise — Sprint ${game.sprint}.`, 'system', game.sprint);
  }
}

// Fait avancer TOUTES les equipes d'un sprint. Appele par le serveur quand le
// minuteur atteint zero ou quand l'hote force la validation.
export function advanceSprint(game, rng = Math.random) {
  if (game.phase !== 'running') return;

  for (const team of Object.values(game.teams)) {
    expireMalus(team, game.sprint); // 1) libere les blocages arrives a terme
    if (game.sprint % 2 === 0) drawIncident(team, game.sprint, rng); // 2) nouveaux blocages
    else team.drawnCard = null;
    processSprint(team, game.sprint, rng); // 3) resolution (projets figes = pas de progression)
  }

  game.sprint++;
  if (game.sprint > game.totalSprints) {
    game.phase = 'finished';
    game.paused = false;
    game.sprintEndsAt = null;
    for (const team of Object.values(game.teams)) {
      logEvent(team, `FIN DU CYCLE (${game.totalSprints} sprints) ! Net livré : ${netValue(team).toLocaleString('fr-FR')} €`, 'system', game.totalSprints);
    }
  } else if (PAUSE_EVERY_SPRINTS > 0 && (game.sprint - 1) % PAUSE_EVERY_SPRINTS === 0) {
    // On vient de valider un multiple de PAUSE_EVERY_SPRINTS : on gele le minuteur,
    // l'hote reprend la main pour expliquer les changements avant de relancer.
    game.paused = true;
    game.sprintEndsAt = null;
    for (const team of Object.values(game.teams)) {
      logEvent(team, `PAUSE après le Sprint ${game.sprint - 1} — l'animateur intervient. L'hôte relancera le minuteur.`, 'system', game.sprint - 1);
    }
  } else {
    game.sprintEndsAt = Date.now() + game.sprintDuration * 1000;
  }
}

// Ajuste le minuteur du sprint en cours (l'hote : +30 s / -30 s).
// deltaSeconds > 0 ajoute du temps, < 0 en retire ; plancher a MIN_SPRINT_TIME.
export function adjustSprintTime(game, deltaSeconds) {
  if (game.phase !== 'running' || !game.sprintEndsAt) return;
  const floor = Date.now() + MIN_SPRINT_TIME * 1000;
  game.sprintEndsAt = Math.max(floor, game.sprintEndsAt + deltaSeconds * 1000);
  const s = Math.abs(deltaSeconds);
  const msg = deltaSeconds >= 0
    ? `L'hote a ajoute ${s} s au sprint.`
    : `L'hote a retire ${s} s au sprint.`;
  for (const team of Object.values(game.teams)) {
    logEvent(team, msg, 'system', game.sprint);
  }
}

export function resetGame(game) {
  game.phase = 'lobby';
  game.sprint = 1;
  game.paused = false;
  game.sprintEndsAt = null;
  for (const id of Object.keys(game.teams)) {
    const prev = game.teams[id];
    const fresh = createTeamState(id, prev.name);
    fresh.players = prev.players;
    game.teams[id] = fresh;
  }
}
