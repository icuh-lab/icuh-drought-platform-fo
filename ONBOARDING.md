# 온보딩 가이드

## 1. 프로젝트 개요

가뭄이 농업·에너지·산불·물가에 미치는 영향 정보를 한 화면에 모아 제공하는 **ICUH 가뭄영향정보플랫폼 프론트오피스**입니다.
서로 다른 3개 백엔드 서버(public-api / open-api / admin-api)에 흩어진 데이터를 하나의 UI로 통합하고, 수치 지표(정형)와 리포트·첨부문서(비정형)를 같은 내비게이션 안에서 다룹니다.
백엔드가 아직 완성 전이라, **모든 화면이 서버 없이도 mock/fallback으로 동작**하도록 설계된 것이 이 프로젝트의 가장 큰 특징입니다.

기술 스택: Next.js 14 (App Router) + React 18 + TypeScript(strict).
상태관리·데이터페칭·차트 라이브러리를 쓰지 않습니다. 런타임 의존성은 `lucide-react` 하나뿐이고, 차트도 순수 SVG로 직접 그립니다.

---

## 2. 디렉토리 구조

```
icuh-drought-platform-fo/
├── app/                      # Next.js App Router 라우트
│   ├── page.tsx              # 대시보드 (6개 화면을 state로 전환하는 SPA)
│   ├── layout.tsx            # 루트 레이아웃 · 메타데이터
│   ├── globals.css           # 전역 스타일 (CSS 변수 토큰 기반, 단일 파일)
│   └── archive/              # 가뭄 자료실 (실제 파일 라우트)
│       ├── page.tsx          #   목록·검색
│       ├── new/page.tsx      #   자료 등록
│       └── [id]/
│           ├── page.tsx      #   상세 · 삭제 요청
│           └── edit/page.tsx #   수정 요청
├── components/
│   ├── charts.tsx            # SVG 스파크라인 · 예측 차트 (외부 라이브러리 없음)
│   └── archive/              # 자료실 전용 UI 컴포넌트 8개
├── lib/                      # 비즈니스 로직 계층 (여기가 핵심)
│   ├── api-client.ts         #   3개 백엔드 어댑터 + 타입 가드
│   ├── archive-upload.ts     #   S3 멀티파트 직접 업로드
│   ├── archive-fallback.ts   #   백엔드 없을 때 쓰는 로컬 시연 데이터
│   ├── archive-types.ts      #   자료실 도메인 타입 정의
│   └── mock-data.ts          #   대시보드 mock 데이터 + API 카탈로그
├── scripts/                  # 자체 검증 스크립트 (테스트 프레임워크 미사용)
├── docs/api-spec.md          # 화면 기준 API 명세 (462줄)
└── FRONTEND_INTEGRATION_PLAN.md  # 백엔드 통합 계획 · 현재 진행 상황
```

**폴더 역할 요약**

| 폴더 | 역할 |
| --- | --- |
| `app/` | 라우팅과 화면 조립. 데이터 변환 로직은 두지 않고 `lib/` 함수를 호출만 합니다. |
| `components/` | 프레젠테이션 컴포넌트. `archive/` 하위는 자료실 전용입니다. |
| `lib/` | **모든 비즈니스 로직.** API 호출, 응답 정규화, 화면 모델 변환, fallback 생성 |
| `scripts/` | 순수 함수 검증 스크립트 + 실제 서버 smoke 테스트 |
| `docs/` | 화면별로 필요한 API를 정리한 명세서 |

---

## 3. 핵심 파일 5개

### 1. [lib/api-client.ts](lib/api-client.ts) — 1673줄
3개 백엔드의 서로 다른 응답 봉투를 벗기고, 런타임 타입 가드로 검증한 뒤 화면 모델로 변환하는 **어댑터 계층**. 이 프로젝트 로직의 대부분이 여기 있습니다.

