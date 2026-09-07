<script setup>
import { onMounted, computed } from 'vue';
import { state, initNet, netStatus } from './net/useGame.js';
import JoinView from './views/JoinView.vue';
import PlayView from './views/PlayView.vue';
import HostView from './views/HostView.vue';

onMounted(() => {
  initNet();
  // ?host dans l'URL => pre-selectionne l'onglet "Creer une partie"
});

const view = computed(() => state.mode);

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
    <PlayView v-else-if="view === 'play'" />
    <HostView v-else-if="view === 'host'" />
  </div>
</template>
