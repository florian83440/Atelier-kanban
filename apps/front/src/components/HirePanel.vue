<script setup>
import { HIRE_COST } from '@kanban-it/shared';
import { hireDev } from '../net/useGame.js';
import AppIcon from './AppIcon.vue';

defineProps({
  team: { type: Object, required: true },
});

function fmt(n) { return n.toLocaleString('fr-FR'); }
const options = [
  { spec: 'back', label: 'Back' },
  { spec: 'front', label: 'Front' },
  { spec: 'full', label: 'Full' },
];
</script>

<template>
  <div class="panel-box">
    <h3><AppIcon name="dev" /> Recrutement</h3>
    <p class="hire-hint">Coût déduit du CA net. Le dev arrive disponible immédiatement.</p>
    <div class="hire-btns">
      <button
        v-for="o in options"
        :key="o.spec"
        class="btn btn-secondary hire-btn"
        @click="hireDev(o.spec)"
      >
        <AppIcon name="plus" /> Dev {{ o.label }}
        <span class="hire-cost">−{{ fmt(HIRE_COST[o.spec]) }} €</span>
      </button>
    </div>
    <p v-if="team.totalHiringCost" class="hire-total">
      Recrutements : <strong>−{{ fmt(team.totalHiringCost) }} €</strong>
    </p>
  </div>
</template>
