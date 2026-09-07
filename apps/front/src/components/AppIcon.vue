<script setup>
import { computed } from 'vue';
import {
  Squares2X2Icon,
  ClockIcon,
  InboxArrowDownIcon,
  PencilSquareIcon,
  CommandLineIcon,
  BeakerIcon,
  NoSymbolIcon,
  LockClosedIcon,
  PauseCircleIcon,
  FireIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  MinusIcon,
  BoltIcon,
  PlayIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  UsersIcon,
  ChartBarIcon,
  CheckCircleIcon,
  WrenchScrewdriverIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/vue/20/solid';

// noms logiques -> composant heroicon (remplace les emojis du jeu)
const MAP = {
  brand: Squares2X2Icon,
  clock: ClockIcon,
  inbox: InboxArrowDownIcon,
  analyst: PencilSquareIcon,
  dev: CommandLineIcon,
  qa: BeakerIcon,
  blocked: NoSymbolIcon,
  locked: LockClosedIcon,
  frozen: PauseCircleIcon,
  bug: FireIcon,
  overdue: ExclamationTriangleIcon,
  warn: ExclamationTriangleIcon,
  plus: PlusIcon,
  minus: MinusIcon,
  bolt: BoltIcon,
  play: PlayIcon,
  arrowRight: ArrowRightIcon,
  back: ArrowPathIcon,
  reset: ArrowPathIcon,
  users: UsersIcon,
  chart: ChartBarIcon,
  check: CheckCircleIcon,
  wrench: WrenchScrewdriverIcon,
  info: InformationCircleIcon,
  close: XMarkIcon,
};

const props = defineProps({ name: { type: String, required: true } });
const cmp = computed(() => MAP[props.name] || InformationCircleIcon);
</script>

<template>
  <component :is="cmp" class="app-icon" aria-hidden="true" />
</template>
