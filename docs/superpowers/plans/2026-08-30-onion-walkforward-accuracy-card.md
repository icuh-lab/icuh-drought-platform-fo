# 양파 "예측 정확도" 카드를 진짜 walk-forward 값으로 교체 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "예측형 지표"(합천 양파) 카드의 "예측 정확도"가 지금은 `reconstructed_forecast`(현재
모델로 과거를 되짚은 in-sample 적합도)로 계산돼 3.7%처럼 낙관적으로 나온다. 방금
모델팀이 진짜 walk-forward 백테스트(매달 그 시점까지의 데이터로만 재학습해 검증)를
운영 DB에 반영했고, 실제 out-of-sample 정확도는 **MAPE 31.7%**(표본 33건, 2022-07~2026-07)로
드러났다. 이 플랜은 카드가 이 진짜 값을 쓰도록 바꾼다.

**먼저 반드시 확인할 긴급 사항**: 방금 운영 `onion_prediction_vintage_log`에
`source='reconstructed_walkforward'`인 행 33건이 새로 생겼다. 프론트의
`isPredictionVintageEntry` 검증(아래 Task 1)이 `source`를 딱 3개 문자열(`live`,
`reconstructed_forecast`, `reconstructed_nowcast_walkforward`)로만 허용하고,
`entries.every(...)`로 배열 전체를 검증한다 — 즉 **새 source 값이 섞인 응답은 지금
당장부터 프론트에서 전체가 무효 처리될 수 있다.** 카드 디자인을 바꾸는 것과 별개로
Task 1은 최우선으로 처리해야 한다.

**Architecture:** 시각적 겹침 차트("실측 vs 예측" 선)는 그대로 `reconstructed_forecast`를
쓴다(일 단위로 촘촘해서 선이 매끄럽다 — walk-forward는 월 단위 33건뿐이라 선으로 그리면
너무 성글다). **"예측 정확도" 통계 카드만** 별도로 `reconstructed_walkforward` 데이터를
직접 집계해서 교체한다. `reconstructed_walkforward` 데이터가 없는 품목(고랭지배추 등)은
기존 in-sample 계산으로 자동 폴백한다 — 아직 그쪽엔 walk-forward를 안 돌렸다.

**Tech Stack:** TypeScript, `npx tsx` 순수 로직 테스트

**Spec:** 없음 — 대화에서 스코프 확정. 참고: 모델 리포
`onion-wholesale-price-forecast/docs/superpowers/plans/2026-08-30-forecast-walkforward-backtest.md`
(walk-forward 백테스트 자체의 설계·검증 내역).

## Global Constraints

- 시각적 겹침 차트(`isPastOverlay` 판정, `predicted` 맵)는 이 플랜에서 건드리지 않는다 —
  계속 `reconstructed_forecast`를 쓴다.
- `reconstructed_walkforward` 표본이 없는 경우(다른 품목, 또는 아직 데이터가 없는 지역) 반드시
  기존 in-sample 계산(`yearlyAccuracy`)으로 조용히 폴백한다 — 에러를 던지거나 카드가
  비어버리면 안 된다.
- 연도별로 안 쪼갠다 — 표본이 33건뿐이라 연도로 나누면 연도당 6~12건이라 통계적으로
  의미가 약하다. 전체 33건을 하나의 MAPE로 보여준다(모델 리포에서 이미 이렇게 계산해
  확인함: MAE 330.7원/kg, MAPE 31.7%).

---

### Task 1(긴급): `PredictionVintageSource` 타입에 새 source 값 추가

**Files:**
- Modify: `lib/api-client.ts` (라인 103 근처 `PredictionVintageSource` 타입,
  라인 1202 근처 `isPredictionVintageEntry` 검증)

**Interfaces:**
- Produces: `PredictionVintageSource`가 `"reconstructed_walkforward"`도 허용

- [x] **Step 1: 타입과 검증 함수 수정**

(구현 중 확인: `isApiPredictionVintageResponse`/`isPredictionVintageEntry` 검증 체인은
코드 어디서도 호출되지 않는 죽은 코드였다 — `fetchPredictionVintage`는
`getOpenApiData`를 거치는데, 이 함수는 `result === "SUCCESS"`만 확인하고 per-entry
검증은 하지 않는다. 즉 이 Step은 "지금 당장 응답이 무효 처리되고 있다"를 고치는 게
아니라 타입 정확성을 위한 것이었다 — 여전히 해야 할 일은 맞지만 위 "긴급" 표현은
부정확했다.)

`lib/api-client.ts:103`:

```typescript
export type PredictionVintageSource = "live" | "reconstructed_forecast" | "reconstructed_nowcast_walkforward";
```

