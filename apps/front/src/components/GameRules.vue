<script setup>
import { computed } from 'vue';
import {
  TOTAL_SPRINTS,
  WIP_LIMITS,
  MAX_INCOMING,
  PENALTY,
  MAINTENANCE_BUG_CHANCE,
  DEFAULT_SPRINT_TIME,
  TIMER_STEP,
  STAFF_ROSTER,
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
          {{ MAX_INCOMING }} demandes max en file. « Prendre en analyse » pour démarrer,
          <AppIcon name="close" /> pour <strong>écarter</strong> une demande (remplacée
          aussitôt).
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
          Un projet livré peut tomber en panne (~{{ bugPct }} % par sprint) : il faut
          <strong>1 dev</strong> pour corriger, sinon <strong>−{{ euro(PENALTY) }}</strong>.
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
