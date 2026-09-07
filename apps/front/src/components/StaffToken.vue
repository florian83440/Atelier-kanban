<script setup>
import AppIcon from './AppIcon.vue';

const props = defineProps({
  member: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  blockLeft: { type: Number, default: 0 }, // sprints de blocage restants
});
const emit = defineEmits(['activate']);

function onClick() {
  if (props.member.disabled) return;
  emit('activate', props.member.id);
}
</script>

<template>
  <div
    class="token"
    :class="[
      member.role,
      {
        disabled: member.disabled,
        selected,
        clickable: !member.disabled,
      },
    ]"
    :title="member.disabled ? 'Indisponible' : 'Cliquer pour sélectionner / retirer'"
    @click="onClick"
  >
    <AppIcon :name="member.role" />
    <span>{{ member.label }}</span>
    <span v-if="member.disabled" class="token-flag">
      <AppIcon name="blocked" /><template v-if="blockLeft > 0"> {{ blockLeft }}&nbsp;spr.</template>
    </span>
  </div>
</template>