### 2. [app/page.tsx](app/page.tsx) — 1030줄
6개 대시보드 화면을 `view` state로 전환하며, 위젯별 4-state(`loading`/`success`/`empty`/`error`)를 관리하고 **실패한 항목만** mock으로 대체하는 통합 오케스트레이터.

### 3. [lib/archive-upload.ts](lib/archive-upload.ts) — 97줄
파일을 5MB 파트로 쪼개 presigned URL을 받아 브라우저에서 S3로 **직접** 올리고, ETag를 모아 조합 완료시키는 멀티파트 업로드 전 과정.

### 4. [lib/archive-fallback.ts](lib/archive-fallback.ts) — 193줄
백엔드가 꺼져 있을 때 검색어·필터·페이징까지 로컬에서 재현한 가짜 목록 페이지를 만들어 시연을 가능하게 합니다.

### 5. [components/archive/ArticleForm.tsx](components/archive/ArticleForm.tsx) — 134줄
등록/수정 공용 폼. 업로드 완료된 `File` 객체를 `Map`에 캐시해 **제출 실패 후 재시도 시 S3 중복 업로드를 막습니다**.

---

## 4. 주요 코드 흐름

### 4-1. 백엔드 구성 — 서버 3개, 응답 봉투 3종

가장 먼저 이해해야 할 부분입니다. base URL도 응답 형식도 서버마다 다릅니다.

| 서버 | 기본 포트 | 응답 봉투 | 담당 |
| --- | --- | --- | --- |
| `public-api` | 8081 | `{ status, message, data, error }` | 자료실·게시글·파일 |
| `open-api` | 8083 | `{ result, data, error }` | 지수·예측 데이터 |
| `admin-api` | 8082 | DTO/배열 **직접 반환** | 승인·반려 |

[api-client.ts](lib/api-client.ts)의 서버별 게이트웨이 함수(`getOpenApiData` / `getPublicApiData` / `adminHeaders`)가 이 차이를 흡수합니다. **새 API를 붙일 때는 반드시 해당 서버의 게이트웨이를 거치세요.**

### 4-2. 데이터 변환 3단계

```
백엔드 원본 DTO  →  정규화 타입  →  화면 View 타입
```

예시:

```
OpenAgriDailyPriceResponse
  → fetchPriceForecast()      → PriceForecastResponse   (정규화)
  → toPriceForecastView()     → PriceForecastView       (화면용)
```

