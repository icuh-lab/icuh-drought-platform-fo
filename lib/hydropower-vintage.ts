/**
 * 수력발전량의 과거 예측·실측 + 미래 예측 시계열을 만드는 순수 로직 (양파 vintage와 동형).
 *
 * 양파와 달리 하나의 vintage 로그 테이블이 없다 — `dam_monthly_predictions`를 그대로 쓴다.
 * 이 테이블은 시점(vintage)별로 기록된 로그가 아니라 "지금 아는 최신 예측"만 담은 테이블이라,
 * 한 번 지나간 달의 값은 그 뒤로 절대 안 바뀐다(모델이 매달 direct 1~3개월만 예측하므로).
 * 그래서 그대로 전체 이력을 가져다 쓰면 결과적으로 point-in-time 로그와 같아진다 — 단,
 * 2022-01~2024-10 구간만 예외로, 실제 모델 산출물이 아니라 실적 ±80MWh/±40백만㎥ 고정밴드다
 * (CLAUDE.md에 문서화된 사실). `legacyBandUntilDate`로 그 경계를 표시한다.
 */

export type HydropowerPredictionEntry = {
  year: string;
  month: string;
  lowerBound: number | null;
  upperBound: number | null;
};

export type HydropowerActualEntry = {
  year: string;
  month: string;
  actualMwh: number | null;
};

export type HydropowerVintagePoint = {
  date: string;
  actual: number | null;
  predicted: number | null;
};

export type HydropowerVintageSeries = {
  points: HydropowerVintagePoint[];
  /** 실측이 있는 마지막 달. 그 뒤는 예측만 남는다. */
  boundaryDate: string;
  latestActualDate: string | null;
  /** 직전 실측월 대비 변동률(%) */
  delta: number | null;
  current: number | null;
  /** 이 날짜보다 이른 포인트는 고정밴드 구간(모델 예측이 아님). 전 구간이 그 이후면 null. */
  legacyBandUntilDate: string | null;
};

/**
 * `dam_monthly_predictions`의 2022-01~2024-10 행은 실제 모델 산출물이 아니라 실적
 * ±80MWh(발전량)/±40백만㎥(저수량) 고정밴드다. 2024-11부터가 진짜 모델 예측이다.
 * (CLAUDE.md "데이터 의미 주의사항" 참고 — DB 컬럼으로 구분이 안 돼 날짜 기준을 고정값으로 둔다.)
 */
export const HYDROPOWER_LEGACY_BAND_UNTIL = "2024-11-01";

function toMonthDate(year: string, month: string) {
  return `${year}-${month.padStart(2, "0")}-01`;
}

export function buildHydropowerVintageSeries(
  predictions: HydropowerPredictionEntry[],
  actuals: HydropowerActualEntry[]
): HydropowerVintageSeries | null {
  const predicted = new Map<string, number>();
  for (const entry of predictions) {
    if (entry.lowerBound === null || entry.upperBound === null) continue;
    predicted.set(toMonthDate(entry.year, entry.month), (entry.lowerBound + entry.upperBound) / 2);
  }

  const actual = new Map<string, number>();
  for (const entry of actuals) {
    if (entry.actualMwh === null) continue;
    actual.set(toMonthDate(entry.year, entry.month), entry.actualMwh);
  }

  const dates = Array.from(new Set(Array.from(actual.keys()).concat(Array.from(predicted.keys())))).sort();
  if (dates.length === 0) return null;

  const points = dates.map((date) => ({
    date,
    actual: actual.get(date) ?? null,
    predicted: predicted.get(date) ?? null
  }));

  const actualDates = Array.from(actual.keys()).sort();
  const latestActualDate = actualDates.at(-1) ?? null;
  const previousActualDate = actualDates.at(-2) ?? null;
  const current = latestActualDate === null ? null : actual.get(latestActualDate) ?? null;
  const previous = previousActualDate === null ? null : actual.get(previousActualDate) ?? null;
  const delta = current === null || previous === null || previous === 0 ? null : ((current - previous) / previous) * 100;

  const boundaryDate = latestActualDate ?? dates[dates.length - 1];
  const legacyBandUntilDate = dates.some((date) => date < HYDROPOWER_LEGACY_BAND_UNTIL)
    ? HYDROPOWER_LEGACY_BAND_UNTIL
    : null;

  return { points, boundaryDate, latestActualDate, delta, current, legacyBandUntilDate };
}

/**
 * Y축 눈금. 0부터 "보기 좋은" 간격(1/2/5 × 10^n)으로, 대략 4~6개 눈금이 나오게 고른다.
 * 양파는 500원 고정 step이면 충분했지만, 수력발전량은 댐마다 자릿수가 확 달라져(수백~수십만
 * MWh) 고정 step이 안 맞는다 — 그래서 최댓값에 맞춰 매번 다시 고른다.
 */
export function niceAxisStep(maxValue: number, targetTicks = 5) {
  if (maxValue <= 0) return 1;
  const rawStep = maxValue / targetTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

export function niceAxisTicks(maxValue: number, targetTicks = 5) {
  const step = niceAxisStep(maxValue, targetTicks);
  const top = Math.max(Math.ceil(maxValue / step) * step, step);
  const ticks: number[] = [];
  for (let value = 0; value <= top; value += step) ticks.push(value);
  return ticks;
}
