// Donnees de jeu - portage direct de legacy/standalone.html

// Effectif de depart : 12 membres (2 PO / 7 devs / 3 QA), partages par tous les
// joueurs d'une meme equipe.
export const STAFF_ROSTER = [
  { id: 's1', role: 'analyst', spec: 'all', label: 'PO #1' },
  { id: 's2', role: 'analyst', spec: 'all', label: 'PO #2' },
  { id: 's3', role: 'dev', spec: 'back', label: 'Dev #1 (Back)' },
  { id: 's4', role: 'dev', spec: 'back', label: 'Dev #2 (Back)' },
  { id: 's5', role: 'dev', spec: 'full', label: 'Dev #3 (Full)' },
  { id: 's6', role: 'dev', spec: 'full', label: 'Dev #4 (Full)' },
  { id: 's7', role: 'dev', spec: 'full', label: 'Dev #5 (Full)' },
  { id: 's8', role: 'dev', spec: 'front', label: 'Dev #6 (Front)' },
  { id: 's9', role: 'dev', spec: 'front', label: 'Dev #7 (Front)' },
  { id: 's10', role: 'qa', spec: 'all', label: 'QA #1' },
  { id: 's11', role: 'qa', spec: 'all', label: 'QA #2' },
  { id: 's12', role: 'qa', spec: 'all', label: 'QA #3' },
];

export const STAFF_COUNT = STAFF_ROSTER.length;

// Modeles d'appels d'offres. dur = nb de sprints par etape, req = effectif requis par etape.
export const PROJECT_TEMPLATES = [
  { name: 'Portail Client', type: 'front', value: 15000, dur: { analyse: 1, dev: 2, test: 1 }, req: { analyst: 1, dev: 2, qa: 1 }, margin: 2 },
  { name: 'Refonte e-Com', type: 'full', value: 35000, dur: { analyse: 2, dev: 3, test: 2 }, req: { analyst: 1, dev: 3, qa: 2 }, margin: 3 },
  { name: 'Microservices', type: 'back', value: 25000, dur: { analyse: 1, dev: 2, test: 2 }, req: { analyst: 1, dev: 2, qa: 2 }, margin: 2 },
  { name: 'App IoT', type: 'back', value: 40000, dur: { analyse: 2, dev: 4, test: 2 }, req: { analyst: 2, dev: 4, qa: 2 }, margin: 3 },
];

// Incidents RH. action est un descripteur applique par shared/logic.applyIncident
//  - { kind: 'disable', roles: [[role, count, duration], ...] }
//  - { kind: 'cureAll' }
export const MALUS_CARDS = [
  { id: 'flu', title: 'Epidémie de Grippe', type: 'malus', effect: '2 Développeurs absents pour 1 tour.', action: { kind: 'disable', roles: [['dev', 2, 1]] } },
  { id: 'qa-quit', title: 'Démission QA', type: 'malus', effect: '1 Testeur QA absent pendant 2 tours.', action: { kind: 'disable', roles: [['qa', 1, 2]] } },
  { id: 'dev-outage', title: 'Panne Serveur Dev', type: 'malus', effect: '2 Développeurs bloqués ce tour.', action: { kind: 'disable', roles: [['dev', 2, 1]] } },
  { id: 'audit', title: 'Audit Sécurité Imprévu', type: 'malus', effect: '1 Analyste et 1 QA bloqués pour 1 tour.', action: { kind: 'disable', roles: [['analyst', 1, 1], ['qa', 1, 1]] } },
];

export const BONUS_CARDS = [
  { id: 'contractor', title: 'Renfort Prestataire', type: 'bonus', effect: 'Rétablit immédiatement tous les absents.', action: { kind: 'cureAll' } },
];

export function typeLabel(type) {
  if (type === 'back') return 'Backend';
  if (type === 'front') return 'Frontend';
  return 'Fullstack';
}
