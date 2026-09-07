<script setup>
import { provide } from 'vue';
import KanbanBoard from '../components/KanbanBoard.vue';
import StaffPool from '../components/StaffPool.vue';
import IncidentSlot from '../components/IncidentSlot.vue';
import EventLog from '../components/EventLog.vue';
import AppIcon from '../components/AppIcon.vue';

defineProps({
  team: { type: Object, required: true },
  sprint: { type: Number, required: true },
});

// Le board masque les montants ; les affectations restent actives.
provide('hideValue', true);
provide('readOnly', false);
</script>

<template>
  <div class="room room-delivery">
    <p class="room-note">
      <AppIcon name="users" />
      <span>
        Salle <strong>Delivery</strong> — vous pilotez les équipes de dev. Vous ne voyez
        pas les montants : le budget et l'échéance de chaque contrat sont fixés par la
        salle <strong>Direction</strong>. Demandez-leur, et prévenez-les des retards.
      </span>
    </p>

    <main class="dashboard-grid">
      <KanbanBoard :team="team" :sprint="sprint" />

      <aside>
        <StaffPool :team="team" />
        <IncidentSlot :card="team.drawnCard" />
        <EventLog :log="team.log" />
      </aside>
    </main>
  </div>
</template>

<style scoped>
.room-note {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 10px 14px;
  margin: 0 0 4px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #9aa4b2);
  border-left: 3px solid var(--accent-blue, #0b74c4);
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-main, #1f2937);
}
</style>
