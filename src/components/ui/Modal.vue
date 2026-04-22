<script setup lang="ts">
defineProps<{
  open: boolean;
  title?: string;
}>();

const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 grid place-items-center bg-ink-950/40 backdrop-blur-sm p-4"
      @click.self="emit('close')"
    >
      <div class="card w-full max-w-lg p-5">
        <div v-if="title" class="text-base font-semibold text-ink-700 mb-4">{{ title }}</div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
