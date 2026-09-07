<script setup>
import { computed } from 'vue';
import { netValue } from '@kanban-it/shared';

const props = defineProps({
  team: { type: Object, required: true },
});

function fmt(n) { return n.toLocaleString('fr-FR'); }

const busyStaff = computed(() =>
  props.team.activeProjects.reduce((n, p) => n + p.assigned.length, 0),
);
const net = computed(() => netValue(props.team));
</script>

<template>
  <div class="panel-box">
    <h3>Indicateurs métriques</h3>
    <ul class="stats-list">
      <li>CA livré <strong style="color: var(--accent-green)">{{ fmt(team.totalDeliveredValue) }} €</strong></li>
      <li>Pénalités <strong style="color: var(--accent-red)">- {{ fmt(team.totalPenalties) }} €</strong></li>
      <li v-if="team.totalHiringCost">
        Recrutement <strong style="color: var(--accent-red)">- {{ fmt(team.totalHiringCost) }} €</strong>
      </li>
      <li>Net <strong>{{ fmt(net) }} €</strong></li>
      <li>Projets livrés <strong>{{ team.totalCompletedProjects }}</strong></li>
      <li>Indisponibilités <strong>{{ team.activeMalus.length }}</strong></li>
      <li>Ressources occupées <strong>{{ busyStaff }}/{{ team.staff.length }}</strong></li>
    </ul>
  </div>
</template>
