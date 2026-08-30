# "가뭄영향 리포트" 화면 재설계 — 실제 drought API로 전환

> **성격**: 아키텍처 브레인스토밍 산출물. `icuh-drought-platform`(Spring, open-api)에 새로 만든
> `drought` 도메인 API로 이 화면의 데이터 출처를 바꾸고, 그에 맞춰 정보 구조를 다시 짠다.
> **백엔드 스펙**: `icuh-drought-platform` 저장소의
> `docs/superpowers/specs/2026-08-30-drought-report-domain-design.md`
> (해당 저장소는 `/Users/jeongseok/Desktop/workspace_intelliJ/icuh-drought-platform`)

## 1. 배경

`app/page.tsx`의 "가뭄영향 리포트" 섹션(`view=reports`/`view=detail`)은 UI가 이미 완성돼 있지만,
`lib/api-client.ts`의 `fetchDroughtReports`/`fetchDroughtReportDetail`이 실제로는
`public-api`의 `/api/v1/articles`(자료실 게시글)를 불러 가뭄 리포트인 것처럼 변환해 보여주고 있다
(`articleListItemToDroughtReportSummary`/`articleDetailToDroughtReportDetail`). 이제 진짜
뉴스 기반 월간 리포트 API(`open-api`의 `drought` 도메인)가 완성됐으므로 데이터 출처를 바꾼다.

네비게이션은 이미 "가뭄영향 리포트"(`/`, view=reports)와 "가뭄 자료실"(`/archive`)이 별도
메뉴로 분리돼 있다(`components/SiteHeader.tsx`) — 이번 작업은 메뉴 구조를 건드리지 않는다.

## 2. 핵심 구조 변화

기존 mock/현재 UI는 **"뉴스 기사 한 건 = 리포트 카드 한 장"** 모델(개별 스토리, 단일 제목·본문·
출처 목록)이다. 실제 백엔드는 **"월간호 1건, 그 안에 지역×영향분야별 항목 다수"** 모델이다 —
리포트 하나에 단일 제목/본문이 없다. 이 문서는 이 구조 차이를 반영해 목록·상세 화면을
다시 설계한다.

## 3. 화면 설계 (확정, 대화로 승인됨)

### 3.1 홈 화면 미리보기 (`view=home`)

기존 "최근 3개" 로직 유지 — 자연스럽게 "최근 3개월 호"가 된다. 카드 내용은 §3.2와 동일.

### 3.2 리포트 목록 (`view=reports`)

카드 1장 = 월간호 1건.

- `{연}년 {월}월호` (report_ym)
- 헤드라인 등급 배지 — **4단계(관심/주의/경계/심각)**. 기존 3단계 `Blocks`/`levelClass` 컴포넌트는
  이 화면에서 폐기하고 새 4단계 배지로 교체(디자인 목업에서 확인한 색상: 관심=연한 청록, 주의=
  호박색, 경계=주황, 심각=적색 — 기존 사이트의 3단계 배지 색을 그대로 재사용하고 경계 색만 새로
  보간).
- 감지 시도 `N/17`, 분석 기사 `M`건

기존 좌측 필터 사이드바(지역 체크박스 3개 하드코딩 + 기간 라디오 3개)는 **삭제**한다 — 실제
API에 대응하는 필터 파라미터가 없다(월간호 자체가 이미 월 단위이고, `GET /api/v1/drought/reports`는
`page`/`size`/`sort` 페이지네이션만 지원). 대신 페이지네이션 컨트롤을 둔다.

### 3.3 상세 화면 (`view=detail`) — 전면 재설계

- **헤더**: report_ym + 헤드라인 배지(4단계) + 발행일시(`generatedAt`) + 분석기사수 + 감지시도 `N/17`
- **(신규) 전국 17개 시도 현황**: `nationwide[]` 그리드. 감지된 시도는 등급 배지 포함, 미감지는
  중립 표기. 기존 mock UI엔 없던 섹션 — 새 데이터로 얻는 것.
- **감지된 지역**: `regions[]` 순회. 지역(시도·시군구, `sigungu`가 빈 문자열이면 시도만 표시)마다
  그 지역의 `impactFields[]`를 카드로 나열. 카드 1개(=영향분야 버킷 1개)에:
  - 영향분야명(`impactName`) + 등급 배지(`grade`) + 기사건수(`articleCount`)
  - **등급 근거**(`gradeLowerBound`/`nextGradeLowerBound`) — **둘 다 null일 수 있다**. null인
    이유가 두 가지라 문구를 구분한다:
    1. 아직 등급이 확정 안 됨(`gradeFinalized=false`, 생성 후 1개월 유예 중) → "등급 확정 전"
       같은 중립 문구, 근거 자체를 안 보여줌.
    2. 확정됐지만 재보정 데이터가 아예 없음(Python 쪽이 아직 `recalibrate-breaks`를 한 번도
       안 돌림) → 마찬가지로 근거 섹션을 생략(빈 값으로 오해하게 만드는 placeholder 숫자를
       만들어내지 않는다).
    둘 다 있으면 "N건 → 이 등급(하한 `gradeLowerBound`건), 다음 등급까지 `nextGradeLowerBound`건"
    형태로 표시. `nextGradeLowerBound`가 null인데 확정은 됐다면 두 경우를 `grade` 필드로 구분할
    수 있다 — `grade === "심각"`이면 "이미 최고 등급"(정상), 그 외 등급인데 null이면 "다음 등급
    구간 데이터 없음"(재보정이 이 영향분야까지는 못 채웠을 뿐, 오류 아님)으로 별도 안내한다.
  - 대표기사 제목(`representativeTitle`) + 링크(`representativeLink`) — 원문 출처
  - 키워드 태그(`keywords[]`)
  - "N개월째 감지"(`continuityCount`, 1이면 "신규")

  기존 "기사에서 언급된 지역"(자유서술 `note`/`damageDetail`) 섹션은 **삭제** — 실제 데이터에
  대응 필드가 없다. 위 카드가 그 역할을 대체한다.
