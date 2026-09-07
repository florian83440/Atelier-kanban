<script setup>
import ProjectCard from './ProjectCard.vue';
import AppIcon from './AppIcon.vue';

defineProps({
  team: { type: Object, required: true },
  sprint: { type: Number, required: true },
});
</script>

<template>
  <section class="incoming-section">
    <div class="incoming-header">
      <span><AppIcon name="inbox" /> Demandes entrantes (max 4)</span>
      <span>« Prendre en analyse » place la demande sur le board</span>
    </div>
    <div class="incoming-grid">
      <ProjectCard
        v-for="p in team.incomingProjects"
        :key="p.id"
        :project="p"
        :team="team"
        :sprint="sprint"
        mode="incoming"
      />
      <div v-if="team.incomingProjects.length === 0" class="incoming-empty">
        Aucune demande en attente.
      </div>
    </div>
  </section>
</template>
