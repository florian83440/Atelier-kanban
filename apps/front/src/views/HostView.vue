<script setup>
import { ref, computed } from 'vue';
import {
  state,
  clearSession,
  hostStart,
  hostValidate,
  hostAdjustTimer,
  hostReset,
} from '../net/useGame.js';
import { TIMER_STEP } from '@kanban-it/shared';
import { useCountdown } from '../lib/useCountdown.js';
import TeamSummaryCard from '../components/host/TeamSummaryCard.vue';
import EndModal from '../components/EndModal.vue';
import AppIcon from '../components/AppIcon.vue';

function fmt(n) { return n.toLocaleString('fr-FR'); }

const { label: timerLabel, warning } = useCountdown();

const phase = computed(() => state.game?.phase ?? 'lobby');
const sprint = computed(() => state.game?.sprint ?? 1);
const totalSprints = computed(() => state.game?.totalSprints ?? 20);
const teams = computed(() => state.teams || []);
const hasTeams = computed(() => teams.value.length > 0);

const phaseLabel = computed(() =>
  phase.value === 'lobby' ? 'En attente' : phase.value === 'running' ? 'En cours' : 'Terminée',
);

const totalNet = computed(() =>
  teams.value.reduce((n, t) => n + (t.totalDeliveredValue - t.totalPenalties), 0),
);
const totalDelivered = computed(() =>
  teams.value.reduce((n, t) => n + t.totalDeliveredValue, 0),
);

const ranking = computed(() =>
  [...teams.value]
    .map((t) => ({
      id: t.id,
      name: t.name,
      net: t.totalDeliveredValue - t.totalPenalties,
      delivered: t.totalDeliveredValue,
      penalties: t.totalPenalties,
      completed: t.totalCompletedProjects,
    }))
    .sort((a, b) => b.net - a.net),
);
const rankById = computed(() => {
  const m = {};
  ranking.value.forEach((r, i) => { m[r.id] = i + 1; });
  return m;
});

const inspectId = ref(null);
const inspectTeam = computed(() => teams.value.find((t) => t.id === inspectId.value) || null);
</script>

<template>
  <div class="host-view">
    <header class="host-bar">
      <div class="host-title"><AppIcon name="brand" /> KANBAN IT — <span>Tableau de bord</span></div>

      <div class="host-status">
        <div class="hs-block">
          <span>Partie</span><strong>{{ state.code }}</strong>
        </div>
        <div class="hs-block">
          <span>Sprint</span>
          <strong v-if="phase === 'lobby'">—</strong>
          <strong v-else>{{ sprint }} / {{ totalSprints }}</strong>
        </div>
        <div v-if="phase === 'running'" class="hs-block timer" :class="{ warning }">
          <span>Temps</span><strong>{{ timerLabel }}</strong>
        </div>
        <div class="hs-block">
          <span>Statut</span><strong>{{ phaseLabel }}</strong>
        </div>
        <div class="hs-block">
          <span>Équipes</span><strong>{{ teams.length }}</strong>
        </div>
        <div class="hs-block">
          <span>CA cumulé</span><strong>{{ fmt(totalDelivered) }} €</strong>
        </div>
        <div class="hs-block">
          <span>Net cumulé</span><strong :class="totalNet >= 0 ? 'pos' : 'neg'">{{ fmt(totalNet) }} €</strong>
        </div>
      </div>

      <div class="host-actions">
        <button class="btn btn-primary" :disabled="phase !== 'lobby' || !hasTeams" @click="hostStart">
          <AppIcon name="play" /> Démarrer
        </button>
        <button class="btn btn-secondary" :disabled="phase !== 'running'" @click="hostValidate">
          Valider le sprint <AppIcon name="arrowRight" />
        </button>
        <button
          class="btn btn-secondary"
          :title="`Retirer ${TIMER_STEP} s au sprint`"
          :disabled="phase !== 'running'"
          @click="hostAdjustTimer(-TIMER_STEP)"
        >
          <AppIcon name="minus" /> {{ TIMER_STEP }} s
        </button>
        <button
          class="btn btn-secondary"
          :title="`Ajouter ${TIMER_STEP} s au sprint`"
          :disabled="phase !== 'running'"
          @click="hostAdjustTimer(TIMER_STEP)"
        >
          <AppIcon name="plus" /> {{ TIMER_STEP }} s
        </button>
        <button class="btn btn-danger" :disabled="phase === 'lobby'" @click="hostReset">
          Réinitialiser
        </button>
        <button class="btn btn-secondary" @click="clearSession()">Quitter</button>
      </div>
    </header>

    <div v-if="!hasTeams" class="host-wait">
      En attente de joueurs. Communiquez le code <strong>{{ state.code }}</strong> :
      chaque joueur rejoint avec ce code et un nom d'équipe (un même nom = un board partagé).
    </div>

    <template v-else>
      <div class="host-leaderboard">
        <span class="lb-title">Classement</span>
        <span
          v-for="(r, i) in ranking"
          :key="r.id"
          class="lb-item"
          :class="{ first: i === 0 && phase !== 'lobby' }"
        >
          <b>{{ i + 1 }}.</b> {{ r.name }}
          <em :class="r.net >= 0 ? 'pos' : 'neg'">{{ fmt(r.net) }} €</em>
          <small>{{ r.completed }} livré(s)</small>
        </span>
      </div>

      <div class="host-teams">
        <TeamSummaryCard
          v-for="t in teams"
          :key="t.id"
          :team="t"
          :sprint="sprint"
          :phase="phase"
          :rank="rankById[t.id]"
          @inspect="inspectId = $event"
        />
      </div>
    </template>

    <EndModal
      v-if="inspectTeam"
      :title="`Progression — Équipe ${inspectTeam.name}`"
      :history="inspectTeam.history"
      @close="inspectId = null"
    />
  </div>
</template>
