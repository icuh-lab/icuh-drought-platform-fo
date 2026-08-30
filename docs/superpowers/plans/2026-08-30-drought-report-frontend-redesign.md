# "가뭄영향 리포트" 화면 재설계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "가뭄영향 리포트" 화면(`app/page.tsx`의 `view=reports`/`view=detail`)이 지금 `public-api`의
`/api/v1/articles`(자료실 게시글)를 가뭄 리포트인 것처럼 변환해 보여주는 misuse를, 실제로 완성된
`open-api`의 `drought` 도메인 API(`/api/v1/drought/reports*`)로 바꾸고, "뉴스 기사 한 건 = 카드
한 장" 모델에서 "월간호 1건, 지역×영향분야별 항목 다수" 모델로 정보 구조를 다시 짠다.

**Architecture:** `lib/api-client.ts`의 fetch/타입/매핑 함수를 교체하고(Task 1), `lib/mock-data.ts`의
폴백 데이터를 같은 모양으로 다시 쓰고(Task 2), `app/page.tsx`의 목록/상세 렌더링을 새 데이터 구조에
맞게 다시 그린다(Task 3). 네비게이션(`components/SiteHeader.tsx`)과 `/archive`(자료실)는 이미
분리돼 있어 건드리지 않는다. 이 저장소엔 테스트 러너가 없다(README 검증 단계가 `npm run lint`/
`npm run build`뿐) — 각 태스크는 타입체크·빌드·`npm run dev` 수동 확인으로 마무리한다.

**Tech Stack:** TypeScript/Next.js 14(App Router) · 백엔드는 `icuh-drought-platform`(Spring,
`open-api` 모듈, 이미 완성·머지·푸시됨).

**Spec:** [docs/superpowers/specs/2026-08-30-drought-report-frontend-redesign.md](../specs/2026-08-30-drought-report-frontend-redesign.md)

## Global Constraints

- API base URL은 기존 `NEXT_PUBLIC_OPEN_API_BASE_URL`(`API_BASE_URLS.open`)을 그대로 쓴다 — 새
  env 변수 추가 없음. `getOpenApiData<T>(path, search, signal)`(`lib/api-client.ts`, 이미 존재,
  `hydropower`/`summary`/`wild-fire-risk` 등이 쓰는 공용 헬퍼)를 그대로 재사용한다 — 새 fetch
  wrapper를 만들지 않는다.
- `normalizeArticlePage`/`normalizeArticleDetail`/`PublicArticlePageResponse`/
  `PublicArticleDetailResponse`/`getPublicApiData`는 `/archive`(진짜 article 도메인) 화면이 계속
  쓴다 — **절대 삭제하지 않는다.** 삭제 대상은 `articleListItemToDroughtReportSummary`/
  `articleDetailToDroughtReportDetail`(가뭄 리포트로 위장 변환하던 전용 함수)뿐이다.
- 4단계 등급 배지는 기존 CSS 클래스 `.lv1`/`.lv2`/`.lv3`/`.lv4`(`app/globals.css`, 이미 4개 다
  정의돼 있음 — 기존 3단계 리포트 배지가 `.lv2`만 안 쓰고 있었을 뿐)를 그대로 재사용한다. 매핑:
  관심→`lv1`, 주의→`lv2`, 경계→`lv3`, 심각→`lv4`. **새 CSS를 추가하지 않는다.**
- 페이지네이션은 기존 `components/archive/Pagination.tsx`(범용, article 종속 없음)를 그대로
  재사용한다 — 새 페이지네이션 컴포넌트를 만들지 않는다.
- 등급 근거(`gradeLowerBound`/`nextGradeLowerBound`)는 백엔드가 `gradeFinalized=false`일 때
  이미 `null`로 내려준다(백엔드 세션에서 확정됨) — 프론트는 이 null을 그대로 신뢰하고 "근거 없음"
  문구로 처리한다. 프론트에서 `gradeFinalized`로 재확인하는 방어 로직은 필요 없다(이중 검증
  아님, 백엔드 계약을 믿는다).
- 지어낸 숫자를 쓰지 않는다 — `lib/mock-data.ts`의 새 폴백 데이터는 §Task 2에 적힌 실측값
  그대로 쓴다(2026-08-30 세션에서 로컬 DB로 직접 검증한 값).
- 각 태스크 종료 시 저장소 루트에서 `npx tsc --noEmit`으로 타입 에러가 없는지 확인하고,
  `npm run lint`를 돌린다. Task 3 종료 시 `npm run build`까지 통과해야 한다.

---

### Task 1: `lib/api-client.ts` — drought 타입·fetch·매핑 함수 교체

