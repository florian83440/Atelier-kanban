<script setup>
import KanbanColumn from './KanbanColumn.vue';

defineProps({
  team: { type: Object, required: true },
  sprint: { type: Number, required: true },
});

const COLUMNS = [
  { stage: 'analyse', title: '1. Analyse & Spec', headerClass: 'col-analyst' },
  { stage: 'dev', title: '2. Développement', headerClass: 'col-dev' },
  { stage: 'test', title: '3. Test & Recette', headerClass: 'col-qa' },
  { stage: 'done', title: '4. Production', headerClass: 'col-done' },
];
</script>

<template>
  <section class="kanban-board">
    <KanbanColumn
      v-for="c in COLUMNS"
      :key="c.stage"
      :team="team"
      :sprint="sprint"
      :stage="c.stage"
      :title="c.title"
      :header-class="c.headerClass"
    />
  </section>
</template>
