import { TOTAL_SPRINTS, DEFAULT_SPRINT_TIME, MAX_INCOMING } from './constants.js';
import { STAFF_ROSTER, PROJECT_TEMPLATES } from './data.js';

export function createStaff() {
  // Pas de verrou : un membre peut etre deplace d'un projet a l'autre a tout moment.
  return STAFF_ROSTER.map((s) => ({ ...s, disabled: false, assignedSeq: 0 }));
}

export function createTeamState(id, name) {
  const team = {
    id,
    name,
    players: [],
    incomingProjects: [],
    activeProjects: [],
    staff: createStaff(),
    activeMalus: [],
    totalDeliveredValue: 0,
    totalPenalties: 0,
    totalHiringCost: 0, // cumul des recrutements de devs (déduit du CA net)
    totalCompletedProjects: 0,
    projectCounter: 1,
    hireSeq: 0, // compteur pour l'id des devs recrutés
    assignSeq: 0, // compteur monotone : ordre d'affectation des membres (pour "les 2 derniers affectés")
    lastIncidentId: null, // dernier incident tiré : on ne rejoue jamais le même deux fois de suite
    drawnCard: null,
    log: [],
    history: { labels: [], revenue: [], penalties: [], spending: [], staffUsage: [] },
  };
  for (let i = 0; i < 3; i++) createIncomingProject(team);
  return team;
}

// Poids d'un modèle selon l'avancement de la partie (0..1) : les projets "fast"
// deviennent de plus en plus fréquents, les "big" apparaissent puis montent en
// puissance, le socle "std" reste constant.
function templateWeight(tmpl, sprint) {
  const phase = Math.min(1, sprint / TOTAL_SPRINTS);
  if (tmpl.tier === 'fast') return 1 + Math.round(phase * 3); // 1 -> 4
  if (tmpl.tier === 'big') return 1 + Math.round(phase * 2); // 1 -> 3 (déjà filtré par minSprint)
  return 2; // std
}

// Ajoute une demande dans la file d'attente (max MAX_INCOMING). rng -> [0,1).
// `sprint` fait varier l'offre : plus la partie avance, plus il y a de gros
// budgets ET de petits projets très rapides.
export function createIncomingProject(team, rng = Math.random, sprint = 1) {
  if (team.incomingProjects.length >= MAX_INCOMING) return null;

  const pool = PROJECT_TEMPLATES.filter((t) => (t.minSprint ?? 1) <= sprint);
  const weights = pool.map((t) => templateWeight(t, sprint));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  let tmpl = pool[pool.length - 1];
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r < 0) { tmpl = pool[i]; break; }
  }
  const totalTheoDur = tmpl.dur.analyse + tmpl.dur.dev + tmpl.dur.test;
  const proj = {
    id: `${team.id}-p${team.projectCounter++}`,
    name: `${tmpl.name} #${team.projectCounter}`,
    type: tmpl.type,
    value: tmpl.value,
    baseValue: tmpl.value, // valeur catalogue avant negociation
    earned: 0, // CA deja encaisse sur ce projet (parts d'etapes + livraison)
    terms: null, // { delai, perimetre } fixes a l'acceptation par la Direction
    renegotiations: 0,
    stage: 'incoming',
    dur: { ...tmpl.dur },
    req: { ...tmpl.req },
    progress: 0,
    hasMaintenanceBug: false,
    margin: tmpl.margin,
    totalTheoDur,
    maxSprintDeadline: 0,
    acceptedSprint: 0,
    assigned: [],
  };
  team.incomingProjects.push(proj);
  return proj;
}

export function createGameState(code, hostId) {
  return {
    code,
    hostId,
    phase: 'lobby', // 'lobby' | 'running' | 'finished'
    sprint: 1,
    totalSprints: TOTAL_SPRINTS,
    sprintDuration: DEFAULT_SPRINT_TIME,
    sprintEndsAt: null,
    teams: {},
  };
}
