<script setup>
import { ref, computed, watch } from 'vue';
import { state, clearSession } from '../net/useGame.js';
import TopBar from '../components/TopBar.vue';
import IncomingSection from '../components/IncomingSection.vue';
import KanbanBoard from '../components/KanbanBoard.vue';
import StaffPool from '../components/StaffPool.vue';
import IncidentSlot from '../components/IncidentSlot.vue';
import HirePanel from '../components/HirePanel.vue';
import EventLog from '../components/EventLog.vue';
import MetricsPanel from '../components/MetricsPanel.vue';
import EndModal from '../components/EndModal.vue';
import AppIcon from '../components/AppIcon.vue';
import DirectionRoom from './DirectionRoom.vue';
import DeliveryRoom from './DeliveryRoom.vue';
import LiaisonRoom from './LiaisonRoom.vue';

const team = computed(() => state.team);
const sprint = computed(() => state.game?.sprint ?? 1);
const phase = computed(() => state.game?.phase ?? 'lobby');
const paused = computed(() => !!state.game?.paused && phase.value === 'running');
const subRole = computed(() => state.you?.subRole || 'solo');
const roleLabel = computed(() => ({
  direction: 'Direction', delivery: 'Delivery', liaison: 'Passerelle', solo: '',
}[subRole.value] || ''));

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
    <TopBar :subtitle="roleLabel ? `Équipe ${team.name} · ${roleLabel}` : `Équipe ${team.name}`">
      <button class="btn btn-secondary" @click="clearSession()">Quitter</button>
    </TopBar>

    <div v-if="phase === 'lobby'" class="net-banner ok">
      Connecté à la partie <strong>{{ state.code }}</strong> — en attente du démarrage par l'hôte.
    </div>

    <div v-if="paused" class="net-banner pause">
      <AppIcon name="frozen" /> <strong>Pause</strong> — l'animateur explique les changements.
      Le sprint {{ sprint }} reprendra quand l'hôte relancera le minuteur.
    </div>

    <div v-if="state.error" class="net-banner err" @click="dismissError">
      <AppIcon name="warn" /> {{ state.error }} <span class="dismiss">(cliquer pour masquer)</span>
    </div>

    <DirectionRoom v-if="subRole === 'direction'" :team="team" :sprint="sprint" />
    <DeliveryRoom v-else-if="subRole === 'delivery'" :team="team" :sprint="sprint" />
    <LiaisonRoom v-else-if="subRole === 'liaison'" :team="team" :sprint="sprint" />

    <template v-else>
      <IncomingSection :team="team" :sprint="sprint" />

      <main class="dashboard-grid">
        <KanbanBoard :team="team" :sprint="sprint" />

        <aside>
          <StaffPool :team="team" />
          <HirePanel :team="team" />
          <IncidentSlot :card="team.drawnCard" />
          <EventLog :log="team.log" />
          <MetricsPanel :team="team" />
        </aside>
      </main>
    </template>

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
