import { TOTAL_SPRINTS, DEFAULT_SPRINT_TIME, MAX_INCOMING } from './constants.js';
import { STAFF_ROSTER, PROJECT_TEMPLATES } from './data.js';

export function createStaff() {
  return STAFF_ROSTER.map((s) => ({ ...s, disabled: false, isLocked: false, assignedSeq: 0 }));
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
    totalCompletedProjects: 0,
    projectCounter: 1,
    assignSeq: 0, // compteur monotone : ordre d'affectation des membres (pour "les 2 derniers affectés")
    drawnCard: null,
    log: [],
    history: { labels: [], revenue: [], penalties: [], staffUsage: [] },
  };
  for (let i = 0; i < 3; i++) createIncomingProject(team);
  return team;
}

// Ajoute une demande dans la file d'attente (max MAX_INCOMING). rng -> [0,1).
export function createIncomingProject(team, rng = Math.random) {
  if (team.incomingProjects.length >= MAX_INCOMING) return null;

  const tmpl = PROJECT_TEMPLATES[Math.floor(rng() * PROJECT_TEMPLATES.length)];
  const totalTheoDur = tmpl.dur.analyse + tmpl.dur.dev + tmpl.dur.test;
  const proj = {
    id: `${team.id}-p${team.projectCounter++}`,
    name: `${tmpl.name} #${team.projectCounter}`,
    type: tmpl.type,
    value: tmpl.value,
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
