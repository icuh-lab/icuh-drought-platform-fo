/**
 * 배추 overlay 경로가 displayMultiplier 를 실제로 적용하는지 확인한다.
 *
 * 최종 리뷰에서 발견된 버그: 배추의 기반 모델은 원/kg 로 값을 내지만 화면은
 * "원/10kg망" 관행으로 표시한다(PRICE_FORECAST_CONFIG.cabbage.displayMultiplier = 10).
 * 옛 배추 렌더링 경로(toPriceForecastView/toPriceKpiView)는 toDisplayPrice 로 이 배수를
 * 적용했지만, 양파 로직을 일반화해 만든 새 overlay 경로(scaleVintageEntriesForDisplay/
 * scaleMarketTrendForDisplay → buildVintagePriceSeries)는 이 단계를 빠뜨리면 배추 가격이
 * 조용히 10 분의 1로 표시된다. 실 배추 vintage 데이터가 없어 지금까지 드러나지 않았다.
 *
 * fetchOverlayPriceSeries 자체는 네트워크 호출을 하므로, 그 안에서 쓰는 순수 스케일링
 * 단계만 떼어내 직접 검증한다.
 */
import {
  priceForecastDisplayMultiplier,
  scaleMarketTrendForDisplay,
  scaleVintageEntriesForDisplay,
  type PredictionVintageEntry
} from "../lib/api-client";
import { buildVintagePriceSeries, type RawMarketTrendPoint } from "../lib/vintage-price-series";

let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  const ok = a === e;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}\n      got  ${a}\n      want ${e}`);
  if (!ok) failed++;
}
function close(name: string, actual: number | null | undefined, expected: number, tolerance = 0.0001) {
  const ok = actual !== null && actual !== undefined && Math.abs(actual - expected) < tolerance;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got ${actual}, want ~${expected})`);
  if (!ok) failed++;
}

// --- 설정 배수 자체 ---
check("배추 배수는 10", priceForecastDisplayMultiplier("cabbage"), 10);
check("양파 배수는 1", priceForecastDisplayMultiplier("onion"), 1);

// --- 절대값 스케일링 ---
// 실측이 두 날 있어야 delta(전일대비 %)가 null 이 아니게 계산된다.
const entries: PredictionVintageEntry[] = [
  {
    targetDate: "2026-08-24",
    horizonDays: 180,
    source: "reconstructed_forecast",
    modelType: "random_forest",
    modelTrainEndDate: "2026-08-25",
    pred: 1000,
    actual: 990,
    arrivalTon: 55
  },
  {
    targetDate: "2026-08-25",
    horizonDays: 180,
    source: "live",
    modelType: "random_forest",
    modelTrainEndDate: "2026-08-25",
    pred: 1020,
    actual: 1000,
    arrivalTon: 60
  },
  {
    targetDate: "2026-08-26",
    horizonDays: 180,
    source: "live",
    modelType: "random_forest",
    modelTrainEndDate: "2026-08-25",
    pred: 1050,
    actual: null,
    arrivalTon: null
  }
];
const market: RawMarketTrendPoint[] = [
  { trendDate: "2026-08-24", marketVolume: 500, avgWholesalePrice: 990 },
  { trendDate: "2026-08-25", marketVolume: null, avgWholesalePrice: null }
];

const cabbageEntries = scaleVintageEntriesForDisplay(entries, priceForecastDisplayMultiplier("cabbage"));
check("배추 pred 는 10배", cabbageEntries[0].pred, 10000);
check("배추 actual 은 10배", cabbageEntries[0].actual, 9900);
check("배추 actual 이 null 이면 그대로 null", cabbageEntries[2].actual, null);
check("arrivalTon 은 가격이 아니라 그대로 유지", cabbageEntries[0].arrivalTon, 55);

const cabbageMarket = scaleMarketTrendForDisplay(market, priceForecastDisplayMultiplier("cabbage"));
check("배추 avgWholesalePrice 는 10배", cabbageMarket[0].avgWholesalePrice, 9900);
check("null 가격은 스케일해도 null", cabbageMarket[1].avgWholesalePrice, null);
check("marketVolume 은 그대로 유지(null)", cabbageMarket[1].marketVolume, null);

const onionEntries = scaleVintageEntriesForDisplay(entries, priceForecastDisplayMultiplier("onion"));
check("양파는 배수 1 이라 pred 가 그대로", onionEntries[0].pred, 1000);
check("양파는 배수 1 이라 actual 이 그대로", onionEntries[0].actual, 990);

const onionMarket = scaleMarketTrendForDisplay(market, priceForecastDisplayMultiplier("onion"));
check("양파는 배수 1 이라 avgWholesalePrice 가 그대로", onionMarket[0].avgWholesalePrice, 990);

// --- fetchOverlayPriceSeries 가 하는 일을 그대로 재현: 스케일 후 buildVintagePriceSeries ---
const cabbageSeries = buildVintagePriceSeries({ entries: cabbageEntries, market: cabbageMarket });
const onionSeries = buildVintagePriceSeries({ entries: onionEntries, market: onionMarket });
const rawSeries = buildVintagePriceSeries({ entries, market });

check("원본 current(스케일 전)", rawSeries?.current, 1000);
close("배추 current 는 원본의 10배(1000 * 10)", cabbageSeries?.current, 10000);
check("양파 current 는 원본과 동일(배수 1)", onionSeries?.current, rawSeries?.current);

// 비율(delta·errorRate)은 양쪽을 같은 배수로 스케일해도 상쇄돼 원본과 같아야 한다.
close("배추 delta(%) 는 배수와 무관하게 원본과 동일", cabbageSeries?.delta ?? undefined, rawSeries?.delta ?? NaN);
check("양파 delta(%) 는 원본과 동일(배수 1)", onionSeries?.delta, rawSeries?.delta);

console.log(failed === 0 ? "\n모든 검증 통과" : `\n${failed}건 실패`);
process.exit(failed === 0 ? 0 : 1);