- **참고기사 링크 모음**: 실제 백엔드는 지역×영향분야당 대표기사 1건만 가진다(전체 원문 목록
  없음). `regions[].impactFields[]`의 `representativeTitle`/`representativeLink`를 전부
  모아 한 목록으로 보여준다(지역 카드 안의 링크와 내용은 겹치지만, "한눈에 원문 모아보기" 용도로
  유지하기로 확정함).
- 기존 "요약 본문"(자유서술 summary paragraph) 섹션은 **삭제** — 대응 데이터 없음.

## 4. API 연동 (`lib/api-client.ts`)

### 4.1 엔드포인트 교체

```
fetchDroughtReports:        GET /api/v1/articles              →  GET /api/v1/drought/reports
fetchDroughtReportDetail:   GET /api/v1/articles/{id}          →  GET /api/v1/drought/reports/{reportYm}
```

둘 다 `open-api`(`NEXT_PUBLIC_OPEN_API_BASE_URL`, 기존 `/v1/summary`·`hydropower`·`wild-fire-risk`
등과 동일 base URL)로 붙는다 — `public-api`(`articles`)가 아니다. 새 env 변수는 필요 없다.

- `fetchDroughtReports({signal, page, size})`: `size` 파라미터는 유지하되 `page` 파라미터를
  새로 받는다(§3.2 페이지네이션용). 응답은 Spring `Page<DroughtReportListResponse>`
  (`content`/`totalElements`/`totalPages`/`number`/`size` 필드) — `content` 배열을 꺼내 쓰고
  나머지 페이지 메타는 페이지네이션 컨트롤에 그대로 넘긴다.
- `fetchDroughtReportDetail(reportYm, {signal})`: 없는 `reportYm`이면 404 — 기존 article 상세
  조회의 404 처리 패턴(`normalizeArticleDetail` 주변)을 참고해 동일하게 처리한다(상세 페이지에
  "리포트를 찾을 수 없습니다" 안내 + 목록으로 돌아가기).

`articleListItemToDroughtReportSummary`/`articleDetailToDroughtReportDetail`
(그리고 이들이만 쓰는 헬퍼가 있다면 같이) 삭제한다 — **단, `normalizeArticlePage`/
`normalizeArticleDetail`/`PublicArticlePageResponse`/`PublicArticleDetailResponse`는
`/archive` 화면(진짜 article 도메인)이 계속 쓰므로 절대 건드리지 않는다.** 구현 단계에서
`grep`으로 각 함수의 다른 호출부를 먼저 확인하고 삭제한다.

### 4.2 타입 교체

기존 mock 지향 타입(`DroughtReportRegion`, `DroughtReportSummary`, `DroughtReportSource`,
`DroughtReportMentionedRegion`, `DroughtReportImpactField`, `DroughtReportVisualSummary`,
`DroughtReportDetail`, `DroughtReportListResponse`)을 전부 삭제하고, Spring 응답과 1:1로
새로 정의한다:

```ts
export type DroughtImpactBucket = {
  impactCode: string;
  impactName: string;
  grade: "관심" | "주의" | "경계" | "심각";
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
  maxGrade: "관심" | "주의" | "경계" | "심각" | null;
};

export type DroughtReportListItem = {
  reportYm: string;
  headlineGrade: "관심" | "주의" | "경계" | "심각" | null;
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
```

`DroughtReportView`(현재 `typeof reports[number]` — mock 배열에서 타입을 역으로 뽑는 방식)는
이 순환을 끊는다: `toDroughtReportListView(item: DroughtReportListItem)`/
`toDroughtReportDetailView(detail: DroughtReportDetail)` 매핑 함수의 반환 타입으로 새로
정의한다(뷰 전용 필드 — 배지 색 클래스, 등급 근거 문구 조립 등 — 는 이 매핑 함수 안에서 계산).

### 4.3 fallback/mock 데이터 (`lib/mock-data.ts`)

`export const reports = [...]`(452행 파일의 mock 배열)를 §4.2의 새 타입 모양으로 다시 쓴다.
실측 데이터를 예시로 쓴다(백엔드 세션에서 이미 검증됨): `2026-05`, 강원·강릉(A1 물 공급,
심각, 12건 / A3 농업, 경계, 7건), 경남·합천(A5 산업, 경계, 5건). 지어낸 숫자를 새로 만들지
않는다.

## 5. 열려있는 결정 (구현 단계에서 확정)

- 4단계 등급 배지의 정확한 hex 값 — 목업에서 잠정 합의한 값(관심 `#dee9e6`/`#2c574f`, 주의
  `#f6dfc7`/`#87470f`, 경계 `#f6cda9`/`#994a0f`, 심각 `#f3d6d2`/`#8b2a1f`)을 실제 CSS로 옮긴다.
- 페이지네이션 UI 컴포넌트는 기존 `components/archive/Pagination.tsx`를 재사용할지, 리포트
  전용으로 새로 만들지 — 페이지 크기·개념이 다르면(월간호라 총 개수가 적음) 재사용이 오히려
  과할 수 있음. 구현 시 판단.
- `detail`에서 없는 `reportYm`(404) 화면 문구.

## 6. 범위 밖

- 백엔드 API 자체 변경(이미 완료·머지됨).
- `/archive`(자료실) 화면 — 전혀 건드리지 않는다.
- 실제 배포(`infradna.io.kr`) 반영 — 이 저장소의 `main`/`develop` 브랜치 전략을 따라 별도 배포
  절차로 진행.
