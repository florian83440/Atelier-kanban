<script setup>
import { onMounted, computed } from 'vue';
import { state, initNet, netStatus } from './net/useGame.js';
import JoinView from './views/JoinView.vue';
import LobbyView from './views/LobbyView.vue';
import PlayView from './views/PlayView.vue';
import HostView from './views/HostView.vue';

onMounted(() => {
  initNet();
  // ?host dans l'URL => pre-selectionne l'onglet "Creer une partie"
});

// join -> ecran de connexion ; sinon, tant que la partie n'a pas demarre
// (phase 'lobby'), tout le monde voit la page commune de regles.
const view = computed(() => {
  if (state.mode === 'join') return 'join';
  const phase = state.game?.phase ?? 'lobby';
  if (phase === 'lobby') return 'lobby';
  return state.mode; // 'play' | 'host'
});

const netMessage = computed(() => {
  if (netStatus.connected) return null;
  if (!netStatus.everConnected) return 'Connexion au serveur…';
  return 'Connexion perdue — tentative de reconnexion…';
});
</script>

<template>
  <div>
    <div v-if="netMessage" class="net-banner">{{ netMessage }}</div>
    <JoinView v-if="view === 'join'" />
    <LobbyView v-else-if="view === 'lobby'" />
    <PlayView v-else-if="view === 'play'" />
    <HostView v-else-if="view === 'host'" />
  </div>
</template>
