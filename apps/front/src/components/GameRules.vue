<script setup>
import { computed } from 'vue';
import {
  TOTAL_SPRINTS,
  WIP_LIMITS,
  MAX_INCOMING,
  PENALTY,
  MAINTENANCE_BUG_CHANCE,
  MAINTENANCE_BUG_CAP,
  MAINTENANCE_BUG_PENALTY_RATE,
  DEFAULT_SPRINT_TIME,
  TIMER_STEP,
  STAFF_ROSTER,
  HIRE_COST,
  STAGE_PAYOUT,
} from '@kanban-it/shared';
import AppIcon from './AppIcon.vue';

function euro(n) { return n.toLocaleString('fr-FR') + ' €'; }

const roster = computed(() => {
  const c = { analyst: 0, dev: 0, qa: 0 };
  for (const s of STAFF_ROSTER) c[s.role]++;
  return c;
});
const bugPct = Math.round(MAINTENANCE_BUG_CHANCE * 100);
</script>

<template>
  <div class="rules">
    <h2 class="rules-title">Règles &amp; contraintes</h2>
    <p class="rules-lead">
      Chaque <strong>équipe</strong> pilote un board Kanban. Objectif : livrer le plus de
      valeur possible en <strong>{{ TOTAL_SPRINTS }} sprints</strong>. Le score est le
      <strong>CA net</strong> = CA livré − pénalités.
    </p>

    <div class="rules-grid">
      <section class="rules-card">
        <h3><AppIcon name="arrowRight" /> Le flux</h3>
        <p><strong>Analyse → Développement → Test → Production.</strong></p>
        <p class="muted">
          Limites d'en-cours (WIP) : Analyse {{ WIP_LIMITS.analyse }} · Dév
          {{ WIP_LIMITS.dev }} · Test {{ WIP_LIMITS.test }}. Une colonne pleine bloque
          l'étape précédente.
        </p>
        <p class="muted">
          Le CA d'un projet est encaissé par étapes :
          {{ Math.round(STAGE_PAYOUT.analyse * 100) }} % à la fin de l'analyse,
          {{ Math.round(STAGE_PAYOUT.dev * 100) }} % à la fin du dév, et
          <strong>{{ Math.round(STAGE_PAYOUT.test * 100) }} % à la livraison</strong>.
        </p>
      </section>

      <section class="rules-card">
        <h3><AppIcon name="users" /> L'équipe (partagée)</h3>
        <p>
          <AppIcon name="analyst" /> {{ roster.analyst }} PO ·
          <AppIcon name="dev" /> {{ roster.dev }} devs (back / full / front) ·
          <AppIcon name="qa" /> {{ roster.qa }} QA.
        </p>
        <p class="muted">
          Sélectionnez un pion puis cliquez le projet cible. Un membre se déplace d'un
          projet à l'autre <strong>à tout moment</strong> — aucun verrou. Seule une
          absence (incident) l'immobilise.
        </p>
      </section>

      <section class="rules-card">
        <h3><AppIcon name="plus" /> Recrutement</h3>
        <p>
          Engagez des devs à tout moment :
          <strong>Back / Front {{ (HIRE_COST.front / 1000) }} k€</strong>,
          <strong>Full {{ (HIRE_COST.full / 1000) }} k€</strong>.
        </p>
        <p class="muted">Le coût est déduit du CA net — plus vite mais moins rentable.</p>
      </section>

      <section class="rules-card">
        <h3><AppIcon name="clock" /> Avancement</h3>
        <p>
          Chaque étape avance de <strong>effectif affecté ÷ effectif requis</strong> par
          sprint (plafond 1).
        </p>
        <p class="muted">1 dev sur 2 requis → le projet avance de moitié ce sprint.</p>
      </section>

      <section class="rules-card">
        <h3><AppIcon name="dev" /> Devs &amp; spécialité</h3>
        <p>
          Un dev <strong>full</strong> est efficace partout. Un dev du mauvais type — ou
          un front/back sur un projet <em>fullstack</em> — compte pour <strong>½</strong>.
        </p>
        <p class="muted">2 devs mal typés ≈ 1 dev efficace. Aucun malus de durée.</p>
      </section>

      <section class="rules-card">
        <h3><AppIcon name="inbox" /> Demandes entrantes</h3>
        <p>
          {{ MAX_INCOMING }} demandes max en file, <strong>2 nouvelles par sprint</strong>.
          « Prendre en analyse » pour démarrer, <AppIcon name="close" /> pour
          <strong>écarter</strong> une demande (remplacée aussitôt).
        </p>
        <p class="muted">
          Plus la partie avance, plus l'offre contient de <strong>gros budgets</strong>
          et de <strong>petits projets éclairs</strong> (peu rentables, très rapides).
        </p>
      </section>

      <section class="rules-card">
        <h3><AppIcon name="overdue" /> Échéances</h3>
        <p>
          Chaque projet accepté a une échéance (durée théorique + marge). Chaque sprint de
          retard coûte <strong>−{{ euro(PENALTY) }}</strong>.
        </p>
      </section>

      <section class="rules-card">
        <h3><AppIcon name="bolt" /> Incidents RH</h3>
        <p>
          Un sprint sur deux, une carte frappe l'équipe : absences temporaires de devs,
          QA ou analystes. <strong>Jamais deux fois le même</strong> d'affilée.
        </p>
        <p class="muted">
          Un membre bloqué reste sur son projet, qui est <strong>figé</strong> le temps
          du blocage.
        </p>
      </section>

      <section class="rules-card">
        <h3><AppIcon name="bug" /> Bugs en production</h3>
        <p>
          <strong>Au plus 1 nouveau bug par sprint</strong> (~{{ bugPct }} % de chance),
          <strong>{{ MAINTENANCE_BUG_CAP }} actifs</strong> max — quel que soit le nombre
          de projets livrés.
        </p>
        <p class="muted">
          Chaque bug demande <strong>1 dev</strong> le temps d'un sprint pour être
          corrigé. Sinon, pénalité par sprint <strong>proportionnelle au budget du
          projet</strong> ({{ Math.round(MAINTENANCE_BUG_PENALTY_RATE * 100) }} %, min
          {{ euro(PENALTY) }}) — un gros projet en panne coûte très cher.
        </p>
      </section>

      <section class="rules-card">
        <h3><AppIcon name="users" /> Deux salles par équipe</h3>
        <p>
          Une équipe peut se scinder : la <strong>Direction</strong> négocie les contrats
          et tient le budget, la <strong>Delivery</strong> pilote les équipes de dev. Une
          <strong>passerelle</strong> relaie l'info entre les deux.
        </p>
        <p class="muted">
          Chaque salle ne voit qu'une partie du jeu (montants d'un côté, avancement et
          effectif de l'autre) : il faut se parler. Un joueur seul choisit « je gère tout ».
        </p>
      </section>

      <section class="rules-card">
        <h3><AppIcon name="arrowRight" /> Négocier un contrat</h3>
        <p>
          À l'acceptation, la Direction règle deux curseurs : <strong>délai</strong>
          (Express / Standard / Confort) et <strong>périmètre</strong> (Léger / Standard /
          Costaud). Chaque cran échange de la valeur contre du délai ou des ressources.
        </p>
        <p class="muted">
          Un contrat signé peut être <strong>renégocié</strong> en cours de route :
          +1 sprint d'échéance contre −10 % de valeur, 2 fois au maximum.
        </p>
      </section>

      <section class="rules-card">
        <h3><AppIcon name="play" /> Le rôle de l'hôte</h3>
        <p>
          L'hôte <strong>démarre la partie</strong>, valide chaque sprint (ou le minuteur
          de {{ DEFAULT_SPRINT_TIME }} s le fait), peut ±{{ TIMER_STEP }} s au minuteur et
          réinitialiser.
        </p>
      </section>
    </div>
  </div>
</template>
