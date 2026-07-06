<script setup lang="ts">
import type { Component } from "vue";

defineProps<{
  label: string;
  value: string;
  caption?: string;
  icon: Component;
  tone?: "coral" | "rose" | "emerald" | "amber" | "blue" | "violet";
}>();
</script>

<template>
  <div class="card p-5">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-xs font-semibold tracking-wide text-ink-500">
          {{ label }}
        </p>
        <p class="mt-2 text-2xl font-bold text-ink-800">{{ value }}</p>
        <p v-if="caption" class="mt-1 text-xs text-ink-400">{{ caption }}</p>
      </div>
      <div
        class="h-11 w-11 rounded-2xl grid place-items-center"
        :class="{
          'bg-accent/10 text-accent': !tone || tone === 'coral',
          'bg-rose-50 text-rose-500': tone === 'rose',
          'bg-emerald-50 text-emerald-500': tone === 'emerald',
          'bg-amber-50 text-amber-500': tone === 'amber',
          'bg-sky-50 text-sky-500': tone === 'blue',
          'bg-violet-50 text-violet-500': tone === 'violet'
        }"
      >
        <component :is="icon" class="h-5 w-5" />
      </div>
    </div>
  </div>
</template>
