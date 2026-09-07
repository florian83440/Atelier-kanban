<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import Chart from 'chart.js/auto';
import AppIcon from './AppIcon.vue';

const props = defineProps({
  title: { type: String, default: 'Bilan de fin de partie' },
  history: { type: Object, required: true }, // { labels, revenue, penalties, staffUsage }
});
const emit = defineEmits(['close']);

const canvas = ref(null);
let chart = null;

function render() {
  if (!canvas.value) return;
  if (chart) chart.destroy();
  const h = props.history || { labels: [], revenue: [], penalties: [], staffUsage: [] };
  chart = new Chart(canvas.value.getContext('2d'), {
    type: 'line',
    data: {
      labels: h.labels,
      datasets: [
        { label: 'CA livré (€)', data: h.revenue, borderColor: '#0f9d63', backgroundColor: 'rgba(15,157,99,0.12)', fill: true, yAxisID: 'y' },
        { label: 'Pénalités (€)', data: h.penalties, borderColor: '#d13438', backgroundColor: 'rgba(209,52,56,0.12)', fill: true, yAxisID: 'y' },
        { label: 'Ressources occupées', data: h.staffUsage, borderColor: '#0b74c4', borderDash: [4, 4], fill: false, yAxisID: 'y1' },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: { type: 'linear', position: 'left', grid: { color: '#e2e6ec' }, ticks: { color: '#64748b' } },
        y1: { type: 'linear', position: 'right', min: 0, max: 12, grid: { drawOnChartArea: false }, ticks: { color: '#64748b' } },
        x: { grid: { color: '#e2e6ec' }, ticks: { color: '#64748b' } },
      },
      plugins: { legend: { labels: { color: '#1f2937' } } },
    },
  });
}

onMounted(() => nextTick(render));
watch(() => props.history, () => nextTick(render), { deep: true });
onBeforeUnmount(() => { if (chart) chart.destroy(); });
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2><AppIcon name="chart" /> {{ title }}</h2>
        <button class="btn btn-secondary" @click="emit('close')">Fermer</button>
      </div>
      <canvas ref="canvas" height="170"></canvas>
    </div>
  </div>
</template>
