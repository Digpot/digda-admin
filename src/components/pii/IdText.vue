<script setup lang="ts">
import { LockClosedIcon } from "@heroicons/vue/24/outline";
import { maskId, requestAdminPassword } from "@/composables/usePasswordGate";

/**
 * 사용자 ID(UUID) 등 식별자를 `a1b2••••` 로만 보여 준다.
 * 누르면 관리자 비밀번호를 다시 확인한 뒤 팝업 안에서만 전체 값을 보여 준다.
 */
const props = defineProps<{
  id: string | number | null | undefined;
  label?: string;
}>();

function onClick() {
  if (props.id === null || props.id === undefined || props.id === "") return;
  const label = props.label ?? "사용자 ID";
  requestAdminPassword({ title: `${label} 보기`, reveal: { [label]: String(props.id) } });
}
</script>

<template>
  <button
    v-if="id !== null && id !== undefined && id !== ''"
    type="button"
    class="inline-flex items-center gap-1 rounded px-0.5 -mx-0.5 font-mono underline decoration-dotted decoration-ink-300 underline-offset-4 hover:bg-ink-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    title="눌러서 전체 보기 (관리자 비밀번호 확인)"
    @click.stop="onClick"
  >
    <span>{{ maskId(id) }}</span>
    <LockClosedIcon class="h-3 w-3 shrink-0 text-ink-300" aria-hidden="true" />
  </button>
  <span v-else>-</span>
</template>
