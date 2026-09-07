<script setup>
import { ref, computed, watch } from 'vue';
import { state, clearSession } from '../net/useGame.js';
import TopBar from '../components/TopBar.vue';
import IncomingSection from '../components/IncomingSection.vue';
import KanbanBoard from '../components/KanbanBoard.vue';
import StaffPool from '../components/StaffPool.vue';
import IncidentSlot from '../components/IncidentSlot.vue';
import EventLog from '../components/EventLog.vue';
import MetricsPanel from '../components/MetricsPanel.vue';
import EndModal from '../components/EndModal.vue';
import AppIcon from '../components/AppIcon.vue';

const team = computed(() => state.team);
const sprint = computed(() => state.game?.sprint ?? 1);
const phase = computed(() => state.game?.phase ?? 'lobby');

const showEnd = ref(false);
watch(
  () => state.gameOver,
  (v) => { if (v && v.team) showEnd.value = true; },
);
watch(phase, (p) => { if (p === 'finished') showEnd.value = true; });

// Message d'erreur serveur (ex. demande deja prise, membre verrouille) : visible puis auto-efface.
let errTimer = null;
watch(
  () => state.error,
  (msg) => {
    clearTimeout(errTimer);
    if (msg) errTimer = setTimeout(() => { state.error = null; }, 5000);
  },
);
function dismissError() { clearTimeout(errTimer); state.error = null; }

const endHistory = computed(
  () => state.gameOver?.team?.history || team.value?.history || { labels: [], revenue: [], penalties: [], staffUsage: [] },
);
</script>

<template>
  <div v-if="team">
    <TopBar :subtitle="`Équipe ${team.name}`">
      <button class="btn btn-secondary" @click="clearSession()">Quitter</button>
    </TopBar>

    <div v-if="phase === 'lobby'" class="net-banner ok">
      Connecté à la partie <strong>{{ state.code }}</strong> — en attente du démarrage par l'hôte.
    </div>

    <div v-if="state.error" class="net-banner err" @click="dismissError">
      <AppIcon name="warn" /> {{ state.error }} <span class="dismiss">(cliquer pour masquer)</span>
    </div>

    <IncomingSection :team="team" :sprint="sprint" />

    <main class="dashboard-grid">
      <KanbanBoard :team="team" :sprint="sprint" />

      <aside>
        <StaffPool :team="team" />
        <IncidentSlot :card="team.drawnCard" />
        <EventLog :log="team.log" />
        <MetricsPanel :team="team" />
      </aside>
    </main>

    <EndModal
      v-if="showEnd"
      :title="`Bilan — Équipe ${team.name}`"
      :history="endHistory"
      @close="showEnd = false"
    />
  </div>

  <div v-else class="join-wrap">
    <h1><AppIcon name="brand" /> KANBAN IT</h1>
    <p class="sub">Connexion à la partie…</p>
  </div>
</template>
