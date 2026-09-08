<script setup>
import { computed } from 'vue';
import { state } from '../net/useGame.js';
import { useCountdown } from '../lib/useCountdown.js';
import AppIcon from './AppIcon.vue';

defineProps({
  subtitle: { type: String, default: '' },
});

const { label, warning } = useCountdown();

const sprint = computed(() => state.game?.sprint ?? 1);
const total = computed(() => state.game?.totalSprints ?? 20);
const phase = computed(() => state.game?.phase ?? 'lobby');
const paused = computed(() => !!state.game?.paused && phase.value === 'running');
</script>

<template>
  <header class="topbar">
    <div class="topbar-brand">
      <AppIcon name="brand" /> KANBAN IT <small>| {{ subtitle }}</small>
    </div>

    <div class="topbar-center">
      <div class="sprint-badge">
        <template v-if="phase === 'lobby'">EN ATTENTE DE L'HÔTE</template>
        <template v-else-if="phase === 'finished'">PARTIE TERMINÉE</template>
        <template v-else>SPRINT <strong>{{ sprint }}</strong> / {{ total }}</template>
      </div>
      <div v-if="phase === 'running'" class="timer-badge" :class="{ warning: warning && !paused, paused }">
        <AppIcon :name="paused ? 'frozen' : 'clock'" /> <span>{{ paused ? 'PAUSE' : label }}</span>
      </div>
      <div class="sprint-badge">Partie <strong>{{ state.code }}</strong></div>
    </div>

    <div class="topbar-actions">
      <slot />
    </div>
  </header>
</template>