를:

```typescript
export type PredictionVintageSource =
  | "live"
  | "reconstructed_forecast"
  | "reconstructed_nowcast_walkforward"
  | "reconstructed_walkforward";
```

`lib/api-client.ts:1202`:

```typescript
(value.source === "live" || value.source === "reconstructed_forecast" || value.source === "reconstructed_nowcast_walkforward") &&
```

를:

```typescript
(value.source === "live" || value.source === "reconstructed_forecast" || value.source === "reconstructed_nowcast_walkforward" || value.source === "reconstructed_walkforward") &&
```

- [~] **Step 2: 로컬에서 실제 API로 확인** — 시도했으나 차단됨(아래 "구현 결과" 참고)

- [x] **Step 3: 커밋** — Task 1(타입)과 Task 3(카드 배선)을 한 커밋으로 합쳐서 처리함
  (`b327096`, 아래 "구현 결과" 참고)

---

### Task 2: walk-forward 기반 정확도 집계 함수 추가 (순수 로직, TDD)

**Files:**
- Modify: `lib/vintage-price-series.ts`
- Test: 이 저장소의 `.test.mts` 관례를 따르는 기존 테스트 파일에 추가(예:
  `scripts/onion-price.test.mts` 또는 이 파일을 다루는 현재 테스트 파일 — 저장소에서
  `vintage-price-series`를 테스트하는 기존 파일을 먼저 찾아 그 옆에 추가할 것)

**Interfaces:**
- Consumes: `RawVintageEntry[]`(기존 타입, 변경 없음)
- Produces: `walkforwardAccuracy(entries: RawVintageEntry[]) -> { mape: number; sampleCount: number } | null`
  — `actual`이 있는 `source === "reconstructed_walkforward"` 행만 모아 전체 MAPE 하나로
  집계. 표본이 0건이면 `null`.

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
const WALKFORWARD_ENTRIES: RawVintageEntry[] = [
  { targetDate: "2022-07-30", horizonDays: 180, source: "reconstructed_walkforward", modelType: "random_forest", modelTrainEndDate: "2022-01-31", pred: 1000, actual: 1100, arrivalTon: null },
  { targetDate: "2022-08-31", horizonDays: 180, source: "reconstructed_walkforward", modelType: "random_forest", modelTrainEndDate: "2022-02-28", pred: 900, actual: 1000, arrivalTon: null },
  // 다른 source 는 섞여 있어도 무시해야 한다
  { targetDate: "2022-07-30", horizonDays: 180, source: "reconstructed_forecast", modelType: "random_forest", modelTrainEndDate: "2026-08-25", pred: 1, actual: 1, arrivalTon: null },
];

check("walk-forward 행만 골라 전체 MAPE 계산", walkforwardAccuracy(WALKFORWARD_ENTRIES), {
  // (100/1100 + 100/1000) / 2 * 100 = (9.0909...+10)/2 = 9.545...
  mape: 9.545454545454545,
  sampleCount: 2
});

check("walk-forward 표본이 없으면 null", walkforwardAccuracy([
  { targetDate: "2022-07-30", horizonDays: 180, source: "reconstructed_forecast", modelType: null, modelTrainEndDate: null, pred: 1, actual: 1, arrivalTon: null }
]), null);
```

(반환 객체 비교라 `checkJson`류의 깊은 비교 헬퍼를 쓸 것 — 이 테스트 파일에 이미
있는 관례를 따른다.)

- [x] **Step 2: 테스트 실패 확인**

Run: `npx tsx <해당 테스트 파일>`
Expected: FAIL — `walkforwardAccuracy` 없음
(확인됨 — `SyntaxError: ... does not provide an export named 'walkforwardAccuracy'`)

- [x] **Step 3: 구현**

`lib/vintage-price-series.ts`에 `yearlyAccuracy` 함수 근처에 추가:

```typescript
/**
 * walk-forward(진짜 out-of-sample) 표본만 모아 전체 MAPE 하나로 집계한다.
 * 연도로 안 나누는 이유: 표본이 몇십 건뿐이라 연도로 쪼개면 연도당 표본이
 * 너무 적어 통계적으로 의미가 약하다.
 */
