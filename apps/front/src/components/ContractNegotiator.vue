<script setup>
import { reactive, computed } from 'vue';
import { NEGOTIATION, WIP_LIMITS, typeLabel, negotiateTerms } from '@kanban-it/shared';
import { acceptProject, rejectProject } from '../net/useGame.js';
import AppIcon from './AppIcon.vue';

const props = defineProps({
  project: { type: Object, required: true },
  team: { type: Object, required: true },
  sprint: { type: Number, required: true },
});

const terms = reactive({ delai: 'standard', perimetre: 'standard' });

const delaiOpts = Object.entries(NEGOTIATION.delai).map(([key, v]) => ({ key, ...v }));
const perimetreOpts = Object.entries(NEGOTIATION.perimetre).map(([key, v]) => ({ key, ...v }));

const preview = computed(() => negotiateTerms(props.project, terms));
const deadline = computed(() => props.sprint + props.project.totalTheoDur + preview.value.margin);
const negotiated = computed(() => terms.delai !== 'standard' || terms.perimetre !== 'standard');
const delta = computed(() => preview.value.value - props.project.baseValue);

const analyseFull = computed(
  () => props.team.activeProjects.filter((p) => p.stage === 'analyse').length >= WIP_LIMITS.analyse,
);

function fmt(n) { return n.toLocaleString('fr-FR'); }
function signed(n) { return (n > 0 ? '+' : '') + fmt(n); }

function signContract() {
  acceptProject(props.project.id, { delai: terms.delai, perimetre: terms.perimetre });
}
</script>

<template>
  <div class="nego-card">
    <div class="nego-head">
      <span class="nego-name">{{ project.name }}</span>
      <span class="nego-base">catalogue {{ fmt(project.baseValue) }} €</span>
    </div>
    <div class="nego-meta">
      Type <strong>{{ typeLabel(project.type) }}</strong>
      · Specs {{ project.dur.analyse }}T / Dev {{ project.dur.dev }}T / QA {{ project.dur.test }}T
    </div>

    <div class="nego-row">
      <span class="nego-label">Délai</span>
      <div class="nego-seg">
        <button
          v-for="o in delaiOpts"
          :key="o.key"
          type="button"
          :class="{ active: terms.delai === o.key }"
          @click="terms.delai = o.key"
        >{{ o.label }}</button>
      </div>
    </div>
    <div class="nego-row">
      <span class="nego-label">Périmètre</span>
      <div class="nego-seg">
        <button
          v-for="o in perimetreOpts"
          :key="o.key"
          type="button"
          :class="{ active: terms.perimetre === o.key }"
          @click="terms.perimetre = o.key"
        >{{ o.label }}</button>
      </div>
    </div>

    <div class="nego-preview">
      <div class="nego-price">
        {{ fmt(preview.value) }} €
        <span v-if="negotiated" class="nego-delta" :class="delta >= 0 ? 'up' : 'down'">
          {{ signed(delta) }} €
        </span>
      </div>
      <div class="nego-terms">
        <span><AppIcon name="clock" /> échéance Sprint {{ deadline }}</span>
        <span>
          <AppIcon name="analyst" />{{ preview.req.analyst }}
          <AppIcon name="dev" />{{ preview.req.dev }}
          <AppIcon name="qa" />{{ preview.req.qa }}
        </span>
      </div>
    </div>

    <div class="nego-actions">
      <button
        class="btn btn-primary"
        :disabled="analyseFull"
        @click="signContract()"
      >
        <template v-if="analyseFull">Colonne Analyse pleine</template>
        <template v-else>Signer le contrat <AppIcon name="arrowRight" /></template>
      </button>
      <button
        class="btn btn-secondary"
        title="Écarter cet appel d'offres (remplacé par un nouveau)"
        @click="rejectProject(project.id)"
      >
        <AppIcon name="close" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.nego-card {
  border: 1px solid var(--border-color, #9aa4b2);
  background: var(--bg-card, #fff);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}
.nego-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.nego-name { font-weight: 700; }
.nego-base { color: var(--text-muted, #64748b); font-size: 12px; }
.nego-meta { color: var(--text-muted, #64748b); font-size: 12px; }
.nego-row { display: flex; align-items: center; gap: 8px; }
.nego-label { width: 74px; color: var(--text-muted, #64748b); flex: none; }
.nego-seg { display: flex; flex: 1; }
.nego-seg button {
  flex: 1;
  padding: 5px 4px;
  border: 1px solid var(--border-color, #9aa4b2);
  border-left-width: 0;
  background: var(--bg-card, #fff);
  color: var(--text-main, #1f2937);
  cursor: pointer;
  font-size: 12px;
}
.nego-seg button:first-child { border-left-width: 1px; }
.nego-seg button.active {
  background: var(--accent-blue, #0b74c4);
  border-color: var(--accent-blue, #0b74c4);
  color: #fff;
}
.nego-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--bg-dropzone, #f4f6f8);
  border: 1px solid var(--border-light, #c7cdd6);
  flex-wrap: wrap;
}
.nego-price { font-weight: 700; font-size: 15px; }
.nego-delta { font-size: 12px; margin-left: 4px; }
.nego-delta.up { color: var(--accent-green, #0f9d63); }
.nego-delta.down { color: var(--accent-red, #d13438); }
.nego-terms { display: flex; gap: 12px; color: var(--text-muted, #64748b); font-size: 12px; flex-wrap: wrap; }
.nego-actions { display: flex; gap: 6px; }
.nego-actions .btn:first-child { flex: 1; }
</style>
