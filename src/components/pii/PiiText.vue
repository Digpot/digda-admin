<script setup lang="ts">
import { computed } from "vue";
import { LockClosedIcon } from "@heroicons/vue/24/outline";
import { openPiiReveal } from "@/composables/usePiiReveal";
import type { PiiTarget } from "@/types/api";

/**
 * 서버가 마스킹해 내려준 개인정보(이름·이메일)를 보여 주는 칸.
 * 누르면 관리자 비밀번호 확인 팝업이 열리고, 원문은 그 팝업 안에서만 보인다.
 * 열람 대상을 특정할 수 없으면(target 없음) 그냥 마스킹 값만 보여 준다.
 */
const props = defineProps<{
  value: string | null | undefined;
  target?: PiiTarget | null;
  fallback?: string;
}>();

const text = computed(() => props.value || props.fallback || "-");
const revealable = computed(() => Boolean(props.value && props.target));

function onClick() {
  if (props.target) openPiiReveal(props.target, text.value);
}
</script>

<template>
  <button
    v-if="revealable"
    type="button"
    class="inline-flex items-center gap-1 rounded px-0.5 -mx-0.5 underline decoration-dotted decoration-ink-300 underline-offset-4 hover:bg-ink-100 hover:decoration-ink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    title="눌러서 원문 보기 (관리자 비밀번호 확인)"
    @click.stop="onClick"
  >
    <span>{{ text }}</span>
    <LockClosedIcon class="h-3 w-3 shrink-0 text-ink-300" aria-hidden="true" />
  </button>
  <span v-else>{{ text }}</span>
</template>
