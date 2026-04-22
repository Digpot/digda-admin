<script setup lang="ts">
import type { Component } from "vue";

defineProps<{
  label: string;
  value: string;
  caption?: string;
  icon: Component;
  tone?: "indigo" | "rose" | "emerald" | "amber";
}>();
</script>

<template>
  <div class="card p-5">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wider text-ink-400">
          {{ label }}
        </p>
        <p class="mt-2 text-2xl font-semibold text-ink-800">{{ value }}</p>
        <p v-if="caption" class="mt-1 text-xs text-ink-400">{{ caption }}</p>
      </div>
      <div
        class="h-10 w-10 rounded-lg grid place-items-center"
        :class="{
          'bg-indigo-50 text-indigo-500': !tone || tone === 'indigo',
          'bg-rose-50 text-rose-500': tone === 'rose',
          'bg-emerald-50 text-emerald-500': tone === 'emerald',
          'bg-amber-50 text-amber-500': tone === 'amber'
        }"
      >
        <component :is="icon" class="h-5 w-5" />
      </div>
    </div>
  </div>
</template>
