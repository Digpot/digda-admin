<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { adminApi } from "@/api/admin";
import { extractErrorMessage } from "@/api/http";
import type {
  AdminFeedbackQuestion,
  AdminFeedbackSubmission,
  FeedbackQuestionItem,
  FeedbackQuestionType
} from "@/types/api";

type Tab = "questions" | "submissions" | "stats";
const tab = ref<Tab>("questions");

const TYPE_OPTIONS: { value: FeedbackQuestionType; label: string }[] = [
  { value: "SECTION", label: "섹션 제목" },
  { value: "SHORT_TEXT", label: "단답형" },
  { value: "PARAGRAPH", label: "장문형" },
  { value: "SINGLE_CHOICE", label: "객관식(단일)" },
  { value: "SCALE", label: "척도" },
  { value: "GRID", label: "그리드(행×열)" }
];

interface EditableQuestion {
  type: FeedbackQuestionType;
  title: string;
  description: string;
  required: boolean;
  active: boolean;
  choicesText: string;
  scaleMin: number;
  scaleMax: number;
  gridRowsText: string;
  gridColsText: string;
}

// ── 문항 편집 ──
const questions = ref<EditableQuestion[]>([]);
const loadingQ = ref(false);
const savingQ = ref(false);
const errorQ = ref<string | null>(null);
const savedAt = ref<string | null>(null);

function toEditable(q: AdminFeedbackQuestion): EditableQuestion {
  const e: EditableQuestion = {
    type: q.type,
    title: q.title,
    description: q.description ?? "",
    required: q.required,
    active: q.active,
    choicesText: "",
    scaleMin: 1,
    scaleMax: 5,
    gridRowsText: "",
    gridColsText: ""
  };
  if (q.options) {
    try {
      const o = JSON.parse(q.options);
      if (q.type === "SINGLE_CHOICE" && Array.isArray(o)) {
        e.choicesText = o.join("\n");
      } else if (q.type === "SCALE" && o && typeof o === "object") {
        e.scaleMin = Number(o.min ?? 1);
        e.scaleMax = Number(o.max ?? 5);
      } else if (q.type === "GRID" && o && typeof o === "object") {
        e.gridRowsText = (o.rows ?? []).join("\n");
        e.gridColsText = (o.cols ?? []).join("\n");
      }
    } catch {
      /* 무시 — 기본값 사용 */
    }
  }
  return e;
}

function toItem(e: EditableQuestion): FeedbackQuestionItem {
  let options: string | null = null;
  if (e.type === "SINGLE_CHOICE") {
    const arr = e.choicesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    options = JSON.stringify(arr);
  } else if (e.type === "SCALE") {
    options = JSON.stringify({ min: Number(e.scaleMin), max: Number(e.scaleMax) });
  } else if (e.type === "GRID") {
    const rows = e.gridRowsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const cols = e.gridColsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    options = JSON.stringify({ rows, cols });
  }
  return {
    type: e.type,
    title: e.title.trim(),
    description: e.description.trim() || null,
    required: e.required,
    options,
    active: e.active
  };
}

async function loadQuestions() {
  loadingQ.value = true;
  errorQ.value = null;
  try {
    const list = await adminApi.getFeedbackQuestions();
    questions.value = list.map(toEditable);
  } catch (err) {
    errorQ.value = extractErrorMessage(err, "문항을 불러오지 못했습니다.");
  } finally {
    loadingQ.value = false;
  }
}

function addQuestion() {
  questions.value.push({
    type: "SHORT_TEXT",
    title: "",
    description: "",
    required: false,
    active: true,
    choicesText: "",
    scaleMin: 1,
    scaleMax: 5,
    gridRowsText: "",
    gridColsText: ""
  });
}

function removeQuestion(i: number) {
  questions.value.splice(i, 1);
}

