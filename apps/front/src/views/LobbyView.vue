<script setup>
import { computed } from 'vue';
import { state, clearSession, hostStart } from '../net/useGame.js';
import GameRules from '../components/GameRules.vue';
import AppIcon from '../components/AppIcon.vue';

const isHost = computed(() => !!state.you?.isHost);
const code = computed(() => state.code || state.game?.code || '—');

// Cote hote : liste des equipes connectees (etat complet). Cote joueur : sa seule equipe.
const teams = computed(() => state.teams || []);
const totalPlayers = computed(() => teams.value.reduce((n, t) => n + (t.players?.length || 0), 0));
const canStart = computed(() => teams.value.length > 0);
</script>

<template>
  <div class="lobby">
    <header class="lobby-bar">
      <div class="lobby-brand"><AppIcon name="brand" /> KANBAN IT</div>
      <div class="lobby-code">
        Partie <strong>{{ code }}</strong>
        <template v-if="!isHost && state.team"> · Équipe <strong>{{ state.team.name }}</strong></template>
      </div>
      <button class="btn btn-secondary" @click="clearSession()">Quitter</button>
    </header>

    <GameRules />

    <!-- Pied de page : cote hote -->
    <footer v-if="isHost" class="lobby-foot">
      <div class="lobby-teams">
        <h3><AppIcon name="users" /> Équipes connectées ({{ teams.length }})</h3>
        <p v-if="teams.length === 0" class="muted">
          En attente de joueurs. Communiquez le code <strong>{{ code }}</strong> :
          chacun rejoint avec ce code et un nom d'équipe (même nom = board partagé).
        </p>
        <ul v-else class="lobby-team-list">
          <li v-for="t in teams" :key="t.id">
            <strong>{{ t.name }}</strong>
            <span class="muted"><AppIcon name="users" /> {{ t.players?.length || 0 }}</span>
          </li>
        </ul>
        <p v-if="teams.length" class="muted">{{ totalPlayers }} joueur(s) au total.</p>
      </div>

      <button
        class="btn btn-primary lobby-start"
        :disabled="!canStart"
        @click="hostStart()"
      >
        <AppIcon name="play" /> Démarrer la partie
      </button>
      <p v-if="!canStart" class="muted lobby-hint">Au moins une équipe doit avoir rejoint.</p>
    </footer>

    <!-- Pied de page : cote joueur -->
    <footer v-else class="lobby-foot lobby-foot--wait">
      <AppIcon name="clock" />
      <span>En attente du démarrage par l'hôte…</span>
    </footer>
  </div>
</template>
