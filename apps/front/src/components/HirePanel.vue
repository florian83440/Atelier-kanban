<script setup>
import { HIRE_COST } from '@kanban-it/shared';
import { hireStaff } from '../net/useGame.js';
import AppIcon from './AppIcon.vue';

defineProps({
  team: { type: Object, required: true },
});

function fmt(n) { return n.toLocaleString('fr-FR'); }
const devOptions = [
  { kind: 'back', label: 'Back' },
  { kind: 'front', label: 'Front' },
  { kind: 'full', label: 'Full' },
];
const otherOptions = [
  { kind: 'analyst', label: 'PO', icon: 'analyst' },
  { kind: 'qa', label: 'QA', icon: 'qa' },
];
</script>

<template>
  <div class="panel-box">
    <h3><AppIcon name="dev" /> Recrutement</h3>
    <p class="hire-hint">Coût déduit du CA net. Le membre recruté est disponible immédiatement.</p>
    <div class="hire-btns">
      <button
        v-for="o in devOptions"
        :key="o.kind"
        class="btn btn-secondary hire-btn"
        @click="hireStaff(o.kind)"
      >
        <AppIcon name="plus" /> Dev {{ o.label }}
        <span class="hire-cost">−{{ fmt(HIRE_COST[o.kind]) }} €</span>
      </button>
    </div>
    <div class="hire-btns">
      <button
        v-for="o in otherOptions"
        :key="o.kind"
        class="btn btn-secondary hire-btn"
        @click="hireStaff(o.kind)"
      >
        <AppIcon :name="o.icon" /> {{ o.label }}
        <span class="hire-cost">−{{ fmt(HIRE_COST[o.kind]) }} €</span>
      </button>
    </div>
    <p v-if="team.totalHiringCost" class="hire-total">
      Recrutements : <strong>−{{ fmt(team.totalHiringCost) }} €</strong>
    </p>
  </div>
</template>
