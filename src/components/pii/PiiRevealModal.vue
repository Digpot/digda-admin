<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import axios from "axios";
import Modal from "@/components/ui/Modal.vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import { closePiiReveal, piiRevealState } from "@/composables/usePiiReveal";

/**
 * 개인정보 원문 열람 팝업. 관리자 비밀번호를 다시 확인한 뒤 서버에서 원문을 받아
 * 이 팝업 안에만 보여 준다. 닫으면 원문·비밀번호를 모두 지운다.
 * 열람 이력은 서버가 남긴다(user_action_log, PII_REVEAL).
 */
const FIELD_LABELS: Record<string, string> = {
  name: "이름",
  displayName: "표시 이름",
  email: "이메일",
  display_name: "표시 이름",
  social_id: "소셜 ID",
  phone: "전화번호"
};

const password = ref("");
const busy = ref(false);
const error = ref<string | null>(null);
const fields = ref<Record<string, string | null> | null>(null);
const passwordInput = ref<HTMLInputElement | null>(null);

const entries = computed(() =>
  Object.entries(fields.value ?? {}).map(([key, value]) => ({
    key,
    label: FIELD_LABELS[key] ?? key,
    value
  }))
);

function reset() {
  password.value = "";
  busy.value = false;
  error.value = null;
  fields.value = null;
}

watch(
  () => piiRevealState.open,
  async (open) => {
    reset();
    if (open) {
      await nextTick();
      passwordInput.value?.focus();
    }
  }
);

function close() {
  reset();
  closePiiReveal();
}

async function submit() {
  const target = piiRevealState.target;
  if (!target || !password.value || busy.value) return;
  busy.value = true;
  error.value = null;
  try {
    const res = await adminApi.revealPii({ ...target, password: password.value });
    fields.value = res.fields;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 429) {
      error.value = "비밀번호를 여러 번 틀려 10분간 잠겼습니다.";
    } else {
      error.value = extractErrorMessage(err, "원문을 불러오지 못했습니다.");
    }
  } finally {
    // 비밀번호는 성공·실패와 관계없이 바로 비운다.
    password.value = "";
    busy.value = false;
  }
}

async function copy(value: string | null) {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    /* 클립보드 권한이 없으면 조용히 무시 — 값은 화면에서 직접 선택할 수 있다 */
  }
}
</script>

<template>
  <Modal :open="piiRevealState.open" title="개인정보 원문 보기" @close="close">
    <div class="space-y-4">
      <p class="text-sm text-ink-500">
        <span v-if="piiRevealState.label" class="font-medium text-ink-700">{{ piiRevealState.label }}</span>
        <span v-if="piiRevealState.label"> · </span>
        원문은 관리자 비밀번호를 확인한 뒤 이 창에서만 보입니다. 열람 기록이 남습니다.
      </p>

      <form v-if="!fields" class="space-y-3" @submit.prevent="submit">
        <div>
          <label class="label" for="pii-password">관리자 비밀번호</label>
          <input
            id="pii-password"
            ref="passwordInput"
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
          <button type="button" class="btn-ghost" @click="close">취소</button>
          <button type="submit" class="btn-primary" :disabled="busy || !password">
            {{ busy ? "확인 중..." : "확인" }}
          </button>
        </div>
      </form>

      <template v-else>
        <dl class="divide-y divide-ink-100 rounded-2xl border border-ink-100">
          <div v-for="e in entries" :key="e.key" class="flex items-center gap-3 px-4 py-3">
            <dt class="w-20 shrink-0 text-xs font-semibold text-ink-400">{{ e.label }}</dt>
            <dd class="min-w-0 flex-1 break-all text-sm text-ink-800 select-all">{{ e.value ?? "-" }}</dd>
            <button
              v-if="e.value"
              type="button"
              class="btn-ghost px-2 py-1 text-xs"
              @click="copy(e.value)"
            >
              복사
            </button>
          </div>
          <p v-if="entries.length === 0" class="px-4 py-3 text-sm text-ink-400">표시할 개인정보가 없습니다.</p>
        </dl>
        <div class="flex justify-end">
          <button type="button" class="btn-primary" @click="close">닫기</button>
        </div>
      </template>
    </div>
  </Modal>
</template>
