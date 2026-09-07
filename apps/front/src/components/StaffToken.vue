<script setup>
import AppIcon from './AppIcon.vue';

const props = defineProps({
  member: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  blockLeft: { type: Number, default: 0 }, // sprints de blocage restants
});
const emit = defineEmits(['activate']);

const blocked = () => props.member.disabled || props.member.isLocked;

function onClick() {
  if (blocked()) return;
  emit('activate', props.member.id);
}
</script>

<template>
  <div
    class="token"
    :class="[
      member.role,
      {
        locked: member.isLocked && !member.disabled,
        disabled: member.disabled,
        selected,
        clickable: !blocked(),
      },
    ]"
    :title="blocked() ? 'Indisponible' : 'Cliquer pour sélectionner / retirer'"
    @click="onClick"
  >
    <AppIcon :name="member.role" />
    <span>{{ member.label }}</span>
    <span v-if="member.disabled" class="token-flag">
      <AppIcon name="blocked" /><template v-if="blockLeft > 0"> {{ blockLeft }}&nbsp;spr.</template>
    </span>
    <AppIcon v-else-if="member.isLocked" name="locked" class="token-flag" />
  </div>
</template>
