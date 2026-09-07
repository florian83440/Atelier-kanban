<script setup>
import { computed, inject } from 'vue';
import { typeLabel, WIP_LIMITS } from '@kanban-it/shared';
import { state, acceptProject, rejectProject, assignPicked, unassignStaff, malusLeft } from '../net/useGame.js';
import StaffToken from './StaffToken.vue';
import AppIcon from './AppIcon.vue';

const props = defineProps({
  project: { type: Object, required: true },
  team: { type: Object, required: true },
  sprint: { type: Number, required: true },
  mode: { type: String, default: 'active' }, // 'incoming' | 'active'
});

// Fournis par la salle Delivery / Passerelle : masquer les montants, board en lecture seule.
const hideValue = inject('hideValue', false);
const readOnly = inject('readOnly', false);

const assignedMembers = computed(() =>
  props.project.assigned
    .map((id) => props.team.staff.find((s) => s.id === id))
    .filter(Boolean),
);
const hasDisabled = computed(() => assignedMembers.value.some((m) => m.disabled));
const frozenLeft = computed(() =>
  Math.max(0, ...assignedMembers.value.filter((m) => m.disabled).map((m) => malusLeft(props.team, m.id))),
);

const isOverdue = computed(
  () => props.project.stage !== 'done' && props.sprint > props.project.maxSprintDeadline,
);

const analyseFull = computed(
  () => props.team.activeProjects.filter((p) => p.stage === 'analyse').length >= WIP_LIMITS.analyse,
);

const targetDuration = computed(() => {
  const p = props.project;
  if (p.stage === 'dev') return p.dur.dev;
  if (p.stage === 'test') return p.dur.test;
  return p.dur.analyse;
});

// icône + libellé du besoin d'effectif selon l'étape
const req = computed(() => {
  const p = props.project;
  if (p.stage === 'dev') return { icon: 'dev', text: `${p.req.dev} Dev(s) requis (${p.type.toUpperCase()})` };
  if (p.stage === 'test') return { icon: 'qa', text: `${p.req.qa} QA(s) requis` };
  if (p.stage === 'done') {
    return p.hasMaintenanceBug
      ? { icon: 'bug', text: 'BUG EN PROD : 1 Dev requis' }
      : { icon: 'check', text: 'En production (stable)' };
  }
  return { icon: 'analyst', text: `${p.req.analyst} PO requis` };
});

const pct = computed(() =>
  props.project.stage === 'done'
    ? 100
    : Math.min(100, (props.project.progress / targetDuration.value) * 100),
);

const canPlace = computed(() => !!state.pickStaffId);

function onZoneClick(ev) {
  if (readOnly) return;
  // Un clic sur un pion deja affecte = retrait (gere par onRemove) : ne pas ré-affecter.
  if (ev.target.closest?.('.token')) return;
  if (state.pickStaffId) assignPicked(props.project.id);
}

function onRemove(member) {
  if (readOnly || member.disabled) return;
  unassignStaff(member.id);
}

function fmt(n) { return n.toLocaleString('fr-FR'); }
// Avancement fractionnaire (effectif partiel = progression partielle)
function fmtProgress(n) { return Number.isInteger(n) ? String(n) : n.toFixed(1); }
</script>

<template>
  <!-- Carte "appel d'offres" en file d'attente -->
  <div v-if="mode === 'incoming'" class="project-card">
    <div class="project-header">
      <span>{{ project.name }}</span>
      <span v-if="!hideValue" class="project-value">{{ fmt(project.value) }} €</span>
    </div>
    <div class="project-info">
      Type : <strong>{{ typeLabel(project.type) }}</strong><br />
      Specs : {{ project.dur.analyse }}T | Dev : {{ project.dur.dev }}T | QA : {{ project.dur.test }}T
    </div>
    <div class="role-req-box">
      <AppIcon name="analyst" />{{ project.req.analyst }}
      <AppIcon name="dev" />{{ project.req.dev }}
      <AppIcon name="qa" />{{ project.req.qa }}
    </div>
    <div class="deadline-tag"><AppIcon name="clock" /> Durée max : {{ project.totalTheoDur + project.margin }} sprints</div>
    <div v-if="!readOnly" class="incoming-actions">
      <button
        class="btn btn-primary card-accept-btn"
        :disabled="analyseFull"
        @click="acceptProject(project.id)"
      >
        <template v-if="analyseFull">Colonne Analyse pleine</template>
        <template v-else>Prendre en analyse <AppIcon name="arrowRight" /></template>
      </button>
      <button
        class="btn btn-secondary card-reject-btn"
        title="Écarter cette demande (remplacée par une nouvelle)"
        @click="rejectProject(project.id)"
      >
        <AppIcon name="close" />
      </button>
    </div>
  </div>

  <!-- Carte projet sur le board -->
  <div
    v-else
    class="project-card"
    :class="{
      'maint-alert': project.hasMaintenanceBug,
      'late-alert': isOverdue,
      'blocked-malus': hasDisabled,
      'place-target': canPlace,
    }"
    @click="onZoneClick"
  >
    <div class="project-header">
      <span>{{ project.name }}</span>
      <span v-if="!hideValue" class="project-value">
        {{ fmt(project.value) }} €<template v-if="project.earned > 0 && project.stage !== 'done'">
          <span class="project-earned">encaissé {{ fmt(project.earned) }}</span></template>
      </span>
    </div>
    <div class="project-info">
      Avancement : {{ fmtProgress(project.progress) }}/{{ targetDuration }} tour(s)
      <strong v-if="hasDisabled" class="frozen-tag">
        <AppIcon name="frozen" /> FIGÉ<template v-if="frozenLeft > 0"> — {{ frozenLeft }} sprint(s)</template>
      </strong>
    </div>
    <div v-if="project.stage !== 'done'" class="progress-bar-bg">
      <div class="progress-bar-fill" :style="{ width: pct + '%' }"></div>
    </div>
    <div class="deadline-tag" :class="{ overdue: isOverdue }">
      <template v-if="project.stage !== 'done'">
        <AppIcon name="clock" /> Échéance : Sprint {{ project.maxSprintDeadline }}
      </template>
      <template v-else><AppIcon name="check" /> Livré</template>
    </div>
    <div class="role-req-box"><AppIcon :name="req.icon" /> {{ req.text }}</div>
    <div class="dropzone-stage">
      <StaffToken
        v-for="m in assignedMembers"
        :key="m.id"
        :member="m"
        :block-left="malusLeft(team, m.id)"
        @activate="onRemove(m)"
      />
      <span v-if="assignedMembers.length === 0" class="zone-placeholder">
        <template v-if="canPlace"><AppIcon name="plus" /> Affecter ici</template>
        <template v-else>Aucun membre affecté</template>
      </span>
    </div>
  </div>
</template>
