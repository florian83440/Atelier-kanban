<script setup>
import { computed } from 'vue';
import { WIP_LIMITS, netValue } from '@kanban-it/shared';
import AppIcon from '../AppIcon.vue';

const props = defineProps({
  team: { type: Object, required: true }, // etat complet d'equipe
  sprint: { type: Number, default: 1 },
  rank: { type: Number, default: 0 }, // 1 = tete du classement
  phase: { type: String, default: 'lobby' },
});
const emit = defineEmits(['inspect']);

function fmt(n) { return n.toLocaleString('fr-FR'); }
function fmtProgress(n) { return Number.isInteger(n) ? String(n) : n.toFixed(1); }

const net = computed(() => netValue(props.team));

const STAGES = [
  { key: 'analyse', label: 'Analyse' },
  { key: 'dev', label: 'Dév' },
  { key: 'test', label: 'Test' },
  { key: 'done', label: 'Prod' },
];

function malusLeft(id) {
  const m = props.team.activeMalus.find((x) => x.staffId === id);
  return m ? m.duration : 0;
}

const columns = computed(() =>
  STAGES.map((s) => ({
    ...s,
    limit: WIP_LIMITS[s.key] ?? null,
    projects: props.team.activeProjects
      .filter((p) => p.stage === s.key)
      .map((p) => {
        const assigned = p.assigned
          .map((id) => props.team.staff.find((m) => m.id === id))
          .filter(Boolean);
        const target = p.stage === 'dev' ? p.dur.dev : p.stage === 'test' ? p.dur.test : p.dur.analyse;
        return {
          id: p.id,
          name: p.name,
          type: p.type,
          value: p.value,
          progress: p.progress,
          target,
          overdue: p.stage !== 'done' && props.sprint > p.maxSprintDeadline,
          deadline: p.maxSprintDeadline,
          bug: p.hasMaintenanceBug,
          frozen: assigned.some((m) => m.disabled),
          frozenLeft: Math.max(0, ...assigned.filter((m) => m.disabled).map((m) => malusLeft(m.id))),
          needRole: p.stage === 'dev' ? 'dev' : p.stage === 'test' ? 'qa' : p.stage === 'analyse' ? 'analyst' : null,
          needCount: p.stage === 'dev' ? p.req.dev : p.stage === 'test' ? p.req.qa : p.stage === 'analyse' ? p.req.analyst : 0,
          have: assigned.length,
        };
      }),
  })),
);

const assignedIds = computed(() => new Set(props.team.activeProjects.flatMap((p) => p.assigned)));
const staffing = computed(() => {
  const free = [];
  const busy = [];
  const blocked = [];
  for (const m of props.team.staff) {
    if (m.disabled) blocked.push({ ...m, left: malusLeft(m.id) });
    else if (assignedIds.value.has(m.id)) busy.push(m);
    else free.push(m);
  }
  return { free, busy, blocked };
});

const roleTally = computed(() => {
  const t = { analyst: [0, 0], dev: [0, 0], qa: [0, 0] }; // [dispo, total]
  for (const m of props.team.staff) {
    if (!t[m.role]) continue;
    t[m.role][1]++;
    if (!m.disabled) t[m.role][0]++;
  }
  return t;
});

const lastLog = computed(() => props.team.log[0] || null);
</script>

