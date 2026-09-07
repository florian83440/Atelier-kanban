// Regles de jeu - identiques a la version standalone (legacy/standalone.html)

export const TOTAL_SPRINTS = 20;

export const WIP_LIMITS = { analyse: 4, dev: 4, test: 2 };

// Duree d'un sprint cote serveur, en secondes
export const DEFAULT_SPRINT_TIME = 60;
// Pas d'ajustement du minuteur par l'hote (+/-) et plancher de temps restant
export const TIMER_STEP = 30;
export const MIN_SPRINT_TIME = 5;

// Penalite appliquee (echeance depassee, bug prod non resolu)
export const PENALTY = 5000;

// Nombre max de demandes en file d'attente
export const MAX_INCOMING = 4;

// Probabilite d'apparition d'un bug de maintenance sur un projet en production
export const MAINTENANCE_BUG_CHANCE = 0.3;

// Part de tirages "malus" parmi les incidents automatiques
export const MALUS_DRAW_RATIO = 0.7;

// Taille max du journal de bord conserve par equipe
export const LOG_CAP = 60;

// Cout de recrutement d'un developpeur (deduit du CA net)
export const HIRE_COST = { front: 20000, back: 20000, full: 35000 };

// Repartition du CA d'un projet : une part est encaissee a la fin de chaque
// etape, la livraison (test -> production) represente l'essentiel. Somme = 1.
export const STAGE_PAYOUT = { analyse: 0.05, dev: 0.2, test: 0.75 };