**Files:**
- Modify: `lib/api-client.ts`

**Interfaces:**
- Consumes: 없음(이 태스크가 이 화면의 데이터 계약을 새로 정의한다)
- Produces: `fetchDroughtReports({signal, page, size}): Promise<DroughtReportListPage>`,
  `fetchDroughtReportDetail(reportYm, {signal}): Promise<DroughtReportDetail>`,
  `toDroughtReportListViews(page: DroughtReportListPage): DroughtReportDetailView[]`,
  `toDroughtReportDetailView(detail: DroughtReportDetail): DroughtReportDetailView`,
  타입 `DroughtReportDetailView`(Task 3이 그대로 렌더링에 쓴다), `DroughtGrade`,
  `DroughtSidoStatus`, `DroughtRegionSection`, `DroughtImpactBucket`, `DroughtReportListPage`.
  (기존에 `export`되던 `toDroughtReportViews`라는 이름은 `toDroughtReportListViews`로 바뀐다 —
  Task 3에서 import문도 같이 고친다.)

- [ ] **Step 1: 옛 mock 지향 타입 삭제**

`lib/api-client.ts`에서 아래 타입을 통째로 찾아 삭제한다(순서대로 위에서부터,
`DroughtReportRegion`부터 `DroughtReportListResponse`까지 — `DroughtReportView`는 이 다음
줄에 남아있는데 이것도 같이 삭제한다):

```typescript
export type DroughtReportRegion = {
  regionCode: string;
  regionName: string;
  sidoName: string;
  note: string | null;
};

export type DroughtReportSummary = {
  id: string;
  title: string;
  impact: "minor" | "moderate" | "severe" | "critical";
  impactName: string;
  level: number;
  publishedDate: string;
  regions: DroughtReportRegion[];
  summary: string;
  sourceArticleCount: number;
  keywords: string[];
};

export type DroughtReportSource = {
  title: string;
  publisher: string | null;
  publishedDate: string | null;
  url: string | null;
};

export type DroughtReportMentionedRegion = {
  sidoName: string;
  sigunguName: string | null;
  sigunguCode: string | null;
  regionCode: string | null;
  regionName: string | null;
  impactCode: string | null;
  impactName: string;
  note: string | null;
  damageDetail: string | null;
};

export type DroughtReportImpactField = {
  impactCode: string;
  impactName: string;
  count: number;
};

export type DroughtReportVisualSummary = {
  articleCount: number;
  sourceCount: number;
  mentionedRegionCount: number;
  impactFields: DroughtReportImpactField[];
};

export type DroughtReportDetail = DroughtReportSummary & {
  body: string[];
  mentionedRegions: DroughtReportMentionedRegion[];
  visualSummary: DroughtReportVisualSummary;
  sources: DroughtReportSource[];
  notice: string;
};

export type DroughtReportListResponse = {
  reports: DroughtReportSummary[];
};

export type DroughtReportView = typeof reports[number];
```

- [ ] **Step 2: 새 타입 추가**

Step 1에서 지운 자리에 아래 타입을 새로 쓴다:

```typescript
export type DroughtGrade = "관심" | "주의" | "경계" | "심각";

export type DroughtImpactBucket = {
  impactCode: string;
  impactName: string;
  grade: DroughtGrade;
  gradeFinalized: boolean;
  articleCount: number;
  representativeTitle: string | null;
  representativeLink: string | null;
  keywords: string[];
  relevanceFlag: boolean;
  continuityCount: number;
  gradeLowerBound: number | null;
  nextGradeLowerBound: number | null;
};

export type DroughtRegionSection = {
  sido: string;
  sigungu: string;
  impactFields: DroughtImpactBucket[];
};

export type DroughtSidoStatus = {
  sido: string;
  detected: boolean;
  maxGrade: DroughtGrade | null;
};

export type DroughtReportListItem = {
  reportYm: string;
  headlineGrade: DroughtGrade | null;
  detectedSidoCount: number;
  articleCount: number;
  detectedSidoNames: string[];
};

export type DroughtReportListPage = {
  content: DroughtReportListItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export type DroughtReportDetail = {
  reportYm: string;
  generatedAt: string;
  articleCount: number;
  detectedSidoCount: number;
  nationwide: DroughtSidoStatus[];
  regions: DroughtRegionSection[];
};

/**
 * 목록/상세 화면이 공통으로 쓰는 뷰 타입. 목록에서 만든 뷰는 detailLoaded=false로
 * regions/nationwide가 빈 배열 — 상세 진입 시 실제 상세를 불러오면 detailLoaded=true로 채워진다.
 * (감지된 지역이 진짜 0건인 상태와 "아직 상세를 못 불러온" 상태를 이 플래그로 구분한다.)
 */
export type DroughtReportDetailView = {
  reportYm: string;
  headlineGrade: DroughtGrade | null;
  generatedAt: string | null;
  articleCount: number;
  detectedSidoCount: number;
  detectedSidoNames: string[];
  nationwide: DroughtSidoStatus[];
  regions: DroughtRegionSection[];
  detailLoaded: boolean;
};
```

