<script setup>
import { ref, reactive } from 'vue';
import { state, createGame, joinGame } from '../net/useGame.js';
import AppIcon from '../components/AppIcon.vue';

const startTab = new URLSearchParams(location.search).has('host') ? 'host' : 'player';
const tab = ref(startTab);

const form = reactive({
  name: '',
  code: '',
  teamName: '',
});

function submit() {
  if (tab.value === 'host') {
    createGame(form.name || 'Hôte');
  } else {
    if (!form.code.trim() || !form.teamName.trim()) return;
    joinGame({ name: form.name || 'Joueur', code: form.code, teamName: form.teamName });
  }
}
</script>

<template>
  <div class="join-wrap">
    <h1><AppIcon name="brand" /> KANBAN IT</h1>
    <p class="sub">Simulation de flux — jeu multi-équipes</p>

    <div class="join-tabs">
      <button :class="{ active: tab === 'player' }" @click="tab = 'player'">Rejoindre</button>
      <button :class="{ active: tab === 'host' }" @click="tab = 'host'">Créer une partie</button>
    </div>

    <form @submit.prevent="submit">
      <div class="field">
        <label>Votre nom</label>
        <input v-model="form.name" :placeholder="tab === 'host' ? 'Hôte' : 'Joueur'" maxlength="24" />
      </div>

      <template v-if="tab === 'player'">
        <div class="field">
          <label>Code de la partie</label>
          <input v-model="form.code" placeholder="ABCD" maxlength="4" style="text-transform: uppercase" />
        </div>
        <div class="field">
          <label>Nom de l'équipe</label>
          <input v-model="form.teamName" placeholder="Équipe Rouge" maxlength="24" />
        </div>
      </template>

      <button class="btn btn-primary" type="submit" style="width: 100%; margin-top: 6px">
        {{ tab === 'host' ? 'Créer la partie' : 'Rejoindre' }}
      </button>
    </form>

    <p v-if="state.error" class="join-error">{{ state.error }}</p>
    <p v-if="tab === 'host'" class="sub" style="margin-top: 14px">
      Vous obtiendrez un code à communiquer aux joueurs. L'hôte anime la partie
      (démarrage, validation des sprints) et voit le tableau de bord de toutes les équipes.
    </p>
  </div>
</template>
