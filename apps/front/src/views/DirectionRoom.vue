<script setup>
import { computed } from 'vue';
import { netValue, RENEGOTIATE_MAX } from '@kanban-it/shared';
import { renegotiateDeadline } from '../net/useGame.js';
import ContractNegotiator from '../components/ContractNegotiator.vue';
import HirePanel from '../components/HirePanel.vue';
import EventLog from '../components/EventLog.vue';
import AppIcon from '../components/AppIcon.vue';

const props = defineProps({
  team: { type: Object, required: true },
  sprint: { type: Number, required: true },
});

function fmt(n) { return Number(n || 0).toLocaleString('fr-FR'); }

const net = computed(() => netValue(props.team));

const STAGE_LABEL = { analyse: 'Analyse', dev: 'Développement', test: 'Test', done: 'Production' };

// La Direction reçoit un suivi MACRO : stade + drapeaux + échéance + montants,
// sans avancement fin ni effectif.
const production = computed(() =>
  [...props.team.activeProjects].sort((a, b) => {
    if (a.stage === 'done' && b.stage !== 'done') return 1;
    if (b.stage === 'done' && a.stage !== 'done') return -1;
    return a.maxSprintDeadline - b.maxSprintDeadline;
  }),
);

function canRenegotiate(p) {
  return p.stage !== 'done' && (p.renegotiations || 0) < RENEGOTIATE_MAX;
}
</script>

<template>
  <div class="room room-direction">
    <p class="room-note">
      <AppIcon name="chart" />
      <span>
        Salle <strong>Direction</strong> — vous négociez les contrats et tenez le budget.
        Vous ne voyez ni l'avancement détaillé ni l'effectif : la salle
        <strong>Delivery</strong> exécute. Demandez-leur leur capacité avant de signer.
      </span>
    </p>

    <div class="dir-kpis">
      <div><span>CA livré</span><strong class="pos">{{ fmt(team.totalDeliveredValue) }} €</strong></div>
      <div><span>Pénalités</span><strong class="neg">− {{ fmt(team.totalPenalties) }} €</strong></div>
      <div><span>Recrutement</span><strong class="neg">− {{ fmt(team.totalHiringCost) }} €</strong></div>
      <div><span>CA net</span><strong>{{ fmt(net) }} €</strong></div>
      <div><span>Livrés</span><strong>{{ team.totalCompletedProjects }}</strong></div>
    </div>

    <main class="dir-grid">
      <section class="panel-box">
        <h3><AppIcon name="inbox" /> Appels d'offres</h3>
        <p class="dir-hint">
          Réglez délai et périmètre : chaque cran échange de la valeur contre du délai
          ou des ressources. Le contrat signé part en analyse.
        </p>
        <div class="dir-offers">
          <ContractNegotiator
            v-for="p in team.incomingProjects"
            :key="p.id"
            :project="p"
            :team="team"
            :sprint="sprint"
          />
          <p v-if="team.incomingProjects.length === 0" class="muted">
            Aucun appel d'offres en attente.
          </p>
        </div>
      </section>

      <aside class="dir-aside">
        <section class="panel-box">
          <h3><AppIcon name="clock" /> Suivi de production</h3>
          <ul class="prod-list">
            <li v-for="p in production" :key="p.id" :class="{ done: p.stage === 'done' }">
              <div class="prod-top">
                <span class="prod-name">{{ p.name }}</span>
                <span class="prod-value">
                  {{ fmt(p.value) }} €<span v-if="p.earned > 0 && p.stage !== 'done'" class="prod-earned">
                    encaissé {{ fmt(p.earned) }}</span>
                </span>
              </div>
              <div class="prod-tags">
                <span class="tag stage">{{ STAGE_LABEL[p.stage] || p.stage }}</span>
                <span v-if="p.stage !== 'done'" class="tag" :class="{ over: p.overdue }">
                  <AppIcon name="clock" /> Sprint {{ p.maxSprintDeadline }}
                </span>
                <span v-if="p.frozen" class="tag warn"><AppIcon name="frozen" /> figé</span>
                <span v-if="p.hasMaintenanceBug" class="tag warn"><AppIcon name="bug" /> bug prod</span>
                <span v-if="p.overdue" class="tag over"><AppIcon name="overdue" /> en retard</span>
                <span v-if="p.terms && (p.terms.delai !== 'standard' || p.terms.perimetre !== 'standard')" class="tag">
                  contrat {{ p.terms.delai }} / {{ p.terms.perimetre }}
                </span>
                <span v-if="p.renegotiations" class="tag">renégocié ×{{ p.renegotiations }}</span>
              </div>
              <button
                class="btn btn-secondary prod-reneg"
                :disabled="!canRenegotiate(p)"
                :title="`+1 sprint d'échéance contre -10 % de valeur (max ${RENEGOTIATE_MAX})`"
                @click="renegotiateDeadline(p.id)"
              >
                Renégocier le délai
              </button>
            </li>
            <li v-if="production.length === 0" class="muted">Aucun contrat en cours.</li>
          </ul>
        </section>

        <HirePanel :team="team" />
        <EventLog :log="team.log" />
      </aside>
    </main>
  </div>
</template>

<style scoped>
.room-note {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 10px 14px;
  margin: 0 0 8px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #9aa4b2);
  border-left: 3px solid var(--accent-purple, #7c3aed);
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-main, #1f2937);
}
.dir-kpis {
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  background: var(--border-light, #c7cdd6);
  border: 1px solid var(--border-color, #9aa4b2);
  margin-bottom: 8px;
}
.dir-kpis > div {
  flex: 1 1 120px;
  background: var(--bg-card, #fff);
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.dir-kpis span { color: var(--text-muted, #64748b); font-size: 12px; }
.dir-kpis strong { font-size: 15px; }
.dir-kpis .pos { color: var(--accent-green, #0f9d63); }
.dir-kpis .neg { color: var(--accent-red, #d13438); }
.dir-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 8px;
  align-items: start;
}
@media (max-width: 900px) { .dir-grid { grid-template-columns: 1fr; } }
.dir-hint, .dir-aside .muted { color: var(--text-muted, #64748b); font-size: 12px; }
.dir-offers { display: flex; flex-direction: column; gap: 8px; }
.dir-aside { display: flex; flex-direction: column; gap: 8px; }
.prod-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1px; }
.prod-list > li {
  border: 1px solid var(--border-light, #c7cdd6);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}
.prod-list > li.done { opacity: 0.7; }
.prod-top { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.prod-name { font-weight: 700; }
.prod-value { white-space: nowrap; }
.prod-earned { display: block; color: var(--text-muted, #64748b); font-size: 11px; text-align: right; }
.prod-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.tag {
  font-size: 11px;
  padding: 1px 6px;
  border: 1px solid var(--border-light, #c7cdd6);
  color: var(--text-muted, #64748b);
  background: var(--bg-dropzone, #f4f6f8);
}
.tag.stage { color: var(--text-main, #1f2937); font-weight: 600; }
.tag.warn { color: var(--accent-amber, #c47f00); border-color: currentColor; }
.tag.over { color: var(--accent-red, #d13438); border-color: currentColor; }
.prod-reneg { align-self: flex-start; padding: 3px 8px; font-size: 12px; }
</style>