export function walkforwardAccuracy(entries: RawVintageEntry[]): { mape: number; sampleCount: number } | null {
  const errors: number[] = [];
  for (const entry of entries) {
    if (entry.source !== "reconstructed_walkforward") continue;
    if (entry.actual === null || entry.actual === 0) continue;
    errors.push(Math.abs(entry.actual - entry.pred) / entry.actual);
  }
  if (errors.length === 0) return null;
  return {
    mape: (errors.reduce((sum, value) => sum + value, 0) / errors.length) * 100,
    sampleCount: errors.length
  };
}
```

- [x] **Step 4: 테스트 통과 확인 및 커밋**

구현은 계획과 완전히 동일하되, 테스트의 기대값 `9.545454545454545`는
`9.545454545454547`로 수정했다 — 로직 오류가 아니라 부동소수점 표현의 마지막 자리
차이(수기로 계산한 기대값과 JS가 실제로 계산하는 값의 차이)임을 직접 확인함.

```bash
git add lib/vintage-price-series.ts scripts/vintage-price-series.test.mts
git commit -m "feat: walk-forward 표본 기반 전체 MAPE 집계 함수 추가"
```

커밋됨: `11fc70d`

---

### Task 3: "예측 정확도" 카드가 walk-forward 값을 쓰도록 배선 (없으면 기존 방식 폴백)

**Files:**
- Modify: `lib/api-client.ts` (`toOverlayForecastView`, 라인 612 근처)

**Interfaces:**
- Consumes: `walkforwardAccuracy`(Task 2), 기존 `yearlyAccuracy`(변경 없음, 폴백용으로 유지)

- [x] **Step 1: `toOverlayForecastView` 수정**

`lib/api-client.ts:612-651`의 `toOverlayForecastView` 안에서, `const years =
yearlyAccuracy(series.points);` 다음 줄에 walk-forward 계산을 추가하고, `error`/`errorNote`/`note`
구성을 walk-forward 결과 유무로 분기한다:

```typescript
export function toOverlayForecastView(key: PriceForecastKey, series: VintagePriceSeries, entries: PredictionVintageEntry[]): OverlayForecastView | null {
  if (series.points.length === 0) {
    return null;
  }

  const config = PRICE_FORECAST_CONFIG[key];
  const years = yearlyAccuracy(series.points);
  const latestYear = years.at(-1) ?? null;
  const walkforward = walkforwardAccuracy(entries);
  const dated = series.latestActualDate ?? series.boundaryDate;
  const change = series.delta === null ? "" : ` · 전일대비 ${formatSignedPercent(series.delta)}`;

  return {
    label: config.label,
    current: series.current === null ? "–" : formatWholeNumber(series.current),
    unit: config.displayUnit,
    error: walkforward !== null
      ? `${walkforward.mape.toFixed(1)}%`
      : latestYear === null ? "N/A" : `${latestYear.mape.toFixed(1)}%`,
    errorNote: walkforward !== null
      ? `실제 재학습 기반 검증(out-of-sample) · 표본 ${walkforward.sampleCount}건`
      : latestYear === null
        ? "실측과 겹치는 구간 없음"
        : `${latestYear.year}년 평균 오차율 · 표본 ${latestYear.sampleDays}일`,
    source: `open-api /api/v1/agrimarket/daily-market · prediction-vintage (${config.regionName})`,
    sub: `${config.regionName} 출하 물량 기준 · ${dated}${change}`,
    note: [
      `실측은 ${series.boundaryDate}까지 · 그 뒤는 예측만`,
      walkforward !== null
        ? null  // 진짜 out-of-sample 이라 "그 해의 난이도" 캐비어트가 필요 없다
        : `과거 예측선은 현재 모델(${series.boundaryDate} 학습)로 되짚은 재구성 예측이라, 연도별 차이는 모델의 발전이 아니라 그 해의 난이도다`,
      series.horizonSwitchDate === null
        ? null
        : `${series.horizonSwitchDate}부터는 리드타임 ${series.horizonSwitchTo}일 모델이라 위 오차율 범위 밖`
    ].filter(Boolean).join(" · "),
    years,
    points: series.points,
    boundaryDate: series.boundaryDate,
    horizonSwitchDate: series.horizonSwitchDate,
    latestActualDate: series.latestActualDate
  };
}
```

(시그니처에 `entries: PredictionVintageEntry[]` 매개변수를 추가했다 — 호출부에서 이미
갖고 있는 원본 vintage 엔트리 배열을 그대로 넘기면 된다. 정확한 호출부 위치는
`toOverlayForecastView(`로 grep해서 확인하고, 그 자리에서 쓰고 있는 변수명에 맞춰
인자를 추가할 것.)

- [x] **Step 2: `toOverlayKpiView`도 동일하게(선택)** — 안 함(의도적)

`kpi.error` 필드를 렌더링하는 곳이 코드베이스 전체에 실제로 없음을 확인함
(`app/page.tsx`의 KPI 타일 JSX는 tag/name/region/value/unit/delta/sparkline만
그리고 `error`는 안 씀). 화면에 안 보이는 값을 바꿔봤자 사용자 관점에서 아무 차이가
없어 YAGNI로 스킵함 — 나중에 이 필드를 실제로 쓰는 곳이 생기면 그때 같이 맞추면 된다.

- [x] **Step 3: 호출부 업데이트**

`app/page.tsx`의 양파(`"onion"`)·고랭지배추(`"cabbage"`) 두 호출부 모두
`response.entries`를 세 번째 인자로 넘기도록 수정함.

- [~] **Step 4: 로컬에서 실제 확인** — 차단됨(아래 "구현 결과" 참고)

- [x] **Step 5: 커밋** — Task 1과 합쳐서 처리함(아래 "구현 결과" 참고)

## 구현 결과 (2026-08-31)

Task 1~3 전부 코드는 계획대로 구현·커밋 완료:
- `11fc70d` — Task 2(`walkforwardAccuracy` 순수 함수 + 테스트)
- `b327096` — Task 1(source 타입 추가) + Task 3(카드 배선)을 한 커밋으로 합침
  (같은 파일 `lib/api-client.ts`의 인접한 변경이라 분리 커밋의 실익이 없어서
  하나로 묶음, `app/page.tsx` 호출부 수정 포함)

**검증**: 순수 로직 TDD 테스트(`npx tsx scripts/vintage-price-series.test.mts`) 전체
통과, 저장소 전체 `npx tsc --noEmit` 0 에러, 다른 9개 `.test.mts` 스크립트 전부
회귀 없이 통과 확인.

**후속 수정(2026-08-31, 같은 날)**: push 후 사용자가 스크린샷으로 확인한 결과,
헤드라인(31.7%, 전체 33건 풀링)과 아래 연도별 스트립(이 플랜이 손대지 않고 남겨둔
기존 in-sample 값 8.9/4.4/4.0/3.4/3.7)이 서로 다른 계산이라 화면에서 앞뒤가 안
맞는 문제를 지적함. 사용자 결정(연도별 통일이 헤드라인도 바뀌는 옵션 vs 헤드라인
유지 옵션 중 질문해서 확인): **헤드라인도 연도별 walk-forward 기준으로 통일**하기로
함 — `walkforwardAccuracy`(전체 풀링, `{mape, sampleCount}`)를 제거하고
`walkforwardYearlyAccuracy`(연도별, `yearlyAccuracy`와 같은 `YearAccuracy[]` 모양)로
교체, 헤드라인·errorNote·연도별 스트립 전부 walk-forward의 "최근 연도" 기준으로
통일. errorNote는 기존 in-sample 폴백과 같은 "N년 평균 오차율" 형식으로 바뀌고
표본 단위만 일→건으로 구분. 실제 계산해보니 연도별 편차가 커서(2022~2026 각각
약 37.8/40.4/9.0/29.4/54.2%) 헤드라인이 31.7%에서 2026년 값(약 54%대)으로
바뀜 — 이건 표본이 연도당 6~10건뿐이라 원래 변동폭이 크다는 뜻이지 계산이 틀린
게 아니다. 커밋 `9788b21`.

**Step 2/Step 4(로컬 브라우저에서 실제 31.7% 확인)는 못 했다** — 이미 포트 8099에
떠 있던 로컬 백엔드(`icuh-drought-open-api`, 다른 세션이 띄워둔 것으로 추정)가
이 작업과 무관한 `daily-market` 등 기존 엔드포인트에서도 전부 E500을 내고 있어서다.
로컬 MySQL(Docker `drought-impact-platform-mysql`, 3307)에 자격증명 없이 접속 시도한
것 외에는 인프라를 더 건드리지 않았다(다른 세션이 쓰고 있을 가능성이 높아서). 코드
자체는 순수 로직이라 TDD+타입체크로 커버되지만, "화면에 실제로 31.7%가 뜨는지"는
사용자가 그 백엔드 문제를 해결한 뒤(또는 다른 로컬 인스턴스로) 직접 확인이 필요하다.

## 후속 과제 (이번 스펙 스코프 밖)

- 고랭지배추·수력발전량에도 같은 walk-forward 백테스트를 돌리면 이 카드가 자동으로
  그쪽에도 진짜 값을 쓰게 된다(폴백 설계 덕분에 코드 변경 없이 데이터만 채우면 됨).
- 표본이 33건뿐이라 신뢰구간이 넓다 — walk-forward를 주기적으로(매달) 계속 쌓으면
  표본이 늘어나 숫자가 더 안정된다. 모델 쪽에서 이 스크립트를 정기 실행하는 걸
  cron에 넣을지는 별도 결정 필요.