<template>
  <div class="team-board" :class="{ leader: rank === 1 && phase !== 'lobby' }">
    <header class="tb-head">
      <span v-if="rank" class="tb-rank">#{{ rank }}</span>
      <span class="tb-name">{{ team.name }}</span>
      <span class="tb-players"><AppIcon name="users" /> {{ team.players.length }}</span>
    </header>

    <div class="tb-kpis">
      <div class="tb-kpi net" :class="net >= 0 ? 'pos' : 'neg'">
        <span>Net</span><strong>{{ fmt(net) }} €</strong>
      </div>
      <div class="tb-kpi">
        <span>CA livré</span><strong>{{ fmt(team.totalDeliveredValue) }} €</strong>
      </div>
      <div class="tb-kpi">
        <span>Pénalités</span><strong class="neg">- {{ fmt(team.totalPenalties) }} €</strong>
      </div>
      <div v-if="team.totalHiringCost" class="tb-kpi">
        <span>Recrutement</span><strong class="neg">- {{ fmt(team.totalHiringCost) }} €</strong>
      </div>
      <div class="tb-kpi">
        <span>Projets livrés</span><strong>{{ team.totalCompletedProjects }}</strong>
      </div>
    </div>

    <div class="tb-kanban">
      <div v-for="c in columns" :key="c.key" class="tb-col">
        <div class="tb-col-head">
          {{ c.label }}
          <span class="tb-col-count">{{ c.projects.length }}<template v-if="c.limit">/{{ c.limit }}</template></span>
        </div>
        <div v-if="c.projects.length === 0" class="tb-col-empty">—</div>
        <div
          v-for="p in c.projects"
          :key="p.id"
          class="tb-proj"
          :class="{ overdue: p.overdue, frozen: p.frozen, bug: p.bug }"
        >
          <div class="tb-proj-name">
            <span>{{ p.name }}</span>
            <span class="tb-proj-flags">
              <AppIcon v-if="p.bug" name="bug" />
              <span v-if="p.frozen" class="tb-flag-frozen"><AppIcon name="frozen" />{{ p.frozenLeft > 0 ? p.frozenLeft : '' }}</span>
              <AppIcon v-if="p.overdue" name="overdue" />
            </span>
          </div>
          <div v-if="c.key !== 'done'" class="tb-proj-meta">
            <div class="tb-bar"><div class="tb-bar-fill" :style="{ width: Math.min(100, (p.progress / p.target) * 100) + '%' }"></div></div>
            <span class="tb-proj-nums">
              {{ fmtProgress(p.progress) }}/{{ p.target }} · éch. S{{ p.deadline }} ·
              {{ p.have }}/{{ p.needCount }}<AppIcon v-if="p.needRole" :name="p.needRole" />
            </span>
          </div>
          <div v-else class="tb-proj-meta done">
            <AppIcon name="check" /> {{ fmt(p.value) }} €<template v-if="p.bug"> · maintenance requise</template>
          </div>
        </div>
      </div>
    </div>

    <div class="tb-staff">
      <span class="tb-staff-grp ok"><AppIcon name="check" /> {{ staffing.free.length }} dispo</span>
      <span class="tb-staff-grp busy"><AppIcon name="wrench" /> {{ staffing.busy.length }} affecté(s)</span>
      <span class="tb-staff-grp blk" :class="{ zero: staffing.blocked.length === 0 }">
        <AppIcon name="blocked" /> {{ staffing.blocked.length }} bloqué(s)
      </span>
      <span class="tb-roles">
        <AppIcon name="analyst" />{{ roleTally.analyst[0] }}/{{ roleTally.analyst[1] }}
        <AppIcon name="dev" />{{ roleTally.dev[0] }}/{{ roleTally.dev[1] }}
        <AppIcon name="qa" />{{ roleTally.qa[0] }}/{{ roleTally.qa[1] }}
      </span>
    </div>

    <div v-if="staffing.blocked.length" class="tb-blocked-list">
      <span v-for="m in staffing.blocked" :key="m.id" class="tb-blocked-chip">
        <AppIcon name="blocked" /> {{ m.label }} · {{ m.left }} spr.
      </span>
    </div>

    <div v-if="team.drawnCard" class="tb-incident" :class="team.drawnCard.type">
      <AppIcon name="bolt" />
      <span><strong>{{ team.drawnCard.title }}</strong> — {{ team.drawnCard.effect }}</span>
    </div>

    <div v-if="lastLog" class="tb-lastlog" :class="lastLog.type">
      <AppIcon :name="lastLog.type === 'bonus' ? 'check' : lastLog.type === 'malus' ? 'warn' : 'info'" />
      <span>{{ lastLog.msg }}</span>
    </div>

    <button class="btn-xs tb-detail" @click="emit('inspect', team.id)">
      <AppIcon name="chart" /> Courbe de progression
    </button>
  </div>
</template>