function move(i: number, dir: -1 | 1) {
  const j = i + dir;
  if (j < 0 || j >= questions.value.length) return;
  const arr = questions.value;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

async function saveQuestions() {
  savingQ.value = true;
  errorQ.value = null;
  try {
    const invalid = questions.value.find((q) => !q.title.trim());
    if (invalid) {
      errorQ.value = "제목이 빈 문항이 있습니다.";
      return;
    }
    const saved = await adminApi.saveFeedbackQuestions(questions.value.map(toItem));
    questions.value = saved.map(toEditable);
    savedAt.value = new Date().toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul" });
  } catch (err) {
    errorQ.value = extractErrorMessage(err, "저장에 실패했습니다.");
  } finally {
    savingQ.value = false;
  }
}

// ── 응답 목록 ──
const submissions = ref<AdminFeedbackSubmission[]>([]);
const loadingS = ref(false);
const errorS = ref<string | null>(null);
const page = ref(0);
const totalPages = ref(0);
const totalElements = ref(0);

async function loadSubmissions() {
  loadingS.value = true;
  errorS.value = null;
  try {
    const res = await adminApi.searchFeedbackSubmissions({ page: page.value, size: 20 });
    submissions.value = res.content;
    totalPages.value = res.totalPages;
    totalElements.value = res.totalElements;
  } catch (err) {
    errorS.value = extractErrorMessage(err, "응답을 불러오지 못했습니다.");
  } finally {
    loadingS.value = false;
  }
}

function changePage(next: number) {
  if (next < 0 || (totalPages.value > 0 && next >= totalPages.value)) return;
  page.value = next;
  loadSubmissions();
}

// ── 요약(통계) ──
const statsLoading = ref(false);
const statsError = ref<string | null>(null);
const statsQuestions = ref<AdminFeedbackQuestion[]>([]);
const statsSubmissions = ref<AdminFeedbackSubmission[]>([]);

/** 통계 집계를 위해 전체 응답을 페이지네이션으로 모두 가져온다(안전 상한 5000건). */
async function fetchAllSubmissions(): Promise<AdminFeedbackSubmission[]> {
  const all: AdminFeedbackSubmission[] = [];
  const size = 100;
  for (let p = 0; p < 50; p++) {
    const res = await adminApi.searchFeedbackSubmissions({ page: p, size });
    all.push(...res.content);
    if (res.content.length === 0 || p >= res.totalPages - 1) break;
  }
  return all;
}

async function loadStats() {
  statsLoading.value = true;
  statsError.value = null;
  try {
    const [qs, subs] = await Promise.all([
      adminApi.getFeedbackQuestions(),
      fetchAllSubmissions()
    ]);
    statsQuestions.value = qs;
    statsSubmissions.value = subs;
  } catch (err) {
    statsError.value = extractErrorMessage(err, "통계를 불러오지 못했습니다.");
  } finally {
    statsLoading.value = false;
  }
}

interface Bar {
  label: string;
  count: number;
  pct: number;
}
interface QuestionStat {
  id: number;
  type: FeedbackQuestionType;
  title: string;
  responseCount: number;
  bars: Bar[];
  average: number | null;
  gridRows: { row: string; bars: Bar[] }[];
  texts: string[];
}

function toBars(entries: { label: string; count: number }[], total: number): Bar[] {
  return entries.map((e) => ({
    ...e,
    pct: total > 0 ? Math.round((e.count / total) * 100) : 0
  }));
}

const totalStatResponses = computed(() => statsSubmissions.value.length);

const statResults = computed<QuestionStat[]>(() => {
  // questionId(우선)·title(폴백) 별로 응답 문자열을 모은다.
  const byId = new Map<number, string[]>();
  const byTitle = new Map<string, string[]>();
  for (const s of statsSubmissions.value) {
    for (const a of s.answers) {
      const ans = (a.answer ?? "").trim();
      if (!ans) continue;
      if (a.questionId != null) {
        if (!byId.has(a.questionId)) byId.set(a.questionId, []);
        byId.get(a.questionId)!.push(ans);
      }
      if (a.title) {
        if (!byTitle.has(a.title)) byTitle.set(a.title, []);
        byTitle.get(a.title)!.push(ans);
      }
    }
  }

  const results: QuestionStat[] = [];
  for (const q of statsQuestions.value) {
    if (!q.active) continue;
    const answers = byId.get(q.id) ?? byTitle.get(q.title) ?? [];
    const stat: QuestionStat = {
      id: q.id,
      type: q.type,
      title: q.title,
      responseCount: answers.length,
      bars: [],
      average: null,
      gridRows: [],
      texts: []
    };
    let opts: any = null;
    if (q.options) {
      try {
        opts = JSON.parse(q.options);
      } catch {
        opts = null;
      }
    }

    if (q.type === "SECTION") {
      results.push(stat);
    } else if (q.type === "SINGLE_CHOICE") {
      const options: string[] = Array.isArray(opts) ? opts.map(String) : [];
      const counts = new Map<string, number>();
      options.forEach((o) => counts.set(o, 0));
      let other = 0;
      for (const a of answers) {
        if (counts.has(a)) counts.set(a, counts.get(a)! + 1);
        else other += 1;
      }
      const entries = options.map((o) => ({ label: o, count: counts.get(o)! }));
      if (other > 0) entries.push({ label: "기타", count: other });
      stat.bars = toBars(entries, answers.length);
      results.push(stat);
    } else if (q.type === "SCALE") {
      const min = Number(opts?.min ?? 1);
      const max = Number(opts?.max ?? 5);
      const counts = new Map<number, number>();
      for (let v = min; v <= max; v++) counts.set(v, 0);
      let sum = 0;
      let n = 0;
      for (const a of answers) {
        const v = Number(a);
        if (!Number.isNaN(v)) {
          if (counts.has(v)) counts.set(v, counts.get(v)! + 1);
          sum += v;
          n += 1;
        }
      }
      const entries: { label: string; count: number }[] = [];
      for (let v = min; v <= max; v++) entries.push({ label: String(v), count: counts.get(v) ?? 0 });
      stat.bars = toBars(entries, answers.length);
      stat.average = n > 0 ? Math.round((sum / n) * 100) / 100 : null;
      results.push(stat);
    } else if (q.type === "GRID") {
      const rows: string[] = Array.isArray(opts?.rows) ? opts.rows.map(String) : [];
      const cols: string[] = Array.isArray(opts?.cols) ? opts.cols.map(String) : [];
      const rowCounts = new Map<string, Map<string, number>>();
      for (const r of rows) {
        const m = new Map<string, number>();
        cols.forEach((c) => m.set(c, 0));
        rowCounts.set(r, m);
      }
      // 응답 문자열 "행: 열, 행: 열" 을 파싱.
      for (const a of answers) {
        for (const seg of a.split(", ")) {
          const idx = seg.indexOf(": ");
          if (idx < 0) continue;
          const r = seg.slice(0, idx).trim();
          const c = seg.slice(idx + 2).trim();
          const m = rowCounts.get(r);
          if (m && m.has(c)) m.set(c, m.get(c)! + 1);
        }
      }
      stat.gridRows = rows.map((r) => {
        const m = rowCounts.get(r)!;
        const rowTotal = Array.from(m.values()).reduce((x, y) => x + y, 0);
        return { row: r, bars: toBars(cols.map((c) => ({ label: c, count: m.get(c)! })), rowTotal) };
      });
      results.push(stat);
    } else {
      stat.texts = answers;
      results.push(stat);
    }
  }
  return results;
});

function switchTab(t: Tab) {
  tab.value = t;
  if (t === "submissions" && submissions.value.length === 0) loadSubmissions();
  if (t === "stats" && statsQuestions.value.length === 0) loadStats();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

const questionCount = computed(() => questions.value.length);

onMounted(loadQuestions);
</script>

<template>
  <div class="space-y-4">
    <!-- 탭 -->
    <div class="flex gap-2">
      <button
        class="px-4 py-2 rounded-lg text-sm font-medium"
        :class="tab === 'questions' ? 'bg-accent text-white' : 'bg-ink-100 text-ink-600'"
        @click="switchTab('questions')"
      >
        문항 편집
      </button>
      <button
        class="px-4 py-2 rounded-lg text-sm font-medium"
        :class="tab === 'submissions' ? 'bg-accent text-white' : 'bg-ink-100 text-ink-600'"
        @click="switchTab('submissions')"
      >
        응답 목록
      </button>
      <button
        class="px-4 py-2 rounded-lg text-sm font-medium"
        :class="tab === 'stats' ? 'bg-accent text-white' : 'bg-ink-100 text-ink-600'"
        @click="switchTab('stats')"
      >
        요약(통계)
      </button>
    </div>

    <!-- ── 문항 편집 ── -->
    <div v-if="tab === 'questions'" class="space-y-4 max-w-3xl">
      <p v-if="errorQ" class="text-sm text-rose-600">{{ errorQ }}</p>
      <p class="text-xs text-ink-400">
        앱 "피드백 받기" 화면에 표시될 문항입니다. 저장하면 보낸 목록으로 전체가 교체됩니다.
        (이미 제출된 응답은 제출 당시 문항으로 보존됩니다.)
      </p>

      <div v-if="loadingQ" class="text-sm text-ink-400">불러오는 중...</div>

      <div
        v-for="(q, i) in questions"
        :key="i"
        class="card p-4 space-y-3"
        :class="q.active ? '' : 'opacity-60'"
      >
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono text-ink-400 w-6">{{ i + 1 }}</span>
          <select v-model="q.type" class="input !w-40">
            <option v-for="t in TYPE_OPTIONS" :key="t.value" :value="t.value">
              {{ t.label }}
            </option>
          </select>
          <div class="flex-1"></div>
          <button class="text-ink-400 hover:text-ink-700 px-1" title="위로" @click="move(i, -1)">
            ↑
          </button>
          <button class="text-ink-400 hover:text-ink-700 px-1" title="아래로" @click="move(i, 1)">
            ↓
          </button>
          <button class="text-rose-500 hover:text-rose-700 px-1 text-sm" @click="removeQuestion(i)">
            삭제
          </button>
        </div>

        <input
          v-model="q.title"
          class="input"
          :placeholder="q.type === 'SECTION' ? '섹션 제목' : '질문 제목'"
        />
        <input v-model="q.description" class="input" placeholder="설명 (선택)" />

        <!-- 유형별 옵션 -->
        <div v-if="q.type === 'SINGLE_CHOICE'">
          <label class="label">선택지 (한 줄에 하나)</label>
          <textarea v-model="q.choicesText" class="input !h-auto py-2" rows="4" placeholder="매일&#10;가끔&#10;거의 안 씀"></textarea>
        </div>
        <div v-else-if="q.type === 'SCALE'" class="flex gap-3 items-end">
          <div>
            <label class="label">최소</label>
            <input v-model.number="q.scaleMin" type="number" class="input !w-24" />
          </div>
          <div>
            <label class="label">최대</label>
            <input v-model.number="q.scaleMax" type="number" class="input !w-24" />
          </div>
        </div>
        <div v-else-if="q.type === 'GRID'" class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">행 (한 줄에 하나)</label>
            <textarea v-model="q.gridRowsText" class="input !h-auto py-2" rows="4" placeholder="그림 일기&#10;일정·캘린더"></textarea>
          </div>
          <div>
            <label class="label">열 (한 줄에 하나)</label>
            <textarea v-model="q.gridColsText" class="input !h-auto py-2" rows="4" placeholder="만족&#10;보통&#10;불만족"></textarea>
          </div>
        </div>

        <div v-if="q.type !== 'SECTION'" class="flex items-center gap-4 text-sm text-ink-600">
          <label class="flex items-center gap-1.5">
            <input v-model="q.required" type="checkbox" class="h-4 w-4 rounded" /> 필수
          </label>
          <label class="flex items-center gap-1.5">
            <input v-model="q.active" type="checkbox" class="h-4 w-4 rounded" /> 노출
          </label>
        </div>
        <div v-else class="flex items-center gap-4 text-sm text-ink-600">
          <label class="flex items-center gap-1.5">
            <input v-model="q.active" type="checkbox" class="h-4 w-4 rounded" /> 노출
          </label>
        </div>
      </div>

      <button class="btn-outline w-full" @click="addQuestion">+ 문항 추가</button>

      <div class="flex items-center gap-3 sticky bottom-0 bg-white/80 py-2">
        <button class="btn-primary" :disabled="savingQ || loadingQ" @click="saveQuestions">
          {{ savingQ ? "저장 중..." : `저장 (${questionCount}개 문항)` }}
        </button>
        <span v-if="savedAt" class="text-xs text-emerald-600">저장됨 · {{ savedAt }}</span>
      </div>
    </div>

    <!-- ── 응답 목록 ── -->
    <div v-else-if="tab === 'submissions'" class="space-y-4 max-w-3xl">
      <p v-if="errorS" class="text-sm text-rose-600">{{ errorS }}</p>
      <p class="text-xs text-ink-400">총 {{ totalElements }}건</p>

      <div v-if="loadingS" class="text-sm text-ink-400">불러오는 중...</div>
      <div v-else-if="submissions.length === 0" class="text-sm text-ink-400">
        아직 제출된 피드백이 없습니다.
      </div>

      <div v-for="s in submissions" :key="s.submissionId" class="card p-4 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-ink-800">
            {{ s.userName ?? "(알 수 없음)" }}
          </span>
          <span class="text-xs text-ink-400">{{ formatDate(s.createdAt) }}</span>
        </div>
        <div class="space-y-2">
          <div v-for="(a, idx) in s.answers" :key="idx" class="text-sm">
            <p class="text-xs font-medium text-ink-500">{{ a.title }}</p>
            <p class="text-ink-800 whitespace-pre-wrap">{{ a.answer }}</p>
          </div>
        </div>
      </div>

      <div v-if="totalPages > 1" class="flex items-center justify-center gap-3 pt-2">
        <button class="btn-outline" :disabled="page <= 0" @click="changePage(page - 1)">
          이전
        </button>
        <span class="text-sm text-ink-500">{{ page + 1 }} / {{ totalPages }}</span>
        <button
          class="btn-outline"
          :disabled="page >= totalPages - 1"
          @click="changePage(page + 1)"
        >
          다음
        </button>
      </div>
    </div>

    <!-- ── 요약(통계) ── -->
    <div v-else class="space-y-4 max-w-3xl">
      <div class="flex items-center justify-between">
        <p class="text-xs text-ink-400">응답 {{ totalStatResponses }}건 기준</p>
        <button class="btn-outline !py-1 !px-3 text-xs" :disabled="statsLoading" @click="loadStats">
          새로고침
        </button>
      </div>
      <p v-if="statsError" class="text-sm text-rose-600">{{ statsError }}</p>

      <div v-if="statsLoading" class="text-sm text-ink-400">불러오는 중...</div>
      <div v-else-if="totalStatResponses === 0" class="text-sm text-ink-400">
        아직 제출된 피드백이 없습니다.
      </div>

      <template v-else>
        <template v-for="st in statResults" :key="st.id">
          <!-- 섹션 헤더 -->
          <h3 v-if="st.type === 'SECTION'" class="text-base font-semibold text-ink-800 pt-3">
            {{ st.title }}
          </h3>

          <!-- 문항 카드 -->
          <div v-else class="card p-4 space-y-3">
            <div class="flex items-start justify-between gap-3">
              <p class="font-medium text-ink-800 text-sm">{{ st.title }}</p>
              <span class="shrink-0 text-xs text-ink-400">{{ st.responseCount }}개 응답</span>
            </div>
            <p v-if="st.average !== null" class="text-xs font-semibold text-accent">
              평균 {{ st.average }}
            </p>

            <!-- 주관식 -->
            <div v-if="st.type === 'SHORT_TEXT' || st.type === 'PARAGRAPH'" class="space-y-1.5">
              <p v-if="st.texts.length === 0" class="text-xs text-ink-300">응답 없음</p>
              <p
                v-for="(t, i) in st.texts"
                :key="i"
                class="text-sm text-ink-700 bg-ink-50 rounded-lg px-3 py-2 whitespace-pre-wrap"
              >
                {{ t }}
              </p>
            </div>

            <!-- 그리드 -->
            <div v-else-if="st.type === 'GRID'" class="space-y-3">
              <div v-for="gr in st.gridRows" :key="gr.row">
                <p class="text-xs font-medium text-ink-600 mb-1.5">{{ gr.row }}</p>
                <div class="space-y-1.5">
                  <div v-for="b in gr.bars" :key="b.label" class="flex items-center gap-2">
                    <span class="w-16 shrink-0 truncate text-xs text-ink-600" :title="b.label">
                      {{ b.label }}
                    </span>
                    <div class="flex-1 h-5 rounded bg-ink-100 overflow-hidden">
                      <div class="h-full rounded bg-accent/80" :style="{ width: b.pct + '%' }"></div>
                    </div>
                    <span class="w-16 shrink-0 text-right text-xs text-ink-500">
                      {{ b.count }} ({{ b.pct }}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 객관식 / 척도 -->
            <div v-else class="space-y-1.5">
              <div v-for="b in st.bars" :key="b.label" class="flex items-center gap-2">
                <span class="w-24 shrink-0 truncate text-xs text-ink-600" :title="b.label">
                  {{ b.label }}
                </span>
                <div class="flex-1 h-6 rounded bg-ink-100 overflow-hidden">
                  <div class="h-full rounded bg-accent/80" :style="{ width: b.pct + '%' }"></div>
                </div>
                <span class="w-16 shrink-0 text-right text-xs text-ink-500">
                  {{ b.count }} ({{ b.pct }}%)
                </span>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>