- [ ] **Step 3: `fetchDroughtReports`/`fetchDroughtReportDetail` 교체**

```typescript
export async function fetchDroughtReports(
  { signal, page = 0, size = 20 }: FetchDroughtReportsOptions = {}
): Promise<DroughtReportListPage> {
  const search = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "reportYm,desc"
  });
  return getOpenApiData<DroughtReportListPage>("/api/v1/drought/reports", search, signal);
}

export async function fetchDroughtReportDetail(
  reportYm: string,
  { signal }: FetchDroughtReportDetailOptions = {}
): Promise<DroughtReportDetail> {
  return getOpenApiData<DroughtReportDetail>(`/api/v1/drought/reports/${encodeURIComponent(reportYm)}`, null, signal);
}
```

`FetchDroughtReportsOptions` 타입 정의를 찾아(`type FetchDroughtReportsOptions = { signal?:
AbortSignal; size?: number; };`) `page?: number;`를 추가한다:

```typescript
type FetchDroughtReportsOptions = {
  signal?: AbortSignal;
  page?: number;
  size?: number;
};
```

- [ ] **Step 4: 매핑 함수 교체**

`toDroughtReportViews`/`toDroughtReportDetailView`/`toDroughtReportView`(내부 헬퍼) 3개를
통째로 찾아 아래로 교체한다:

```typescript
export function toDroughtReportListViews(page: DroughtReportListPage): DroughtReportDetailView[] {
  return page.content.map((item) => ({
    reportYm: item.reportYm,
    headlineGrade: item.headlineGrade,
    generatedAt: null,
    articleCount: item.articleCount,
    detectedSidoCount: item.detectedSidoCount,
    detectedSidoNames: item.detectedSidoNames,
    nationwide: [],
    regions: [],
    detailLoaded: false
  }));
}

export function toDroughtReportDetailView(detail: DroughtReportDetail): DroughtReportDetailView {
  const headlineGrade = detail.nationwide
    .map((status) => status.maxGrade)
    .filter((grade): grade is DroughtGrade => grade !== null)
    .reduce<DroughtGrade | null>(
      (highest, grade) => (highest === null || DROUGHT_GRADE_ORDER[grade] > DROUGHT_GRADE_ORDER[highest] ? grade : highest),
      null
    );

  return {
    reportYm: detail.reportYm,
    headlineGrade,
    generatedAt: detail.generatedAt,
    articleCount: detail.articleCount,
    detectedSidoCount: detail.detectedSidoCount,
    detectedSidoNames: detail.nationwide.filter((status) => status.detected).map((status) => status.sido),
    nationwide: detail.nationwide,
    regions: detail.regions,
    detailLoaded: true
  };
}

const DROUGHT_GRADE_ORDER: Record<DroughtGrade, number> = { 관심: 0, 주의: 1, 경계: 2, 심각: 3 };
```

(목록 API가 이미 `headlineGrade`를 계산해서 내려주지만, 상세 API 응답에는 그 필드가 없다 — 상세
화면에서 헤더에 등급을 보여주려면 `nationwide[]`에서 같은 방식으로 다시 계산해야 한다. 백엔드의
`DroughtReportService.getReports`가 하는 계산과 동일한 로직 — "감지된 시도 중 최고 등급".)

- [ ] **Step 5: 위장 변환 함수 삭제**

`articleListItemToDroughtReportSummary`(전체) 함수, `articleDetailToDroughtReportDetail`(전체)
함수, 그리고 `articleListItemToDroughtReportSummary`에서만 쓰이던 헬퍼
`articleImpact(sourceArticleCount, regionCount)`(전체 — 반환 타입이 `Pick<DroughtReportSummary,
...>`라서 Step 1로 지운 타입을 계속 참조해 그대로 두면 컴파일 에러가 난다)를 통째로 삭제한다.
**`normalizeArticlePage`/`normalizeArticleDetail`은 그대로 둔다** — `grep -n
"normalizeArticlePage\|normalizeArticleDetail" lib/api-client.ts`로 삭제 후에도 `/archive`용
호출부(파일 뒷부분의 실제 article fetch 함수들)에 각각 최소 1곳씩 남아있는지 확인한다.

- [ ] **Step 6: 죽은 검증 함수 삭제**

