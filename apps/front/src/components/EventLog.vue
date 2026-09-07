<script setup>
import AppIcon from './AppIcon.vue';

defineProps({
  log: { type: Array, default: () => [] },
});

const ICON = { bonus: 'check', malus: 'warn', system: 'info' };
</script>

<template>
  <div class="panel-box">
    <h3>Journal de bord</h3>
    <div class="event-log">
      <div v-for="(entry, i) in log" :key="i" class="log-entry" :class="entry.type">
        <AppIcon :name="ICON[entry.type] || 'info'" />
        <span>{{ entry.msg }}</span>
      </div>
      <div v-if="log.length === 0" class="log-entry system">
        <AppIcon name="info" /><span>En attente du démarrage…</span>
      </div>
    </div>
  </div>
</template>
