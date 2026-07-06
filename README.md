# digda-admin

`digda-server`의 관리자(ADMIN) 전용 운영 대시보드. Vue 3 + TypeScript + Vite 기반 SPA 이며, 백엔드의 `/api/admin/**` 엔드포인트(JWT + ROLE_ADMIN)를 소비한다.

## 주요 기능

- 이메일/비밀번호 로그인 (`/api/admin/auth/login`)
- 대시보드 요약 통계 + 최근 관리자 활동 로그
- 사용자 검색 / 권한 변경
- 그룹방 검색 / 상태 변경 (RECOVER, SCHEDULE_DELETE, HARD_DELETE)
- 일기 검색 / 상세 / 삭제
- 일정 검색 / 상세
- DB 테이블 메타데이터 및 행 조회 (페이징, 컬럼 클릭 정렬)
- 관리자 행위/시스템 로그 검색 (액션/기간/키워드 필터)

## 기술 스택

- Vue 3.5 · TypeScript · Vite 5
- Vue Router 4 · Pinia 2
- Axios (JWT 자동 주입 + 401 → `/login`)
- Tailwind CSS 3
- @heroicons/vue
- Chart.js + vue-chartjs (추후 차트 확장용)

## 시작하기

### 사전 준비

- Node.js ≥ 18 (권장: 20+)
- npm ≥ 9
- 실행 중인 `digda-server` (기본 `http://localhost:8080`)

### 환경 변수

`.env.example` 을 `.env.local` 로 복사 후 값 수정:

```bash
cp .env.example .env.local
```

| 키 | 설명 | 예시 |
|----|------|------|
| `VITE_API_BASE_URL` | `digda-server`의 HTTP 베이스 URL | `http://localhost:8080` |

### 의존성 설치 & 실행

```bash
npm install
npm run dev      # http://localhost:5173
```

### 빌드

```bash
npm run build       # 타입체크 + dist/ 생성
npm run preview     # 프로덕션 번들 로컬 프리뷰
```

### 타입 체크

```bash
npm run type-check
```

## 디렉터리 구조

```
src/
├─ api/          # axios 인스턴스, admin API 래퍼
├─ assets/       # 글로벌 CSS (Tailwind 엔트리)
├─ components/
│  ├─ layout/    # AdminShell (사이드바 + 헤더)
│  └─ ui/        # StatCard, Pagination, Modal …
├─ router/       # vue-router + 가드
├─ stores/       # pinia auth 스토어
├─ types/        # 백엔드 DTO 타입 (수기 선언)
├─ utils/        # 포매터 등
└─ views/        # 각 메뉴별 페이지
```

## 인증 흐름

1. `/login` → `POST /api/admin/auth/login` 호출 후 JWT 저장 (localStorage)
2. `axios` 요청 인터셉터가 `Authorization: Bearer {accessToken}` 자동 주입
3. 응답 401 → `auth.clear()` 후 `/login` 으로 리다이렉트
4. 라우터 가드가 비인증 접근을 `/login?redirect=…` 으로 차단

## 관련 문서

- 백엔드 API 스펙: `digda-server/docs/API_SPECIFICATION.md`
- ERD: `digda-server/docs/ERD.md`
