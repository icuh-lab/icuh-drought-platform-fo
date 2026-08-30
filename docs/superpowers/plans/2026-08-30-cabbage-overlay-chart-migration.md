# 고랭지배추 예측형 지표 Overlay 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 고랭지배추 "예측형 지표" 탭을 양파와 같은 실측·예측 겹쳐그리기(overlay) 방식으로
전환한다 — 최근 90일 실측 + 향후 365일 forecast(h180/365 병합), 가짜 신뢰구간 제거, 정확도
카드는 vintage 로그 h180 MAE 재사용.

**Architecture:** 양파의 `lib/onion-price.ts`(순수 로직)와 `components/charts.tsx`의
`OverlayForecastChart`는 이미 크롭에 종속적이지 않다 — 실제로 "onion"을 하드코딩하는 곳은
타입·상수·함수 **이름**뿐이고 로직 자체는 `RawVintageEntry[]`/`RawMarketTrendPoint[]`라는
범용 입력만 다룬다(2026-08-30 세션에서 전체 파일 직접 확인). 그래서 이번 작업은 새 컴포넌트를
만드는 게 아니라: (1) 이름만 크롭 중립적으로 바꾸고, (2) `lib/api-client.ts`의 얇은 fetch/변환
레이어를 `PriceForecastKey` 파라미터를 받는 형태로 일반화하고, (3) `app/page.tsx`에서 배추를
양파와 똑같은 "전용 상태 변수 + 전용 렌더 분기" 패턴으로 옮기면서 배추 전용이던 옛
`daily-price` 기반 코드(이제 아무도 안 씀)를 걷어낸다.

**Tech Stack:** TypeScript, Next.js 14 App Router, React.

