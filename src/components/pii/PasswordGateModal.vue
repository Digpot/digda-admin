<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import Modal from "@/components/ui/Modal.vue";
import { extractErrorMessage } from "@/api/http";
import { finishPasswordGate, passwordGateState, verifyAdminPassword } from "@/composables/usePasswordGate";

const password = ref("");
const busy = ref(false);
const error = ref<string | null>(null);
const input = ref<HTMLInputElement | null>(null);

const revealEntries = computed(() => Object.entries(passwordGateState.reveal ?? {}));

watch(
  () => passwordGateState.open,
  async (open) => {
    password.value = "";
    error.value = null;
    busy.value = false;
    if (open) {
      await nextTick();
      input.value?.focus();
    }
  }
);

async function submit() {
  if (!password.value || busy.value) return;
  busy.value = true;
  error.value = null;
  try {
    await verifyAdminPassword(password.value);
    if (passwordGateState.reveal) {
      passwordGateState.revealed = true;
    } else {
      finishPasswordGate(true);
    }
  } catch (err) {
    error.value = extractErrorMessage(err, "비밀번호를 확인하지 못했습니다.");
  } finally {
    password.value = "";
    busy.value = false;
  }
}

async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    /* 클립보드 권한이 없으면 무시 — 화면에서 직접 선택 가능 */
  }
}
</script>

<template>
  <Modal :open="passwordGateState.open" :title="passwordGateState.title" @close="finishPasswordGate(passwordGateState.revealed)">
    <div class="space-y-4">
      <template v-if="!passwordGateState.revealed">
        <p class="text-sm text-ink-500">
          {{ passwordGateState.description || "민감한 정보입니다. 관리자 비밀번호를 다시 입력해 주세요." }}
          열람 기록이 남습니다.
        </p>
        <form class="space-y-3" @submit.prevent="submit">
          <div>
            <label class="label" for="gate-password">관리자 비밀번호</label>
            <input
              id="gate-password"
              ref="input"
              v-model="password"
              type="password"
              class="input"
              autocomplete="current-password"
              maxlength="100"
              required
            />
          </div>
          <p v-if="error" class="text-sm text-accent-strong" role="alert">{{ error }}</p>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-ghost" @click="finishPasswordGate(false)">취소</button>
            <button type="submit" class="btn-primary" :disabled="busy || !password">
              {{ busy ? "확인 중..." : "확인" }}
            </button>
          </div>
        </form>
      </template>

      <template v-else>
        <dl class="divide-y divide-ink-100 rounded-2xl border border-ink-100">
          <div v-for="[label, value] in revealEntries" :key="label" class="flex items-center gap-3 px-4 py-3">
            <dt class="w-20 shrink-0 text-xs font-semibold text-ink-400">{{ label }}</dt>
            <dd class="min-w-0 flex-1 break-all font-mono text-xs text-ink-800 select-all">{{ value }}</dd>
            <button type="button" class="btn-ghost px-2 py-1 text-xs" @click="copy(value)">복사</button>
          </div>
        </dl>
        <div class="flex justify-end">
          <button type="button" class="btn-primary" @click="finishPasswordGate(true)">닫기</button>
        </div>
      </template>
    </div>
  </Modal>
</template>
