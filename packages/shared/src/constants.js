// Regles de jeu - identiques a la version standalone (legacy/standalone.html)

export const TOTAL_SPRINTS = 20;

export const WIP_LIMITS = { analyse: 4, dev: 4, test: 2 };

// Duree d'un sprint cote serveur, en secondes
export const DEFAULT_SPRINT_TIME = 60;
// Pas d'ajustement du minuteur par l'hote (+/-) et plancher de temps restant
export const TIMER_STEP = 30;
export const MIN_SPRINT_TIME = 5;

// Pause automatique du cycle : apres chaque bloc de N sprints valides, le minuteur
// s'arrete et l'hote doit relancer a la main (temps d'expliquer les changements /
// declencher une trame). 0 = jamais de pause automatique.
export const PAUSE_EVERY_SPRINTS = 5;

// Penalite appliquee (echeance depassee, bug prod non resolu)
export const PENALTY = 5000;

// Nombre max de demandes en file d'attente
export const MAX_INCOMING = 4;

// Maintenance en production : au plus 1 nouveau bug par equipe et par sprint
// (tirage unique), avec au plus MAINTENANCE_BUG_CAP bugs actifs a la fois.
export const MAINTENANCE_BUG_CHANCE = 0.25;
export const MAINTENANCE_BUG_CAP = 2;
// Penalite par sprint d'un bug non resolu : proportionnelle au budget du projet
// (plancher = PENALTY). Un gros projet en panne coute beaucoup plus cher.
export const MAINTENANCE_BUG_PENALTY_RATE = 0.2;

// Part de tirages "malus" parmi les incidents automatiques
export const MALUS_DRAW_RATIO = 0.7;

// Taille max du journal de bord conserve par equipe
export const LOG_CAP = 60;

// Cout de recrutement d'un developpeur (deduit du CA net)
export const HIRE_COST = { front: 10000, back: 10000, full: 17500 };

// Repartition du CA d'un projet : une part est encaissee a la fin de chaque
// etape, la livraison (test -> production) represente l'essentiel. Somme = 1.
export const STAGE_PAYOUT = { analyse: 0.05, dev: 0.2, test: 0.75 };

// ------------------------------------------------------------------ negociation
// La salle "Direction" negocie chaque appel d'offres avant de le signer : deux
// curseurs, chacun avec une contrepartie sur la valeur du contrat.
//  - delai     : joue sur la marge d'echeance (marginDelta, en sprints)
//  - perimetre : joue sur l'effectif requis (dev + qa)
// Les multiplicateurs de valeur se cumulent (delai x perimetre).
export const NEGOTIATION = {
  delai: {
    express: { label: 'Express', marginDelta: -2, valueMult: 1.25 },
    standard: { label: 'Standard', marginDelta: 0, valueMult: 1 },
    confort: { label: 'Confort', marginDelta: 3, valueMult: 0.85 },
  },
  perimetre: {
    leger: { label: 'Leger', devDelta: -1, qaDelta: -1, valueMult: 0.7 },
    standard: { label: 'Standard', devDelta: 0, qaDelta: 0, valueMult: 1 },
    costaud: { label: 'Costaud', devDelta: 1, qaDelta: 1, valueMult: 1.4 },
  },
};

// Renegociation d'un contrat deja signe : +1 sprint d'echeance contre -10 % de
// valeur, RENEGOTIATE_MAX fois au maximum sur la vie du projet.
export const RENEGOTIATE_MARGIN_GAIN = 1;
export const RENEGOTIATE_VALUE_MULT = 0.9;
export const RENEGOTIATE_MAX = 2;
