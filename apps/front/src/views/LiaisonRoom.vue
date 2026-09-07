<script setup>
import { provide, computed } from 'vue';
import { typeLabel } from '@kanban-it/shared';
import KanbanBoard from '../components/KanbanBoard.vue';
import IncidentSlot from '../components/IncidentSlot.vue';
import EventLog from '../components/EventLog.vue';
import MetricsPanel from '../components/MetricsPanel.vue';
import AppIcon from '../components/AppIcon.vue';

const props = defineProps({
  team: { type: Object, required: true },
  sprint: { type: Number, required: true },
});

// La passerelle voit tout mais n'agit sur rien.
provide('readOnly', true);
provide('hideValue', false);

function fmt(n) { return Number(n || 0).toLocaleString('fr-FR'); }
const offers = computed(() => props.team.incomingProjects || []);
</script>

<template>
  <div class="room room-liaison">
    <p class="room-note">
      <AppIcon name="users" />
      <span>
        Vous êtes la <strong>passerelle</strong> entre la salle Direction et la salle
        Delivery. Vous voyez tout, mais vous n'agissez sur rien : faites circuler
        l'information à l'oral (capacité, priorités, retards, budget).
      </span>
    </p>

    <section class="panel-box">
      <h3><AppIcon name="inbox" /> Appels d'offres en attente</h3>
      <ul class="liaison-offers">
        <li v-for="o in offers" :key="o.id">
          <span>{{ o.name }}</span>
          <span class="muted">{{ typeLabel(o.type) }}</span>
          <strong>{{ fmt(o.baseValue ?? o.value) }} €</strong>
        </li>
        <li v-if="offers.length === 0" class="muted">Aucun appel d'offres.</li>
      </ul>
    </section>

    <main class="dashboard-grid">
      <KanbanBoard :team="team" :sprint="sprint" />
      <aside>
        <IncidentSlot :card="team.drawnCard" />
        <MetricsPanel :team="team" />
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
  margin: 0 0 8px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #9aa4b2);
  border-left: 3px solid var(--accent-amber, #c47f00);
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-main, #1f2937);
}
.liaison-offers { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1px; }
.liaison-offers li {
  display: flex;
  gap: 10px;
  align-items: baseline;
  padding: 6px 8px;
  border: 1px solid var(--border-light, #c7cdd6);
  font-size: 13px;
}
.liaison-offers li span:first-child { flex: 1; font-weight: 600; }
.liaison-offers .muted { color: var(--text-muted, #64748b); font-size: 12px; }
</style>