`is*` 형태의 **타입 가드 함수가 50개 가까이** ([api-client.ts:784-1150](lib/api-client.ts#L784-L1150)) 있습니다. TypeScript 타입만 믿지 않고 `unknown`으로 받아 필드 단위로 검증합니다. 계약이 확정되지 않은 백엔드에 대한 방어선이므로, 새 응답 타입을 추가할 때 가드도 같이 작성하는 것이 이 코드베이스의 관례입니다.

### 4-3. 대시보드 로딩 흐름

```
app/page.tsx 마운트
  → useEffect에서 5개 API를 병렬 호출 (summary / 배추 / 양파 / 수력 / 산불 / 신선식품)
  → 각 위젯이 독립적으로 loading → success | empty | error 로 전이
  → activeForecasts / activeKpis 에서 `??` 병합으로 실패분만 mock 대체
  → 실패한 위젯만 "API 연결 전입니다" 문구(.data-note) 노출
```

핵심은 [app/page.tsx:277](app/page.tsx#L277)의 병합입니다.

```ts
cabbage: priceApis.cabbage.forecast ?? forecasts.cabbage
```

**한 API가 죽어도 나머지 화면은 정상 동작합니다.** 이 패턴을 깨뜨리지 마세요.

### 4-4. 자료실 검색 흐름

검색 조건을 state가 아니라 **URL 쿼리스트링에 둡니다**.

```
사용자 입력 → push({ query, page: 1 }) → router.push('/archive?...')
  → useSearchParams 가 변경 감지 → useEffect 재실행 → fetchArticles()
  → 실패 시 buildFallbackArticlePage() 로 로컬 데이터 표시
```

덕분에 링크 공유와 뒤로가기가 자연스럽게 동작합니다. 필터를 추가할 때도 같은 방식(`push`)을 따르세요.

### 4-5. 파일 업로드 흐름 (가장 복잡)

파일이 백엔드를 **경유하지 않고** 브라우저에서 S3로 직행합니다.

```
1. generate-upload-id       업로드 개시, uploadId 발급
2. splitParts()             5MB 단위로 분할 (빈 파일도 파트 1개)
3. presigned-url            파트별 URL 발급          ─┐ 파트 단위 병렬
4. S3에 PUT                 응답 헤더에서 ETag 수집   ─┘
5. complete-upload          파트 조합 완료 → 파일 메타데이터 반환
6. createArticleWithFiles   메타데이터를 게시글 저장에 첨부
```

파일들은 순차 업로드되고, 한 파일 안의 파트는 병렬 처리됩니다.

### 4-6. 승인 워크플로

일반 사용자는 자료를 **직접 수정/삭제할 수 없고 "요청"만** 합니다.

```
등록 시 임시 비밀번호 설정
  → 수정/삭제 시 PasswordDialog 로 비밀번호 + 사유 입력
  → 요청 접수 (즉시 반영 안 됨)
  → 관리자가 admin 화면에서 승인/반려
```

상태값이 `PENDING` / `APPROVED` / `UPDATED_PENDING` / `UPDATED_APPROVED` / `DELETED_PENDING`으로 나뉘는 이유입니다.

### 4-7. ⚠️ 먼저 알아두면 좋은 함정들

코드 주석에 이미 기록돼 있지만, 미리 알면 시간을 아낄 수 있는 것들입니다.

- **페이지 인덱스**: UI는 1-base, API는 0-base. 반드시 `toApiPage()`를 거치세요.
- **등록 vs 수정 필드명이 다릅니다**: 등록은 `completedFiles`, 수정은 `newFiles`. 백엔드 `UpdateArticleRequest`가 받는 이름이 `newFiles`입니다.
- **수정 요청 시 passthrough 필드 유실 주의**: 폼에 없는 `sourceUrl`, `sourceArticleCount`, `regionMentions`, `keywords`, `autoSummaryNotice`를 원본 값 그대로 실어 보내지 않으면 **승인 시 null/0/[]로 날아갑니다** (`ArticleUpdatePassthroughFields` 참고).
- **비밀번호 오류가 401이 아니라 400으로 옵니다**: 상태코드로 판별 불가. `error.data` 문자열의 `"Invalid password"`로만 구분합니다.
- **`/api/v1/article-categories`만 봉투를 쓰지 않습니다**: `data`가 아니라 응답 본문이 곧 DTO입니다.
- **멀티파트 업로드 API 3종도 봉투가 없습니다**: 그래서 `postRaw`/`postText`로 따로 처리합니다.
- **S3 CORS에 `ExposeHeaders: ETag`가 필요합니다**: 없으면 브라우저가 ETag를 못 읽어 업로드가 실패합니다.

---

## 5. 개발 시작하기

### 설치 & 실행

```bash
npm install
npm run dev        # http://localhost:3000
```

**백엔드 없이도 바로 실행됩니다.** 모든 화면이 mock/fallback으로 동작하므로, 첫날 환경 설정에 막힐 일은 없습니다.

### 환경변수

`.env.local.example`을 `.env.local`로 복사해 사용합니다.

```bash
cp .env.local.example .env.local
```

```bash
NEXT_PUBLIC_PUBLIC_API_BASE_URL=http://localhost:8081   # 자료실·게시글·파일
NEXT_PUBLIC_OPEN_API_BASE_URL=http://localhost:8083     # 지수·예측
NEXT_PUBLIC_ADMIN_API_BASE_URL=http://localhost:8082    # 관리자 승인

NEXT_PUBLIC_OPEN_API_DEFAULT_YEAR=2026                  # open-api 조회 기준 연월
NEXT_PUBLIC_OPEN_API_DEFAULT_MONTH=5
NEXT_PUBLIC_AGRI_CABBAGE_LOCATION=강릉                   # 대시보드 표시 지역
NEXT_PUBLIC_AGRI_ONION_LOCATION=합천
NEXT_PUBLIC_HYDROPOWER_DAM_NAME=합천
```

백엔드를 붙이려면 멀티모듈 3개(`public-api` 8081, `admin-api` 8082, `open-api` 8083)를 각각 띄워야 합니다.

### 검증

정식 검증 명령은 두 개입니다.

```bash
npm run lint       # ESLint (next lint)
npm run build      # 타입 체크 + 프로덕션 빌드
```

### 테스트 스크립트

테스트 프레임워크를 쓰지 않고, 자체 `check()` 함수 기반 스크립트를 씁니다.
**`package.json`에 `test` 스크립트가 등록돼 있지 않아** 직접 실행해야 합니다.

```bash
# 순수 함수 단위 검증 (백엔드 불필요)
npx tsx scripts/archive-upload.test.mts          # 파일 파트 분할 경계값 7건
npx tsx scripts/archive-page-conversion.test.mts # 페이지 인덱스 변환 6건

# 실제 서버 연동 확인 (public-api 실행 중이어야 함)
node scripts/archive-smoke.mjs
```

> **주의**: 현재 로컬 Node는 v20이라 `node --experimental-strip-types`가 동작하지 않습니다(Node 22.6+ 필요). `.mts` 파일은 위처럼 `npx tsx`로 실행하세요.

### 코드 컨벤션

- **UI 텍스트·주석은 한국어**로 작성합니다.
- 스타일은 [app/globals.css](app/globals.css)에 CSS 변수 토큰(`--brand`, `--ink`, 위험등급 `--r1`~`--r4`)으로 정의돼 있습니다. 인라인 스타일이나 새 CSS 파일을 만들지 말고 기존 클래스를 재사용하세요.
- 비즈니스 로직은 `lib/`에, 화면 조립은 `app/`과 `components/`에 둡니다.
- 새 API 연동 시: ① 서버별 게이트웨이 함수 사용 → ② 타입 가드 작성 → ③ `to*View()` 어댑터 추가 → ④ 실패 시 fallback 경로 확인.

### 먼저 읽어보면 좋은 문서

- [docs/api-spec.md](docs/api-spec.md) — 화면별로 어떤 API가 필요한지 정리된 명세 (462줄). 하단 "확인 필요" 섹션에 미확정 계약이 모여 있습니다.
- [FRONTEND_INTEGRATION_PLAN.md](FRONTEND_INTEGRATION_PLAN.md) — 백엔드 통합의 배경과 현재 진행 상황.
- [README.md](README.md) — 실행 방법과 연동 엔드포인트 목록.

### 참고: 알려진 이슈

- `tsconfig.json`의 `target`이 `es5`인데 코드에서 `.at(-1)`, `replaceAll` 등 최신 API를 씁니다. `lib`가 `esnext`라 타입 체크는 통과하지만 어긋난 조합입니다.
- 대시보드 상단 필터바(지역/기간 칩)와 "최종 갱신" 스탬프는 [app/page.tsx:648](app/page.tsx#L648) 기준 **하드코딩된 정적 UI**로, 아직 데이터와 연결돼 있지 않습니다.
- 별도 리포트 API가 없어, 가뭄영향 리포트는 public-api 게시글을 [api-client.ts:1254](lib/api-client.ts#L1254) `articleListItemToDroughtReportSummary`에서 영향도(`minor`~`critical`)를 산출해 재해석한 결과입니다.