**Spec:** [docs/superpowers/specs/2026-08-30-cabbage-forecast-indicator-redefinition-design.md](../../../../workspace_model/highland-cabbage-market-forecast/docs/superpowers/specs/2026-08-30-cabbage-forecast-indicator-redefinition-design.md)
(모델 저장소 `highland-cabbage-market-forecast`에 위치 — 이 프론트 플랜은 그 스펙의 "필요한
프론트 변경" §를 구현한다)
**선행 플랜(모델 쪽):** `highland-cabbage-market-forecast/docs/superpowers/plans/2026-08-30-cabbage-prediction-vintage-log.md`
— 이 플랜의 Task 2·3은 `GET /api/v1/agrimarket/prediction-vintage?location=강릉`이 배추
행을 반환해야 의미 있게 검증된다. 코드 자체(타입체크·빌드·기존 테스트)는 그 없이도 정상
동작하지만, **Task 3 Step 마지막의 브라우저 수동 확인은 모델 쪽 플랜이 운영에 반영된 뒤로
미룰 것.**

## Global Constraints

- 온션(`forecast === "onion"`) 탭의 기존 렌더 결과·API 호출을 바꾸지 않는다 — 이름만 바뀌는
  공유 함수는 동작이 100% 동일해야 한다(스펙 "필요한 프론트 변경" §).
- 새 컴포넌트를 만들지 않는다 — `OverlayForecastChart`/`lib/onion-price.ts`를 재사용·일반화만
  한다(스펙 §).
- 화면 노출은 강릉만 — 대관령을 이 플랜에서 화면에 추가하지 않는다(스펙 "후속 과제" §).
- 95% 신뢰구간 밴드는 배추에서 완전히 제거한다(점 예측선만) — display-fixes 플랜이 만든
  "band가 0이 아니면만 표시" 조건부 로직 자체가 이번에 함께 제거된다(스펙 "재정의된 설계 ·
  신뢰구간" §).
- 정확도 카드는 새 계산을 만들지 않는다 — vintage 로그의 h180 MAE(연도별 `yearlyAccuracy`)를
  그대로 재사용한다(스펙 §).

---

### Task 1: `lib/onion-price.ts` → `lib/vintage-price-series.ts` 이름 일반화

**Files:**
- Rename: `lib/onion-price.ts` → `lib/vintage-price-series.ts`
- Rename: `scripts/onion-price.test.mts` → `scripts/vintage-price-series.test.mts`
- Modify: `components/charts.tsx:4-13` (import 문)
- Modify: `lib/api-client.ts:19-28` (import 문)

**Interfaces:**
- Consumes: 없음(순수 이름 변경, 로직 무변경).
- Produces: `VintagePricePoint`(구 `OnionPricePoint`), `VintagePriceSeries`(구 `OnionPriceSeries`),
  `VINTAGE_VIEW_PAST_DAYS`/`VINTAGE_VIEW_FUTURE_DAYS`(구 `ONION_VIEW_PAST_DAYS`/`ONION_VIEW_FUTURE_DAYS`),
  `buildVintagePriceSeries`(구 `buildOnionPriceSeries`) — Task 2·3이 이 새 이름을 그대로 쓴다.
  `RawVintageEntry`/`RawMarketTrendPoint`/`shiftDate`/`daysBetween`/`monthsInWindow`/
  `vintageBoundaryDate`/`monthsMissingActual`/`YearAccuracy`/`yearlyAccuracy`/`priceAxisTicks`/
  `monthTicks`/`nearestPoint`/`nearestHorizon`은 이미 크롭 중립적 이름이라 그대로 유지.

이 태스크는 **순수 기계적 이름 변경**이다 — 로직이 안 바뀌므로 실패하는 테스트를 먼저 쓰는
일반적인 TDD RED 단계가 성립하지 않는다. 대신 "이름 변경 전후로 같은 테스트가 계속
통과한다"가 검증 기준이다.

- [ ] **Step 1: 파일·식별자 일괄 변경**

```bash
git mv lib/onion-price.ts lib/vintage-price-series.ts
git mv scripts/onion-price.test.mts scripts/vintage-price-series.test.mts

for f in lib/vintage-price-series.ts scripts/vintage-price-series.test.mts components/charts.tsx lib/api-client.ts; do
  sed -i '' \
    -e 's/ONION_VIEW_PAST_DAYS/VINTAGE_VIEW_PAST_DAYS/g' \
    -e 's/ONION_VIEW_FUTURE_DAYS/VINTAGE_VIEW_FUTURE_DAYS/g' \
    -e 's/OnionPricePoint/VintagePricePoint/g' \
    -e 's/OnionPriceSeries/VintagePriceSeries/g' \
    -e 's/buildOnionPriceSeries/buildVintagePriceSeries/g' \
    "$f"
done

sed -i '' 's#@/lib/onion-price#@/lib/vintage-price-series#' components/charts.tsx lib/api-client.ts
sed -i '' 's#\.\./lib/onion-price#../lib/vintage-price-series#' scripts/vintage-price-series.test.mts
```

(macOS `sed -i ''` 문법 — 이 저장소가 macOS 환경임을 이번 세션에서 확인함. 다른 OS라면
`sed -i` 뒤 빈 따옴표를 뺀다.)

- [ ] **Step 2: 남은 참조 없는지 확인**

```bash
grep -rn "onion-price\|ONION_VIEW_PAST_DAYS\|ONION_VIEW_FUTURE_DAYS\|OnionPricePoint\|OnionPriceSeries\|buildOnionPriceSeries" \
  --include="*.ts" --include="*.tsx" --include="*.mts" . | grep -v node_modules
```

Expected: 출력 없음. 하나라도 남으면 Step 1의 sed 대상 파일 목록에 빠진 파일이 있는 것이니
찾아서 마저 바꾼다.

- [ ] **Step 3: 타입체크 + 이름 바뀐 테스트 실행**

```bash
npx tsc --noEmit
npx tsx scripts/vintage-price-series.test.mts
```

Expected: 둘 다 에러 없음, 테스트 파일의 모든 케이스가 이름 변경 전과 동일하게 PASS(이
파일의 어떤 assertion도 실패로 바뀌면 안 된다 — 실패하면 sed가 함수 본문 내부의 어떤 로직
문자열을 실수로 건드린 것이니 `git diff lib/vintage-price-series.ts`로 원인을 찾는다).

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "refactor: onion-price를 크롭 중립적인 vintage-price-series로 이름 일반화"
```

---

### Task 2: `lib/api-client.ts` — overlay fetch/변환 함수를 크롭 파라미터화

**Files:**
- Modify: `lib/api-client.ts`

**Interfaces:**
- Consumes: Task 1의 `VintagePriceSeries`, `buildVintagePriceSeries`, `vintageBoundaryDate`,
  `monthsMissingActual`, `yearlyAccuracy`, `type YearAccuracy`, `type RawMarketTrendPoint`
  (import 경로만 Task 1에서 이미 바뀜).
- Produces: `type OverlayForecastView`(구 `OnionForecastView`, `label`/`current`/`unit`/`error`/
  `errorNote`/`source`/`sub`/`note`/`years`/`points`/`boundaryDate`/`horizonSwitchDate`/
  `latestActualDate` — 필드는 전부 동일, 이름만 일반화), `fetchOverlayPriceSeries(key: PriceForecastKey, vintage: PredictionVintageResponse, signal?: AbortSignal)`,
  `toOverlayForecastView(key: PriceForecastKey, series: VintagePriceSeries): OverlayForecastView | null`,
  `toOverlayKpiView(key: PriceForecastKey, series: VintagePriceSeries): PriceKpiView | null` — Task 3이
  이 세 함수를 온션·배추 양쪽에서 `key`만 바꿔 호출한다.

`PRICE_FORECAST_CONFIG`에 KPI 카드 이름 필드가 없다 — 지금은 `toOnionKpiView`가
`"양파 도매가격"`을 하드코딩하고 있다(`app/page.tsx`의 `activeKpis`가 찾는 이름과 우연히
일치할 뿐, 설정에서 나온 값이 아니다). 일반화하려면 이 이름도 `key`로 골라야 하므로
`PRICE_FORECAST_CONFIG`에 `kpiName` 필드를 추가한다.

- [ ] **Step 1: `PRICE_FORECAST_CONFIG`에 `kpiName` 추가**

`lib/api-client.ts`의 `PRICE_FORECAST_CONFIG` 타입과 값에 필드를 추가한다(기존 필드는
전부 유지, `kpiName`만 새로 추가):

```typescript
const PRICE_FORECAST_CONFIG: Record<PriceForecastKey, {
  item: PriceForecastItem;
  region: PriceForecastRegion;
  label: string;
  regionName: string;
  source: string;
  displayUnit: string;
  kpiUnit: string;
  displayMultiplier: number;
  location: string;
  kpiName: string;
}> = {
  cabbage: {
    item: "napa-cabbage",
    region: "42150",
    label: "강릉 고랭지배추",
    regionName: "강릉",
    source: "open-api /api/v1/agrimarket/daily-price (강릉)",
    displayUnit: "원 / 10kg망",
    kpiUnit: "원/10kg망",
    displayMultiplier: 10,
    location: process.env.NEXT_PUBLIC_AGRI_CABBAGE_LOCATION ?? "강릉",
    kpiName: "고랭지배추 도매가격"
  },
  onion: {
    item: "onion",
    region: "48890",
    label: "합천 양파",
    regionName: "합천",
    source: "open-api /api/v1/agrimarket/daily-price (합천)",
    displayUnit: "원 / kg",
    kpiUnit: "원/kg",
    displayMultiplier: 1,
    location: process.env.NEXT_PUBLIC_AGRI_ONION_LOCATION ?? "합천",
    kpiName: "양파 도매가격"
  }
};
```

`kpiName` 값은 `app/page.tsx`의 `activeKpis`가 찾는 문자열(`"양파 도매가격"`,
`"고랭지배추 도매가격"`)과 정확히 일치해야 한다 — Task 3에서 그대로 참조한다.

- [ ] **Step 2: `OnionForecastView` → `OverlayForecastView` 이름 변경**

`export type OnionForecastView = { ... }`를 `export type OverlayForecastView = { ... }`로
이름만 바꾼다(필드 내용은 무변경).

- [ ] **Step 3: `fetchOnionPriceSeries` → `fetchOverlayPriceSeries(key, ...)`로 일반화**

```typescript
export async function fetchOverlayPriceSeries(
  key: PriceForecastKey,
  vintage: PredictionVintageResponse,
  signal?: AbortSignal
) {
  const boundaryDate = vintageBoundaryDate(vintage.entries);
  if (boundaryDate === null) {
    return null;
  }

  const location = PRICE_FORECAST_CONFIG[key].location;
  const earliest = vintage.entries.map((entry) => entry.targetDate).sort()[0] ?? boundaryDate;
  const months = monthsMissingActual(vintage.entries, earliest, boundaryDate);
  const trends: RawMarketTrendPoint[] = [];

  for (let index = 0; index < months.length; index += MARKET_FETCH_CONCURRENCY) {
    const batch = await Promise.all(
      months.slice(index, index + MARKET_FETCH_CONCURRENCY).map(async (target) => {
        const search = new URLSearchParams({ year: String(target.year), month: String(target.month), location });
        try {
          const data = await getOpenApiData<OpenAgriDailyMarketResponse>("/api/v1/agrimarket/daily-market", search, signal);
          return data.monthlyTrend;
        } catch (error) {
          if (signal?.aborted) throw error;
          return [];
        }
      })
    );
    trends.push(...batch.flat());
  }

  return buildVintagePriceSeries({ entries: vintage.entries, market: trends });
}
```

(원본과의 유일한 차이: `PRICE_FORECAST_CONFIG.onion.location` → `PRICE_FORECAST_CONFIG[key].location`,
함수명·시그니처에 `key` 추가, `buildOnionPriceSeries` → `buildVintagePriceSeries` 호출로 교체.
그 외 로직·주석은 그대로 둔다.)

기존 `fetchOnionPriceSeries` 함수 정의를 이 코드로 **교체**한다(삭제 후 새로 추가가 아니라
같은 자리에서 바꿔 쓴다 — 아래 호출부가 없어지므로 이름이 겹칠 일은 없다).

- [ ] **Step 4: `toOnionForecastView` → `toOverlayForecastView(key, ...)`로 일반화**

```typescript
export function toOverlayForecastView(key: PriceForecastKey, series: VintagePriceSeries): OverlayForecastView | null {
  if (series.points.length === 0) {
    return null;
  }

  const config = PRICE_FORECAST_CONFIG[key];
  const years = yearlyAccuracy(series.points);
  const latestYear = years.at(-1) ?? null;
  const dated = series.latestActualDate ?? series.boundaryDate;
  const change = series.delta === null ? "" : ` · 전일대비 ${formatSignedPercent(series.delta)}`;

  return {
    label: config.label,
    current: series.current === null ? "–" : formatWholeNumber(series.current),
    unit: config.displayUnit,
    error: latestYear === null ? "N/A" : `${latestYear.mape.toFixed(1)}%`,
    errorNote: latestYear === null
      ? "실측과 겹치는 구간 없음"
      : `${latestYear.year}년 평균 오차율 · 표본 ${latestYear.sampleDays}일`,
    source: `open-api /api/v1/agrimarket/daily-market · prediction-vintage (${config.regionName})`,
    sub: `${config.regionName} 출하 물량 기준 · ${dated}${change}`,
    note: [
      `실측은 ${series.boundaryDate}까지 · 그 뒤는 예측만`,
      `과거 예측선은 현재 모델(${series.boundaryDate} 학습)로 되짚은 재구성 예측이라, 연도별 차이는 모델의 발전이 아니라 그 해의 난이도다`,
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

(원본과의 차이: `PRICE_FORECAST_CONFIG.onion` → `PRICE_FORECAST_CONFIG[key]`, `source` 필드의
`"합천"` 하드코딩 → `${config.regionName}` — 온션으로 호출하면 `regionName`이 이미 `"합천"`이라
동작이 100% 동일하다.)

- [ ] **Step 5: `toOnionKpiView` → `toOverlayKpiView(key, ...)`로 일반화**

```typescript
export function toOverlayKpiView(key: PriceForecastKey, series: VintagePriceSeries): PriceKpiView | null {
  if (series.current === null) {
    return null;
  }

  const config = PRICE_FORECAST_CONFIG[key];
  const latestYearMape = yearlyAccuracy(series.points).at(-1)?.mape ?? null;
  const spark = series.points
    .filter((point) => point.actual !== null)
    .slice(-7)
    .map((point) => point.actual as number);
  const delta = series.delta ?? 0;

  return {
    tag: "예측 · 농산물",
    region: config.regionName,
    name: config.kpiName,
    value: formatWholeNumber(series.current),
    unit: config.kpiUnit,
    delta: formatSignedPercent(delta),
    direction: delta >= 0 ? "up" : "down",
    error: latestYearMape === null ? "N/A" : `${latestYearMape.toFixed(1)}%`,
    spark
  };
}
```

(원본과의 차이: `PRICE_FORECAST_CONFIG.onion` → `PRICE_FORECAST_CONFIG[key]`, `name: "양파 도매가격"`
하드코딩 → `config.kpiName` — 온션 호출 시 Step 1에서 넣은 `kpiName: "양파 도매가격"`과 정확히
같은 문자열이라 동작 동일. `PriceKpiView`의 나머지 필드는 원본 함수가 실제로 반환하던 값을
그대로 옮겼다 — 원본 함수 본문을 다시 열어 `tag`/`region`/`value`/`unit`/`delta`/`direction`/
`error`/`spark` 필드가 정확히 이 순서·이름으로 있는지 대조하고 다르면 원본을 따른다(이 문서는
2026-08-30 세션에서 읽은 스냅숏이라 그 사이 바뀌었을 수 있다).**

- [ ] **Step 6: 타입체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음. 이 시점에는 `app/page.tsx`가 아직 옛 이름(`fetchOnionPriceSeries` 등)을
호출하므로 **에러가 나는 게 정상**이다 — Task 3에서 호출부를 고치기 전까지는 `tsc`가
"찾을 수 없는 이름" 에러를 낸다. 이 에러 메시지에 찍히는 옛 이름 목록이 Task 3에서 고쳐야
할 위치와 정확히 일치하는지 확인하고 넘어간다(즉 이 단계의 "Expected"는 엄밀히는 "이전에
없던 새 에러가, 옛 이름 참조 지점에서만 난다"이다 — 하나라도 다른 원인의 에러가 섞여 있으면
Step 1-5로 돌아가 원인을 고친다).

- [ ] **Step 7: 커밋**

```bash
git add lib/api-client.ts
git commit -m "refactor: overlay fetch/변환 함수를 PriceForecastKey 파라미터로 일반화"
```

---

### Task 3: `app/page.tsx` — 배추를 overlay 경로로 전환, 옛 daily-price 배선 제거

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: Task 2의 `fetchOverlayPriceSeries`, `toOverlayForecastView`, `toOverlayKpiView`,
  `type OverlayForecastView`, `fetchPredictionVintage`, `priceForecastLocation`.
- Produces: 없음(페이지 컴포넌트 최종 소비자).

**왜 `activeForecasts`/`fc`가 전부 없어지는가**: 지금 `fc = activeForecasts[forecast]`는
배추가 옛 `daily-price` 경로를 쓸 때만 필요했다(온션·수력은 이미 각자 전용 변수
`onionForecast`/`hydropowerForecast`를 쓰고 `activeForecasts`는 정적 목업이 채워진 채
탭 라벨에만 쓰인다 — display-fixes 플랜 최종 리뷰에서 확인된 사실). 배추도 전용 변수
(`cabbageForecast`)로 옮기면 세 탭 다 "전용 변수 + 전용 렌더 분기" 패턴이 되어
`activeForecasts`/`fc`/`activeKpis`의 배추 분기/`PriceApiState`/`PriceApiStates`/
`initialPriceApiState`/`priceApis`/`loadPriceForecast`가 전부 죽은 코드가 된다 —
이 태스크에서 함께 걷어낸다(이번 마이그레이션이 만든 죽은 코드이므로 스코프 안).

- [ ] **Step 1: `CabbageApiState` 추가, `PriceApiState`/`PriceApiStates` 제거**

`type PriceApiState = {...}`와 `type PriceApiStates = Record<"cabbage", PriceApiState>;`를
지우고, 그 자리에 `OnionApiState`와 완전히 같은 모양으로 추가한다:

```typescript
type CabbageApiState = {
  status: "loading" | "success" | "empty" | "error";
  forecast: OverlayForecastView | null;
  kpi: PriceKpiView | null;
  latestDate: string | null;
};
```

`const initialPriceApiState: PriceApiState = {...}`도 지우고 같은 자리에:

```typescript
const initialCabbageApiState: CabbageApiState = {
  status: "loading",
  forecast: null,
  kpi: null,
  latestDate: null
};
```

`const [priceApis, setPriceApis] = useState<PriceApiStates>({ cabbage: initialPriceApiState });`를

```typescript
const [cabbageApi, setCabbageApi] = useState<CabbageApiState>(initialCabbageApiState);
```

로 바꾼다(온션 바로 옆, `const [onionApi, setOnionApi] = useState<OnionApiState>(initialOnionApiState);`
줄 위나 아래에 둔다 — 세 상태가 나란히 보이게).

- [ ] **Step 2: 배추 fetch를 온션과 같은 vintage+daily-market 방식으로 교체**

`loadPriceForecast(key)` 함수 전체(=`fetchPriceForecast`/`toPriceForecastView`/
`toPriceKpiView`/`latestPriceForecastDate`를 호출하던 그 함수)와, 그 함수를 호출하던
`loadPriceForecast("cabbage");` 줄을 지운다. 대신 `loadOnion()`이 들어있는 useEffect
(`// vintage 로그는 연/월 필터가 없는 전체 이력이라...`로 시작하는 그 useEffect) 안에,
`loadOnion()`과 나란히 `loadCabbage()`를 추가한다:

```typescript
  useEffect(() => {
    const controller = new AbortController();

    async function loadOnion() {
      // ... 기존 내용 그대로 ...
    }

    async function loadCabbage() {
      let response;
      try {
        response = await fetchPredictionVintage(priceForecastLocation("cabbage"), controller.signal);
      } catch (error) {
        if (controller.signal.aborted) return;
        setCabbageApi({ status: "error", forecast: null, kpi: null, latestDate: null });
        return;
      }

      try {
        const series = await fetchOverlayPriceSeries("cabbage", response, controller.signal);
        const nextForecast = series && toOverlayForecastView("cabbage", series);

        if (!series || !nextForecast) {
          setCabbageApi({ status: "empty", forecast: null, kpi: null, latestDate: null });
          return;
        }

        setCabbageApi({
          status: "success",
          forecast: nextForecast,
          kpi: toOverlayKpiView("cabbage", series),
          latestDate: series.latestActualDate
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setCabbageApi({ status: "error", forecast: null, kpi: null, latestDate: null });
      }
    }

    loadOnion();
    loadCabbage();

    return () => controller.abort();
  }, []);
```

(`loadOnion` 함수 본문은 건드리지 않는다 — 같은 useEffect 안에 `loadCabbage`를 나란히
추가하고 마지막에 `loadCabbage();`만 호출부에 더한다.)

기존 `[period]`-의존 useEffect 안의 `loadPriceForecast("cabbage");` 호출 줄만 지운다
(`loadHydropowerForecast();` 호출은 그대로 둔다 — 수력은 그 useEffect에 남는다, 배추만
period-무관한 vintage 방식으로 옮겨가는 것이라 이 차이는 의도된 것이다. 이유: 온션도 이미
같은 이유로 이 useEffect 밖에 있다 — 위 "vintage 로그는 연/월 필터가 없는 전체 이력" 주석
참고).

- [ ] **Step 3: `activeForecasts`/`fc`/`priceStatuses.cabbage`/`activeKpis` 배추 분기 정리**

`activeForecasts`의 `cabbage: priceApis.cabbage.forecast` 줄을 지운다 — 이제 `activeForecasts`는
`...forecasts`(정적 스프레드)만 남는다:

```typescript
  const activeForecasts = useMemo(() => forecasts, []);
```

(온션·수력은 원래도 `activeForecasts`를 안 쓰고 자기 전용 변수를 쓰므로, 남은 유일한
소비자는 탭 라벨의 `activeForecasts[key].label`뿐이다 — Step 5에서 그 자리도 정리한다.
`useMemo`를 완전히 없애고 그냥 `const activeForecasts = forecasts;`로 바꿔도 되지만, 기존
호출부 형태를 최소로만 건드리기 위해 `useMemo` 껍데기는 남긴다.)

`activeKpis`의 `if (kpi.name === "고랭지배추 도매가격") return priceApis.cabbage.kpi ?? kpi;`를

```typescript
      if (kpi.name === "고랭지배추 도매가격") return cabbageApi.kpi ?? kpi;
```

로 바꾸고, `useMemo`의 의존성 배열에서 `priceApis`를 `cabbageApi`로 바꾼다(`[priceApis, onionApi, hydropowerApi, freshFoodApi]`
→ `[cabbageApi, onionApi, hydropowerApi, freshFoodApi]`).

`const fc = activeForecasts[forecast];` 줄을 지운다.

`priceStatuses`의 `cabbage: priceStatusText(priceApis.cabbage)`를 `cabbage: apiStatusText(cabbageApi)`로
바꾼다(`priceStatusText`는 "· 목업 표시" 문구를 내는 함수인데 배추가 더 이상 목업을 안 쓰므로
온션이 쓰는 `apiStatusText`—순수 "API 갱신 …"/"확인 중"/"없음"/"오류"만 내는 함수—로 갈아탄다).
이 시점에 `priceStatusText` 함수 자체가 다른 호출부 없이 죽은 코드가 되면 Step 6에서 지운다.

`const cabbageForecast = cabbageApi.forecast;`를 `const onionForecast = onionApi.forecast;` 바로
아래에 추가한다.

- [ ] **Step 4: 렌더 트리를 3-way(onion/hydro/cabbage) 패턴으로 통일**

"예측형 지표" 카드 안의 모든 `forecast === "onion" ? X : forecast === "hydro" ? Y : fc.Z` 형태
삼항연산을 `forecast === "onion" ? X : forecast === "hydro" ? Y : cabbageForecast?.Z ?? 기본값`
형태로 바꾼다. 구체적으로 다음 6곳(display-fixes 플랜의 최종 리뷰가 정리해 둔 정확한
위치·현재 코드):

1. **chart-val/chart-sub**(현재 `fc?.current ?? "–"`/`fc?.unit ?? "원 / 10kg망"`/`fc?.sub ?? ""`
   부분을 각각 `cabbageForecast?.current ?? "–"`/`cabbageForecast?.unit ?? "원 / 10kg망"`/
   `cabbageForecast?.sub ?? ""`로).
2. **accuracy**(`fc?.error ?? "N/A"` → `cabbageForecast?.error ?? "N/A"`, `"최근 30일 평균 오차율"`
   문구는 이제 부정확하다 — `OverlayForecastView`에는 `errorNote` 필드가 있으므로 온션처럼
   `cabbageForecast?.errorNote ?? "실측 대기"`로 바꾼다). 온션 전용이던 `accuracy-years`(연도별
   칩) 블록을 배추도 쓰게 하려면 non-null assertion을 쓰는 삼항연산 대신, `forecast`/
   `onionForecast`/`cabbageForecast`가 이미 선언된 자리(Step 3에서 `const cabbageForecast = cabbageApi.forecast;`를
   추가한 바로 아래) 근처에 파생 변수를 하나 추가한다:

   ```typescript
   const overlayYears = forecast === "onion" ? onionForecast?.years : forecast === "cabbage" ? cabbageForecast?.years : undefined;
   ```

   그다음 `accuracy-years` 블록을 다음으로 바꾼다(둘 다 `OverlayForecastView`라 `years` 필드가
   같은 모양이므로 이 확장이 안전하다):

   ```jsx
   {overlayYears && overlayYears.length > 1 && (
     <div className="accuracy-years">
       {overlayYears.map((year) => (
         <span key={year.year} title={`${year.year}년 · 표본 ${year.sampleDays}일`}>
           <i>{String(year.year).slice(2)}</i>{year.mape.toFixed(1)}
         </span>
       ))}
     </div>
   )}
   ```
3. **ForecastChart 렌더**(`fc && <ForecastChart .../>` 분기 전체를 지우고, 대신 `forecast === "onion"`
   분기와 완전히 같은 모양으로 `forecast === "cabbage"` 분기를 추가):
   ```jsx
   {forecast === "onion" ? (
     onionForecast && <OverlayForecastChart points={onionForecast.points} boundaryDate={onionForecast.boundaryDate} horizonSwitchDate={onionForecast.horizonSwitchDate} />
   ) : forecast === "hydro" ? (
     hydropowerForecast && <ForecastChart actual={hydropowerForecast.actual} predicted={hydropowerForecast.predicted} band={hydropowerForecast.band} unit={hydropowerForecast.unit} periodLabel="개월" />
   ) : (
     cabbageForecast && <OverlayForecastChart points={cabbageForecast.points} boundaryDate={cabbageForecast.boundaryDate} horizonSwitchDate={cabbageForecast.horizonSwitchDate} />
   )}
   ```
4. **신뢰구간 범례**(`forecast !== "onion" && (forecast !== "hydro" || ...) && (forecast !== "cabbage" || fc?.band?.some(...)) && (...)` 조건
   전체를 `forecast === "hydro" && (hydropowerForecast?.band.length ?? 0) > 0 && (<span>...예측구간(q10–q90)...</span>)`로
   단순화한다 — 배추는 이제 밴드 자체를 안 그리므로(overlay 차트는 band prop이 없다)
   `forecast === "cabbage"`일 때 이 조건은 항상 거짓이어야 하고, `forecast === "onion"`일 때도
   원래부터 거짓이었다. 이 단순화 후 "온션은 원래도 거짓" 성질이 유지되는지 눈으로 다시
   확인한다(온션은 `OverlayForecastChart`를 쓰고 `hydropowerForecast`가 아니므로 두 번째
   `&&` 항이 `forecast !== "hydro"`→참, `(hydropowerForecast?.band...)` 는 평가 안 됨 →
   전체가 거짓 — 지금 조건과 결과가 같다).
5. **data-note**(`{forecast === "cabbage" && priceApis.cabbage.status !== "success" && <div className="data-note">{priceStatuses.cabbage}</div>}`를
   `{forecast === "cabbage" && cabbageApi.status !== "success" && <div className="data-note">{priceStatuses.cabbage}</div>}`로).
   이어서 온션 전용이던 `{forecast === "onion" && onionForecast && <div className="data-note">{onionForecast.note}</div>}`
   바로 아래에 배추용을 추가한다: `{forecast === "cabbage" && cabbageForecast && <div className="data-note">{cabbageForecast.note}</div>}`.
6. **source-line**(`fc?.source ?? "open-api /api/v1/agrimarket (강릉)"` → `cabbageForecast?.source ?? "open-api /api/v1/agrimarket/daily-market · prediction-vintage (강릉)"`,
   갱신 날짜 부분의 `priceApis.cabbage.latestDate ?? priceStatuses.cabbage` → `cabbageApi.latestDate ?? priceStatuses.cabbage`).

- [ ] **Step 5: 탭 라벨 정리**

`{activeForecasts[key]?.label ?? forecasts[key].label}`를

```jsx
{key === "onion" ? onionForecast?.label ?? forecasts.onion.label : key === "hydro" ? forecasts.hydro.label : cabbageForecast?.label ?? forecasts.cabbage.label}
```

로 바꾼다(수력은 `hydropowerForecast`에 `.label` 필드가 실제로 쓰이는지 이번 세션에서
확인 안 했으므로, 안전하게 항상 정적 `forecasts.hydro.label`을 쓴다 — 지금 동작과 동일하다,
`activeForecasts.hydro`도 항상 정적 `forecasts.hydro`였으므로 변화 없음).

- [ ] **Step 6: 죽은 코드 제거**

`lib/api-client.ts`에서 `grep -n "fetchPriceForecast\|toPriceForecastView\|toPriceKpiView\|latestPriceForecastDate"`로
호출부가 없는지 다시 확인한 뒤(Step 2~5에서 `app/page.tsx`가 이 이름들을 더 이상 안 부르게
됐어야 한다), 이 네 함수를 `lib/api-client.ts`에서 삭제한다. `app/page.tsx` 상단 import
목록에서도 이 네 이름 + 이제 안 쓰는 `priceStatusText`(Step 3에서 대체됐다면)를 지운다.

```bash
grep -n "fetchPriceForecast\|toPriceForecastView\|toPriceKpiView\|latestPriceForecastDate\|priceStatusText" app/page.tsx lib/api-client.ts
```

이 grep에서 **정의부(함수 선언) 외에 호출부가 하나도 안 남았을 때만** 삭제를 진행한다.
남아있으면 Step 2~5 중 놓친 자리가 있는 것이니 먼저 그걸 고친다.

**참고(이번 태스크에서 안 건드림, 후속 과제로 남김)**: `PriceForecastView`, `PriceForecastResponse`,
`PriceForecastItem`, `PriceForecastRegion`, `PriceForecastDataType`, `OpenAgriDailyPriceResponse`
타입들은 이 네 함수 삭제 후에도 다른 곳에서 쓰이는지 확인하지 않았다 — 죽었을 수 있지만
이번 플랜 스코프 밖(스코프를 계속 넓히면 "옛 배추 경로 걷어내기"가 "api-client.ts 전체
죽은 타입 청소"로 끝없이 번진다). 필요하면 별도 후속으로 처리한다.

- [ ] **Step 7: 타입체크 + 빌드 + 전체 테스트**

```bash
npx tsc --noEmit
npm run build
for f in scripts/*.test.mts; do npx tsx "$f"; done
```

Expected: 셋 다 에러/실패 없음. `scripts/*.test.mts`에는 Task 1에서 이름을 바꾼
`vintage-price-series.test.mts`가 포함된다.

- [ ] **Step 8: 로컬 브라우저 확인**

```bash
npm run dev
```

`http://localhost:3000/?view=forecast`를 열어 "강릉 고랭지배추" 탭을 클릭한다. 이 시점에는
모델 쪽 vintage 플랜이 아직 운영에 반영 안 됐을 수 있으므로 `GET prediction-vintage?location=강릉`이
404/데이터없음을 낼 가능성이 높다 — 그 경우 화면은 조용히 빈 카드가 아니라
`{cabbageApi.status !== "success" && <div className="data-note">...}`로 "API 오류"/"데이터 없음"
같은 정직한 문구를 보여야 한다(display-fixes 플랜이 지킨 원칙과 동일 — 지어낸 숫자를
보여주면 안 된다). 온션 탭이 지금과 똑같이 동작하는지도 반드시 같이 확인한다(회귀 여부).

모델 쪽 vintage 플랜이 운영에 반영된 뒤에는 이 Step을 다시 실행해 배추 탭에 실측·예측
겹쳐그리기 차트와 정확도 카드가 실제로 뜨는지 확인한다.

- [ ] **Step 9: 커밋**

```bash
git add app/page.tsx
git commit -m "feat: 배추 예측형 지표를 실측·예측 겹쳐그리기(overlay) 방식으로 전환"
```
