<script setup>
defineProps({
  card: { type: Object, default: null }, // { title, type, effect }
});
</script>

<template>
  <div class="panel-box">
    <h3>Incident RH / Événement</h3>
    <div class="event-slot">
      <div v-if="card" class="card-display" :class="card.type">
        <strong>{{ card.title }}</strong><br />{{ card.effect }}
      </div>
      <span v-else class="placeholder">Déclenchement automatique tous les 2 sprints.</span>
    </div>
  </div>
</template>