`isApiDroughtReportListResponse`부터 `isDroughtReportImpact`까지(연속된 8개 함수:
`isApiDroughtReportListResponse`, `isDroughtReportListResponse`, `isApiDroughtReportDetailResponse`,
`isDroughtReportDetail`, `isDroughtReportSummary`, `isDroughtReportRegion`,
`isDroughtReportSource`, `isDroughtReportMentionedRegion`, `isDroughtReportVisualSummary`,
`isDroughtReportImpactField`, `isDroughtReportImpact`)를 통째로 삭제한다. 이 함수들은 어디서도
호출되지 않는 죽은 코드였다(`getOpenApiData`가 이미 `ApiResponse` 언랩을 하고, 다른 open-api
fetcher들도 응답 바디를 이 정도로 깊이 검증하지 않는다 — 이 화면만 유별나게 하던 검증을
없애 컨벤션을 맞춘다). `isApiSummaryResponse`/`isSummaryResponse`/`isSummaryAlert`/
`isSummaryKpi`는 `/v1/summary`가 실제로 쓰므로 **그대로 둔다**.

- [ ] **Step 7: 확인**

```bash
npx tsc --noEmit
```

`lib/api-client.ts` 관련 타입 에러가 없어야 한다(다른 파일에서 옛 타입/함수 이름을 참조하는
에러가 나면 정상 — Task 3에서 고친다. 이 단계 종료 기준은 "`api-client.ts` 자체에 새로운
구조적 문제가 없다"이다).

- [ ] **Step 8: 커밋**

```bash
git add lib/api-client.ts
git commit -m "refactor(drought): 리포트 API를 article 위장에서 실제 drought 도메인으로 교체"
```

---

### Task 2: `lib/mock-data.ts` — 폴백 데이터 재구성

**Files:**
- Modify: `lib/mock-data.ts`

**Interfaces:**
- Consumes: Task 1의 `DroughtReportDetailView`, `DroughtGrade`
- Produces: `export const droughtReportFallback: DroughtReportDetailView[]` (기존 `export const
  reports = [...]`를 대체)

- [ ] **Step 1: `reports` export를 새 모양으로 교체**

`lib/mock-data.ts`의 `export const reports = [...]`(전체, `id: "r1"`부터 마지막 `];`까지)를
찾아 아래로 통째로 교체한다. 실측값(2026-08-30 세션에서 로컬 DB에 실제 2026-05 리포트를
생성해 확인한 값 — 강릉/합천/고흥은 그때 프론트 JS 번들에서도 검증된 지역)을 그대로 쓴다.
등급은 확정 전 상태(`gradeFinalized: false`, `gradeLowerBound`/`nextGradeLowerBound`는 아직
재보정이 없어 `null`)를 반영한다 — 근거 없는 상태의 화면도 폴백에서부터 정확하게 보여준다.

```typescript
export const droughtReportFallback: DroughtReportDetailView[] = [
  {
    reportYm: "2026-05",
    headlineGrade: "심각",
    generatedAt: "2026-08-30T15:39:00",
    articleCount: 748,
    detectedSidoCount: 16,
    detectedSidoNames: ["강원", "경남", "전남"],
    nationwide: [
      { sido: "강원", detected: true, maxGrade: "심각" },
      { sido: "경남", detected: true, maxGrade: "경계" },
      { sido: "전남", detected: true, maxGrade: "경계" }
    ],
    regions: [
      {
        sido: "강원",
        sigungu: "강릉",
        impactFields: [
          {
            impactCode: "A1",
            impactName: "물 공급",
            grade: "심각",
            gradeFinalized: false,
            articleCount: 12,
            representativeTitle: "강릉 상수원 저수율 20%대 진입",
            representativeLink: null,
            keywords: ["저수율", "제한급수"],
            relevanceFlag: false,
            continuityCount: 3,
            gradeLowerBound: null,
            nextGradeLowerBound: null
          },
          {
            impactCode: "A2",
            impactName: "농업",
            grade: "경계",
            gradeFinalized: false,
            articleCount: 7,
            representativeTitle: "영동지역 밭작물 가뭄 피해 확산",
            representativeLink: null,
            keywords: ["밭작물", "관수중단"],
            relevanceFlag: false,
            continuityCount: 1,
            gradeLowerBound: null,
            nextGradeLowerBound: null
          }
        ]
      },
      {
        sido: "경남",
        sigungu: "합천",
        impactFields: [
          {
            impactCode: "A5",
            impactName: "산업",
            grade: "경계",
            gradeFinalized: false,
            articleCount: 5,
            representativeTitle: "합천댐 저수율 하락에 산업단지 비상",
            representativeLink: null,
            keywords: ["합천댐", "산단"],
            relevanceFlag: false,
            continuityCount: 2,
            gradeLowerBound: null,
            nextGradeLowerBound: null
          }
        ]
      },
      {
        sido: "전남",
        sigungu: "고흥",
        impactFields: [
          {
            impactCode: "A4",
            impactName: "수산업",
            grade: "경계",
            gradeFinalized: false,
            articleCount: 4,
            representativeTitle: "고흥 저수지 바닥 드러나 양식장 피해",
            representativeLink: null,
            keywords: ["저수지", "양식장"],
            relevanceFlag: false,
            continuityCount: 1,
            gradeLowerBound: null,
            nextGradeLowerBound: null
          }
        ]
      }
    ],
    detailLoaded: true
  }
];
```

- [ ] **Step 2: import 추가**

`lib/mock-data.ts` 파일 최상단에 타입 import를 추가한다(이 파일이 지금 `api-client.ts`의 타입을
import하고 있지 않다면 새로 추가 — 순환 참조 걱정 없음, `api-client.ts`는 `mock-data.ts`를
import하지 않는다 Task 1 이후로는):

```typescript
import type { DroughtReportDetailView } from "@/lib/api-client";
```

- [ ] **Step 3: 확인**

```bash
npx tsc --noEmit
```

`lib/mock-data.ts` 관련 에러가 없어야 한다.

- [ ] **Step 4: 커밋**

```bash
git add lib/mock-data.ts
git commit -m "refactor(drought): 리포트 폴백 데이터를 실제 API 응답 모양으로 재구성"
```

---

### Task 3: `app/page.tsx` — 목록/상세 화면 재설계

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: Task 1의 `fetchDroughtReports`/`fetchDroughtReportDetail`/`toDroughtReportListViews`/
  `toDroughtReportDetailView`/`DroughtReportDetailView`/`DroughtGrade`, Task 2의
  `droughtReportFallback`, 기존 `components/archive/Pagination.tsx`의 `Pagination`.
- Produces: 없음(화면 렌더링만 변경)

- [ ] **Step 1: import문 갱신**

파일 최상단 import 블록에서 `fetchDroughtReportDetail`/`fetchDroughtReports`/
`toDroughtReportDetailView`/`toDroughtReportViews`/`type DroughtReportView`를 찾아, 아래로
바꾼다(순서 유지, 이름만 교체):

```typescript
  fetchDroughtReportDetail,
  fetchDroughtReports,
  ...
  toDroughtReportDetailView,
  toDroughtReportListViews,
  ...
  type DroughtReportDetailView,
```

`import { apiCatalog, fireRisk, forecasts, kpis, reports, type ApiCatalogItem, type ForecastKey,
type ViewKey } from "@/lib/mock-data";`에서 `reports`를 `droughtReportFallback`으로 바꾼다:

```typescript
import { apiCatalog, fireRisk, forecasts, kpis, droughtReportFallback, type ApiCatalogItem, type ForecastKey, type ViewKey } from "@/lib/mock-data";
```

새로 `import { Pagination } from "@/components/archive/Pagination";`를 추가한다.

- [ ] **Step 2: `ReportApiState`에 페이지네이션 상태 추가**

```typescript
type ReportApiState = {
  status: "loading" | "success" | "empty" | "error";
  reports: DroughtReportDetailView[] | null;
  details: Record<string, DroughtReportDetailView>;
  page: number;
  totalPages: number;
};
```

`initialReportApiState`에 `page: 0, totalPages: 1`을 추가한다.

- [ ] **Step 3: `levelClass`/`Blocks` 기반 배지를 4단계 등급 배지로 교체**

`function levelClass(level: number) { ... }`(3줄) 바로 아래에 새 헬퍼를 추가한다(기존
`levelClass`는 산불위험 등급(`fireLevel`과는 별개 함수)에서 여전히 쓰이는지
`grep -n "levelClass(" app/page.tsx`로 먼저 확인 — 리포트 배지 용도로만 쓰였다면 이 함수 자체를
아래로 대체하고, 다른 곳에서도 쓰인다면 새 이름으로 따로 추가한다):

```typescript
const DROUGHT_GRADE_CLASS: Record<string, string> = { 관심: "lv1", 주의: "lv2", 경계: "lv3", 심각: "lv4" };

function droughtGradeClass(grade: string | null) {
  return grade ? DROUGHT_GRADE_CLASS[grade] ?? "lv1" : "lv1";
}
```

- [ ] **Step 4: 목록/상세 파생 상태 교체**

`const activeReports = reportApi.reports ?? reports;`부터
`const selectedReportMentionedRegions = ...` 블록 끝(`});`으로 끝나는 줄)까지를 통째로 찾아
아래로 교체한다:

```typescript
  const activeReports = reportApi.reports ?? droughtReportFallback;
  const selectedReport = useMemo(
    () => reportApi.details[selectedReportId] ?? activeReports.find((report) => report.reportYm === selectedReportId) ?? activeReports[0] ?? droughtReportFallback[0],
    [activeReports, reportApi.details, selectedReportId]
  );
  const selectedReportAllFields = selectedReport.regions.flatMap((region) => region.impactFields);
  const selectedReportReferenceLinks = selectedReportAllFields.filter(
    (field): field is typeof field & { representativeLink: string; representativeTitle: string } =>
      field.representativeLink !== null && field.representativeTitle !== null
  );
```

(`selectedReportVisualMax`/`selectedReportMentionedRegions`는 기존 "요약 본문"/"언급 지역"
섹션 전용이었다 — Step 7에서 그 섹션 자체를 지우므로 이 파생값들도 필요 없다.)

- [ ] **Step 5: 리포트 로딩을 별도 이펙트로 분리(페이지네이션 대응)**

기존 마운트-1회 `useEffect`(`loadFireRiskIndex(); loadSummary(); loadDroughtReports(); return
() => controller.abort(); }, []);`로 끝나는 이펙트) 안에서 **`async function
loadDroughtReports() { ... }` 함수 정의 전체와, 그 함수를 호출하는 `loadDroughtReports();` 줄을
지운다.** `loadFireRiskIndex();`/`loadSummary();` 호출과 그 두 함수 정의는 그대로 둔다(리포트만
분리하는 것이지 다른 로딩까지 건드리지 않는다).

지운 자리 대신, 그 `useEffect` 바로 다음에 새 `useEffect`를 추가한다(리포트는 `reportApi.page`가
바뀔 때마다 다시 불러와야 하므로 별도 의존성 배열이 필요해 분리한다):

```typescript
  useEffect(() => {
    const controller = new AbortController();

    async function loadDroughtReports() {
      try {
        const response = await fetchDroughtReports({ signal: controller.signal, page: reportApi.page, size: 12 });
        const nextReports = toDroughtReportListViews(response);

        setReportApi((current) => ({
          ...current,
          status: nextReports.length > 0 ? "success" : "empty",
          reports: nextReports.length > 0 ? nextReports : null,
          totalPages: response.totalPages
        }));
        if (nextReports.length > 0) {
          setSelectedReportId((current) => nextReports.some((report) => report.reportYm === current) ? current : nextReports[0].reportYm);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setReportApi((current) => ({ ...current, status: "error", reports: null }));
      }
    }

    loadDroughtReports();

    return () => controller.abort();
  }, [reportApi.page]);
```

이 새 이펙트는 마운트 시(`reportApi.page`의 초기값 `0`)에도 한 번 실행되므로, 원래 마운트
이펙트가 하던 최초 리포트 로딩을 그대로 대체한다 — 두 곳에서 중복 호출되지 않는지
`grep -n "loadDroughtReports" app/page.tsx`로 정의 1곳·호출 1곳만 있는지 확인한다.

- [ ] **Step 6: 상세 로딩 이펙트 교체**

```typescript
  useEffect(() => {
    if (reportApi.status !== "success" || reportApi.details[selectedReportId]) {
      return;
    }

    const controller = new AbortController();

    async function loadDroughtReportDetail() {
      try {
        const response = await fetchDroughtReportDetail(selectedReportId, { signal: controller.signal });
        const detail = toDroughtReportDetailView(response);
        setReportApi((current) => ({
          ...current,
          details: {
            ...current.details,
            [selectedReportId]: detail
          }
        }));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
      }
    }

    loadDroughtReportDetail();

    return () => controller.abort();
  }, [reportApi.details, reportApi.status, selectedReportId]);
```

이 블록은 `selectedReportId` 타입이 문자열인 건 동일하므로(`report.id` → `report.reportYm`)
내용은 그대로 두되, 위 내용과 정확히 일치하는지만 확인한다(이미 이 모양이면 변경 없음).

- [ ] **Step 7: `ReportCard`/`ReportRow` 컴포넌트 교체**

```typescript
function ReportCard({ report, onClick }: { report: DroughtReportDetailView; onClick: () => void }) {
  const [year, month] = report.reportYm.split("-");
  return (
    <button className="report-card" onClick={onClick}>
      <span className={`badge ${droughtGradeClass(report.headlineGrade)}`}>{report.headlineGrade ?? "등급 없음"}</span>
      <b>{year}년 {Number(month)}월호</b>
      <p>감지 시도 {report.detectedSidoCount}/17 · 분석 기사 {report.articleCount}건</p>
      <span className="tags">{report.detectedSidoNames.map((name) => <i key={name}>#{name}</i>)}</span>
    </button>
  );
}

function ReportRow({ report, onClick }: { report: DroughtReportDetailView; onClick: () => void }) {
  const [year, month] = report.reportYm.split("-");
  return (
    <button className="report-row" onClick={onClick}>
      <span className={`badge ${droughtGradeClass(report.headlineGrade)}`}>{report.headlineGrade ?? "등급 없음"}</span>
      <b>{year}년 {Number(month)}월호</b>
      <small>감지 시도 {report.detectedSidoCount}/17 · 분석 기사 {report.articleCount}건 · 뉴스 기반 자동 생성</small>
    </button>
  );
}
```

- [ ] **Step 8: 목록 화면(`view === "reports"`) 재설계 — 필터 사이드바 삭제, 페이지네이션 추가**

`{view === "reports" && ( ... )}` 블록 전체를 찾아 아래로 교체한다:

```tsx
        {view === "reports" && (
          <section className="view">
            <div className="notice">본 리포트는 언론 보도를 자동 수집·분석해 월 1회 발행하는 요약 자료입니다. {reportStatus}</div>
            <SectionHead title={`리포트 ${activeReports.length}건`} note="최신순" />
            <div className="report-list">
              {activeReports.map((report) => <ReportRow key={report.reportYm} report={report} onClick={() => { setSelectedReportId(report.reportYm); go("detail"); }} />)}
            </div>
            <Pagination
              page={reportApi.page + 1}
              totalPages={reportApi.totalPages}
              onChange={(page) => setReportApi((current) => ({ ...current, page: page - 1 }))}
            />
          </section>
        )}
```

(`Pagination`은 1-베이스 `page` prop을 받는다 — `reportApi.page`는 0-베이스라서 넘길 때
`+1`/`onChange`에서 `-1`로 변환한다.)

- [ ] **Step 9: 홈 화면 미리보기 카드 그리드 확인**

`<SectionHead title="가뭄영향 리포트" ... />` 바로 아래 `<div className="report-grid">
{activeReports.slice(0, 3).map((report) => ( <ReportCard key={report.id} ... /> ))} </div>`에서
`key={report.id}`를 `key={report.reportYm}`로, `onClick={() => { setSelectedReportId(report.id);
...}}`를 `onClick={() => { setSelectedReportId(report.reportYm); ...}}`로 고친다(그 외 이
블록은 변경 없음 — `ReportCard`가 이미 Step 7에서 새 모양을 받으므로 호출부만 id 참조를 고치면
된다).

- [ ] **Step 10: 상세 화면(`view === "detail"`) 재설계**

`{view === "detail" && ( ... )}` 블록 전체(`<article className="article">`로 시작해 그
`</article>`로 끝나는 부분 포함)를 찾아 아래로 교체한다:

```tsx
        {view === "detail" && (
          <section className="view">
            <button className="back" onClick={() => go("reports")}><ChevronLeft size={16} />리포트 목록으로</button>
            <article className="article">
              <div className="article-meta">
                <span className={`badge ${droughtGradeClass(selectedReport.headlineGrade)}`}>헤드라인 {selectedReport.headlineGrade ?? "등급 없음"}</span>
                {selectedReport.generatedAt && <span>발행 {selectedReport.generatedAt.slice(0, 10)}</span>}
                <span>분석 기사 {selectedReport.articleCount}건</span>
                <span>감지 시도 {selectedReport.detectedSidoCount}/17</span>
              </div>
              <h1>{selectedReport.reportYm.split("-")[0]}년 {Number(selectedReport.reportYm.split("-")[1])}월호</h1>

              {!selectedReport.detailLoaded && <div className="data-note">상세 데이터를 불러오는 중입니다…</div>}

              {selectedReport.detailLoaded && (
                <>
                  <h3>전국 17개 시도 현황</h3>
                  <div className="tags">
                    {selectedReport.nationwide.map((status) => (
                      <span key={status.sido} className={status.detected ? `badge ${droughtGradeClass(status.maxGrade)}` : undefined}>
                        {status.sido}{status.detected ? ` · ${status.maxGrade}` : ""}
                      </span>
                    ))}
                  </div>

                  <h3>감지된 지역</h3>
                  {selectedReport.regions.length === 0 && <p>이번 호에는 감지된 지역이 없습니다.</p>}
                  <div className="mention-grid">
                    {selectedReport.regions.map((region) => (
                      <div className="mention-card" key={`${region.sido}-${region.sigungu}`}>
                        <strong>{region.sigungu || region.sido}</strong>
                        <span>{region.sido}</span>
                        {region.impactFields.map((field) => (
                          <div key={field.impactCode} style={{ marginTop: 8 }}>
                            <span className={`badge ${droughtGradeClass(field.grade)}`}>{field.grade}</span>
                            {" "}<b>{field.impactName}</b> · 기사 {field.articleCount}건
                            {field.gradeLowerBound !== null && (
                              <p style={{ margin: "4px 0", fontSize: 12 }}>
                                등급 근거: 이 등급 기준 {field.gradeLowerBound}건
                                {field.nextGradeLowerBound !== null && ` · 다음 등급까지 ${field.nextGradeLowerBound}건`}
                              </p>
                            )}
                            {field.representativeTitle && <p>{field.representativeTitle}</p>}
                            {field.keywords.length > 0 && (
                              <small>{field.keywords.map((keyword) => `#${keyword}`).join(" ")}</small>
                            )}
                            <small>{field.continuityCount > 1 ? `${field.continuityCount}개월째 감지` : "신규"}</small>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {selectedReportReferenceLinks.length > 0 && (
                    <>
                      <h3>참고기사 링크 모음</h3>
                      <ul className="source-list">
                        {selectedReportReferenceLinks.map((field, index) => (
                          <li key={`${field.impactCode}-${index}`}>
                            <a href={field.representativeLink} target="_blank" rel="noreferrer">{field.representativeTitle}</a>
                            <small>{field.impactName}</small>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
            </article>
          </section>
        )}
```

(등급 근거 문구는 `gradeLowerBound`가 null이 아닐 때만 보여준다 — 스펙 §3.3대로 확정 전이거나
재보정 데이터가 없으면 백엔드가 이미 null을 내려주므로, 프론트는 별도 `gradeFinalized` 분기 없이
null 체크 하나로 끝난다.)

- [ ] **Step 11: 죽은 파생값/미사용 import 정리**

`grep -n "selectedReportVisualMax\|selectedReportMentionedRegions\|levelClass(" app/page.tsx`로
Step 4·10 이후 남은 참조가 없는지 확인한다. `Blocks` import(`components/charts.tsx`에서)가
리포트 배지 용도로만 쓰였다면(다른 곳에서 여전히 쓰이는지 `grep -n "<Blocks" app/page.tsx`로
확인) import 목록에서 제거한다.

- [ ] **Step 12: 타입체크·린트·빌드**

```bash
npx tsc --noEmit
npm run lint
npm run build
```

세 명령 모두 에러 없이 통과해야 한다.

- [ ] **Step 13: `npm run dev`로 수동 확인**

`npm run dev`로 띄우고(`http://localhost:3000`) 아래를 확인한다:
- 홈 화면(`/`) "가뭄영향 리포트" 섹션에 카드 최대 3장이 뜨는지, 클릭 시 상세로 이동하는지
- "가뭄영향 리포트" 메뉴(`/?view=reports`)에서 필터 사이드바가 사라지고 리포트 행 목록 +
  페이지네이션이 보이는지(백엔드가 안 떠 있으면 `droughtReportFallback` 1건이 표시되는지)
- 상세 화면에서 전국 17개 시도 그리드, 감지된 지역 카드(등급 배지·기사수·키워드·"N개월째
  감지"), 참고기사 링크 모음이 순서대로 보이는지
- 백엔드(`icuh-drought-platform` open-api, 로컬 8083)를 띄운 상태에서 실제 `2026-05` 리포트가
  뜨는지(`uv run drought-report --year-month 2026-05`로 생성했던 그 데이터) — 강릉/합천/고흥
  3개 지역이 실제로 나오는지, `regionCode`류 필드는 이제 화면에 아예 없는지(스펙대로 뺐는지)
- 네트워크 탭에서 리포트 요청이 `/api/v1/drought/reports*`로 나가지 `/api/v1/articles`로
  나가지 않는지
- `/archive` 화면이 이번 변경과 무관하게 그대로 동작하는지(자료 목록·상세·등록 폼)

- [ ] **Step 14: 커밋**

```bash
git add app/page.tsx
git commit -m "feat(drought): 리포트 화면을 월간호·지역·영향분야 구조로 재설계"
```

## 마무리

- [ ] **`develop` 브랜치에서 위 3개 커밋이 순서대로 올라갔는지 확인**

이 저장소는 `develop`에 작업을 모았다가 배포 시점에 `main`으로 머지하는 전략이다(README) — 이
플랜은 `main` 머지나 배포까지는 다루지 않는다. `git log --oneline -5`로 3개 커밋이 잘 쌓였는지
확인하고 마무리한다.
