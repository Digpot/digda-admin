<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  page: number;
  totalPages: number;
  totalElements: number;
}>();

const emit = defineEmits<{
  change: [page: number];
}>();

const canPrev = computed(() => props.page > 0);
const canNext = computed(() => props.page < props.totalPages - 1);

function go(p: number) {
  if (p < 0 || p >= props.totalPages) return;
  emit("change", p);
}
</script>

<template>
  <div class="flex items-center justify-between py-3 text-sm">
    <p class="text-ink-400">
      총 <span class="font-semibold text-ink-600">{{ totalElements.toLocaleString() }}</span
      >건 · {{ page + 1 }} / {{ Math.max(totalPages, 1) }} 페이지
    </p>
    <div class="flex items-center gap-1.5">
      <button class="btn-outline px-3 py-1.5" :disabled="!canPrev" @click="go(page - 1)">
        이전
      </button>
      <button class="btn-outline px-3 py-1.5" :disabled="!canNext" @click="go(page + 1)">
        다음
      </button>
    </div>
  </div>
</template>
