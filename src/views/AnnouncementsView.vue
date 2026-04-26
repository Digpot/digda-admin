<script setup lang="ts">
import { computed, ref } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import type { AnnouncementTarget } from "@/types/api";

const title = ref("");
const body = ref("");
const target = ref<AnnouncementTarget>("ALL");
const userIdsRaw = ref("");

const sending = ref(false);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const parsedUserIds = computed(() =>
  userIdsRaw.value
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
);

const canSend = computed(() => {
  if (!title.value.trim() || !body.value.trim()) return false;
  if (target.value === "USER_IDS" && parsedUserIds.value.length === 0) return false;
  return !sending.value;
});

async function send() {
  errorMessage.value = null;
  successMessage.value = null;

  if (!confirm(target.value === "ALL" ? "전체 사용자에게 공지를 발송하시겠습니까?" : `${parsedUserIds.value.length}명에게 공지를 발송하시겠습니까?`)) {
    return;
  }

  sending.value = true;
  try {
    const res = await adminApi.sendAnnouncement({
      title: title.value.trim(),
      body: body.value.trim(),
      target: target.value,
      userIds: target.value === "USER_IDS" ? parsedUserIds.value : undefined
    });
    successMessage.value = `${res.recipientCount}명에게 발송되었습니다.`;
    title.value = "";
    body.value = "";
    userIdsRaw.value = "";
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, "공지 발송에 실패했습니다.");
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="card p-6 space-y-4 max-w-3xl">
      <div>
        <label class="label">제목</label>
        <input
          v-model="title"
          class="input"
          placeholder="공지 제목 (최대 100자)"
          maxlength="100"
        />
      </div>

      <div>
        <label class="label">본문</label>
        <textarea
          v-model="body"
          class="input min-h-[160px]"
          placeholder="공지 본문 (최대 1000자)"
          maxlength="1000"
        ></textarea>
        <div class="text-xs text-ink-400 mt-1 text-right">{{ body.length }} / 1000</div>
      </div>

      <div>
        <label class="label">발송 대상</label>
        <div class="flex items-center gap-6 text-sm">
          <label class="flex items-center gap-2">
            <input v-model="target" type="radio" value="ALL" />
            <span>전체 사용자</span>
          </label>
          <label class="flex items-center gap-2">
            <input v-model="target" type="radio" value="USER_IDS" />
            <span>특정 유저 (UUID)</span>
          </label>
        </div>
      </div>

      <div v-if="target === 'USER_IDS'">
        <label class="label">유저 UUID 목록</label>
        <textarea
          v-model="userIdsRaw"
          class="input min-h-[100px] font-mono text-xs"
          placeholder="쉼표 또는 줄바꿈으로 구분 (예: a1b2c3d4-..., e5f6...)"
        ></textarea>
        <div class="text-xs text-ink-400 mt-1">{{ parsedUserIds.length }}명 지정됨</div>
      </div>

      <p v-if="errorMessage" class="text-sm text-rose-600">{{ errorMessage }}</p>
      <p v-if="successMessage" class="text-sm text-emerald-600">{{ successMessage }}</p>

      <div class="flex justify-end gap-2 pt-2 border-t border-ink-100">
        <button type="button" class="btn-primary" :disabled="!canSend" @click="send">
          {{ sending ? "발송 중..." : "공지 발송" }}
        </button>
      </div>
    </div>
  </div>
</template>
