<script setup>
import { computed } from 'vue';
import { WIP_LIMITS } from '@kanban-it/shared';
import ProjectCard from './ProjectCard.vue';

const props = defineProps({
  team: { type: Object, required: true },
  sprint: { type: Number, required: true },
  stage: { type: String, required: true }, // analyse | dev | test | done
  title: { type: String, required: true },
  headerClass: { type: String, required: true },
});

const projects = computed(() => props.team.activeProjects.filter((p) => p.stage === props.stage));
const wipLimit = computed(() => WIP_LIMITS[props.stage] ?? null);
const wipLabel = computed(() => (wipLimit.value == null ? '∞' : `MAX ${wipLimit.value}`));
const overWip = computed(() => wipLimit.value != null && projects.value.length > wipLimit.value);
</script>

<template>
  <div class="kanban-column">
    <div class="column-header" :class="[headerClass, { 'wip-over': overWip }]">
      <span>{{ title }}</span>
      <small>{{ projects.length }}<template v-if="wipLimit != null">/{{ wipLimit }}</template> · {{ wipLabel }}</small>
    </div>
    <div class="column-body">
      <ProjectCard
        v-for="p in projects"
        :key="p.id"
        :project="p"
        :team="team"
        :sprint="sprint"
        mode="active"
      />
    </div>
  </div>
</template>
