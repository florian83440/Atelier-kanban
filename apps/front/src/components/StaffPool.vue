<script setup>
import { computed, watch } from 'vue';
import { state, togglePick, malusLeft } from '../net/useGame.js';
import StaffToken from './StaffToken.vue';

const props = defineProps({
  team: { type: Object, required: true },
});

// Membres non affectes a un projet
const assignedIds = computed(() => {
  const s = new Set();
  for (const p of props.team.activeProjects) for (const id of p.assigned) s.add(id);
  return s;
});
const freeStaff = computed(() => props.team.staff.filter((m) => !assignedIds.value.has(m.id)));
const freeCount = computed(() => freeStaff.value.filter((m) => !m.disabled).length);

const pickedMember = computed(
  () => props.team.staff.find((m) => m.id === state.pickStaffId) || null,
);

// Si le pion selectionne n'est plus libre / dispo, on annule la selection.
watch(
  [() => state.pickStaffId, freeStaff],
  () => {
    if (state.pickStaffId && !freeStaff.value.some((m) => m.id === state.pickStaffId && !m.disabled)) {
      state.pickStaffId = null;
    }
  },
);
</script>

<template>
  <div class="panel-box">
    <h3>Ressources disponibles ({{ freeCount }}/{{ team.staff.length }})</h3>

    <div class="tokens-flex">
      <StaffToken
        v-for="m in freeStaff"
        :key="m.id"
        :member="m"
        :selected="m.id === state.pickStaffId"
        :block-left="malusLeft(team, m.id)"
        @activate="togglePick"
      />
      <span v-if="freeStaff.length === 0" class="pool-empty">Toutes les ressources sont affectées.</span>
    </div>

    <p v-if="pickedMember" class="pick-hint">
      <strong>{{ pickedMember.label }}</strong> sélectionné — cliquez un projet pour l'affecter
      (ou re-cliquez le pion pour annuler).
    </p>
    <p v-else class="pick-hint muted">
      Cliquez un pion pour le sélectionner, puis cliquez le projet cible.
    </p>
  </div>
</template>
