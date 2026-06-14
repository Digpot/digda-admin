<script setup lang="ts">
import { ref } from "vue";
import { publicApi } from "@/api/public";
import { extractErrorMessage } from "@/api/http";

type Tab = "account" | "data";
const tab = ref<Tab>("account");

// 계정 삭제 폼
const accountEmail = ref("");
const accountSubmitting = ref(false);
const accountDone = ref(false);
const accountError = ref<string | null>(null);

// 데이터 삭제 폼
const dataEmail = ref("");
const dataGroupRoom = ref("");
const dataContent = ref("");
const dataSubmitting = ref(false);
const dataDone = ref(false);
const dataError = ref<string | null>(null);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function switchTab(next: Tab) {
  tab.value = next;
}

async function submitAccount() {
  accountError.value = null;
  if (!EMAIL_RE.test(accountEmail.value.trim())) {
    accountError.value = "올바른 이메일을 입력해 주세요.";
    return;
  }
  accountSubmitting.value = true;
  try {
    await publicApi.requestAccountDeletion({ email: accountEmail.value.trim() });
    accountDone.value = true;
  } catch (err) {
    accountError.value = extractErrorMessage(err, "요청 접수에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  } finally {
    accountSubmitting.value = false;
  }
}

async function submitData() {
  dataError.value = null;
  if (!EMAIL_RE.test(dataEmail.value.trim())) {
    dataError.value = "올바른 이메일을 입력해 주세요.";
    return;
  }
  if (!dataGroupRoom.value.trim() || !dataContent.value.trim()) {
    dataError.value = "그룹방 이름과 삭제할 데이터를 입력해 주세요.";
    return;
  }
  dataSubmitting.value = true;
  try {
    await publicApi.requestDataDeletion({
      email: dataEmail.value.trim(),
      groupRoomName: dataGroupRoom.value.trim(),
      content: dataContent.value.trim()
    });
    dataDone.value = true;
  } catch (err) {
    dataError.value = extractErrorMessage(err, "요청 접수에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  } finally {
    dataSubmitting.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-ink-50 py-10 px-4">
    <div class="mx-auto max-w-xl space-y-5">
      <!-- 헤더 -->
      <div class="text-center space-y-1">
        <div class="flex items-center justify-center gap-2">
          <img src="/favicon.svg" alt="디그팟" class="h-9 w-9 rounded-xl" />
          <span class="text-xl font-bold text-ink-800">디그팟</span>
        </div>
        <h1 class="text-lg font-semibold text-ink-700 pt-2">계정 · 데이터 삭제 요청</h1>
        <p class="text-sm text-ink-500">앱: 디그팟 (DigPot) · 개발자: 태리팟</p>
      </div>

      <!-- 탭 -->
      <div class="flex gap-2 justify-center">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium rounded-lg border"
          :class="
            tab === 'account'
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-ink-200 text-ink-500 hover:bg-ink-100'
          "
          @click="switchTab('account')"
        >
          계정 삭제 요청
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium rounded-lg border"
          :class="
            tab === 'data'
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-ink-200 text-ink-500 hover:bg-ink-100'
          "
          @click="switchTab('data')"
        >
          데이터 삭제 요청
        </button>
      </div>

      <!-- 계정 삭제 -->
      <div v-if="tab === 'account'" class="card p-6 space-y-4">
        <div v-if="accountDone" class="text-center py-6 space-y-2">
          <div class="text-2xl">✅</div>
          <p class="font-semibold text-ink-800">계정 삭제 요청을 접수했어요</p>
          <p class="text-sm text-ink-500">
            가입 이메일로 본인 확인 후 처리됩니다. 처리 후 계정과 데이터는
            복구할 수 없습니다.
          </p>
        </div>
        <template v-else>
          <p class="text-sm text-ink-600 leading-relaxed">
            가입에 사용한 이메일을 입력하면 <b>계정 전체 삭제</b>를 요청합니다.
            본인 확인 후 처리되며, 처리 시 계정 정보와 작성한 일기·사진·일정 등
            모든 데이터가 영구 삭제됩니다.
          </p>
          <div>
            <label class="label">가입 이메일</label>
            <input
              v-model="accountEmail"
              type="email"
              class="input"
              placeholder="user@example.com"
              maxlength="255"
            />
          </div>
          <p v-if="accountError" class="text-sm text-rose-600">{{ accountError }}</p>
          <button
            type="button"
            class="btn-primary w-full"
            :disabled="accountSubmitting"
            @click="submitAccount"
          >
            {{ accountSubmitting ? "접수 중..." : "계정 삭제 요청 보내기" }}
          </button>
        </template>
      </div>

      <!-- 데이터 삭제 -->
      <div v-else class="card p-6 space-y-4">
        <div v-if="dataDone" class="text-center py-6 space-y-2">
          <div class="text-2xl">✅</div>
          <p class="font-semibold text-ink-800">데이터 삭제 요청을 접수했어요</p>
          <p class="text-sm text-ink-500">가입 이메일로 본인 확인 후 처리됩니다.</p>
        </div>
        <template v-else>
          <p class="text-sm text-ink-600 leading-relaxed">
            계정은 유지하고 <b>일부 데이터만</b> 삭제를 요청합니다. 어떤 그룹방의
            무슨 데이터를 삭제할지 적어 주세요.
          </p>
          <div>
            <label class="label">가입 이메일</label>
            <input
              v-model="dataEmail"
              type="email"
              class="input"
              placeholder="user@example.com"
              maxlength="255"
            />
          </div>
          <div>
            <label class="label">그룹방 이름</label>
            <input
              v-model="dataGroupRoom"
              class="input"
              placeholder="예) 우리 가족 다이어리"
              maxlength="255"
            />
          </div>
          <div>
            <label class="label">삭제할 데이터</label>
            <textarea
              v-model="dataContent"
              class="input min-h-[120px]"
              placeholder="예) 2026년 5월에 작성한 일기 전체를 삭제하고 싶어요"
              maxlength="2000"
            ></textarea>
          </div>
          <p v-if="dataError" class="text-sm text-rose-600">{{ dataError }}</p>
          <button
            type="button"
            class="btn-primary w-full"
            :disabled="dataSubmitting"
            @click="submitData"
          >
            {{ dataSubmitting ? "접수 중..." : "데이터 삭제 요청 보내기" }}
          </button>
        </template>
      </div>

      <!-- 삭제/보관 안내 (Google Play 정책 요건) -->
      <div class="card p-5 space-y-2 text-sm text-ink-600">
        <p class="font-semibold text-ink-800">삭제되는 데이터 / 보관되는 데이터</p>
        <p>
          요청 처리 시 계정 정보(이름·이메일·프로필 사진)와 작성한 일기·사진·댓글·일정·할
          일 등 사용자 생성 데이터는 복구 불가능한 방식으로 영구 삭제됩니다.
        </p>
        <p class="text-ink-500">
          단, 관련 법령에 따라 일부 기록은 일정 기간 보관됩니다 — 계약·청약철회 기록 5년,
          소비자 불만·분쟁 처리 기록 3년, 통신사실 확인자료 3개월.
        </p>
        <p class="text-ink-400 pt-1">문의: chltmdgh517@naver.com</p>
      </div>
    </div>
  </div>
</template>
