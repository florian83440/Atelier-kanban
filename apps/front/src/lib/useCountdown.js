import { ref, computed, onUnmounted } from 'vue';
import { state } from '../net/useGame.js';

// Compte a rebours base sur l'horloge serveur (sprintEndsAt + clockOffset).
export function useCountdown() {
  const now = ref(Date.now());
  const id = setInterval(() => { now.value = Date.now(); }, 500);
  onUnmounted(() => clearInterval(id));

  const secondsLeft = computed(() => {
    const endsAt = state.game?.sprintEndsAt;
    if (!endsAt) return null;
    const serverNow = now.value + state.clockOffset;
    return Math.max(0, Math.ceil((endsAt - serverNow) / 1000));
  });

  const label = computed(() => {
    const s = secondsLeft.value;
    if (s == null) return '--:--';
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  });

  const warning = computed(() => secondsLeft.value != null && secondsLeft.value <= 15);

  return { secondsLeft, label, warning };
}
