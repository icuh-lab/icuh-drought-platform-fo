/**
 * 합천 양파 도매가격의 실측·예측 시계열을 만드는 순수 로직.
 *
 * 두 엔드포인트를 날짜로 이어 붙인다.
 * - `agrimarket/daily-market` 의 `avgWholesalePrice` 가 실측이다. 2025-12 26건이
 *   vintage 의 `actual` 26건과 전부 일치하는 것을 확인하고 정했다.
 * - `agrimarket/prediction-vintage` 가 예측이다. 과거 구간은 `reconstructed_forecast`,
 *   미래 구간은 `live`.
 *
 * 기준일(모델 학습 종료일) 하나로 과거와 미래가 갈린다. 그 앞은 실측과 예측이 같은
 * 날짜에 겹치고, 뒤는 예측만 남는다. 네트워크는 api-client 가 맡고 여기는 값만 다룬다.
 */

/** onion_prediction_vintage_log 한 행. */
export type RawVintageEntry = {
  targetDate: string;
  horizonDays: number;
  source: string;
  modelType: string | null;
  modelTrainEndDate: string | null;
  pred: number;
  actual: number | null;
  arrivalTon: number | null;
};

/** daily-market 의 하루치. 기준일 이후 행은 실측이 아니라 예측으로 채워져 있다. */
export type RawMarketTrendPoint = {
  trendDate: string;
  marketVolume: number | null;
  avgWholesalePrice: number | null;
};

export type VintagePricePoint = {
  date: string;
  actual: number | null;
  predicted: number | null;
};

export type VintagePriceSeries = {
  points: VintagePricePoint[];
  /** 실측이 끝나고 예측만 남는 경계. 모델 학습 종료일이다. */
  boundaryDate: string;
  /** 겹침 구간에 쓴 리드타임. 미래 구간과 같은 값이어야 선이 한 줄로 읽힌다. */
  horizonDays: number | null;
  current: number | null;
  latestActualDate: string | null;
  /** 직전 실측 대비 변동률(%) */
  delta: number | null;
  /** 겹침 구간의 MAPE(%). horizonDays 리드타임으로만 계산한 값이다. */
  errorRate: number | null;
  overlapDays: number;
  /**
   * 미래선의 리드타임이 더 긴 모델로 넘어가는 첫 날. 단일 리드타임이면 null.
   *
   * errorRate 는 horizonDays 하나로 계산한 값이라 이 날 이후 구간은 설명하지 못한다.
   * 화면에 표시해야 그 숫자가 선 전체를 설명하는 것처럼 읽히지 않는다.
   */
  horizonSwitchDate: string | null;
  /** 전환 후의 리드타임. horizonSwitchDate 가 null 이면 null. */
  horizonSwitchTo: number | null;
};

/**
 * 차트를 열었을 때 보이는 구간. 데이터는 2022년부터 전부 그리고 가로로 스크롤하므로,
 * 이 값은 "표시 범위" 가 아니라 **초기 스크롤 위치**를 정한다.
 *
 * 과거 90일 / 미래 365일 은 onion-wholesale-price-forecast 스펙(2026-08-29 재정의)이
 * 정한 값이다 — 임의로 늘리거나 줄이지 않는다.
 */
export const VINTAGE_VIEW_PAST_DAYS = 90;
export const VINTAGE_VIEW_FUTURE_DAYS = 365;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" 를 일 단위로 옮긴다. UTC 로 계산해 서머타임·시차의 영향을 받지 않는다. */
export function shiftDate(date: string, days: number) {
  const moved = new Date(`${date}T00:00:00Z`).getTime() + days * MS_PER_DAY;
  return new Date(moved).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string) {
  return Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / MS_PER_DAY);
}

/** 창이 걸친 달을 모두 돌려준다. daily-market 이 월 단위 조회라 달마다 한 번씩 불러야 한다. */
export function monthsInWindow(start: string, end: string) {
  const [startYear, startMonth] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);
  const months: { year: number; month: number }[] = [];

  // 0-based 로 내렸다가 되돌려야 연 경계가 자연히 넘어간다.
  for (let index = startYear * 12 + (startMonth - 1); index <= endYear * 12 + (endMonth - 1); index++) {
    months.push({ year: Math.floor(index / 12), month: (index % 12) + 1 });
  }

  return months;
}

/**
 * 실측과 예측이 갈리는 기준일. live 행의 `modelTrainEndDate` 가 그 값이다.
 * 하드코딩하면 모델이 다시 돌 때마다 화면이 어긋나므로 응답에서 뽑는다.
 */
export function vintageBoundaryDate(entries: RawVintageEntry[]) {
  const trainEnd = entries.find((entry) => entry.source === "live" && entry.modelTrainEndDate)?.modelTrainEndDate;
  if (trainEnd) return trainEnd;

  // live 가 아직 없는 응답이면 예측 기록의 마지막 날을 경계로 삼는다.
  const lastTarget = entries.map((entry) => entry.targetDate).sort().at(-1);
  return lastTarget ?? null;
}

/**
 * 미래 구간이 쓰는 가장 짧은 리드타임. 백엔드가 T+1 부터 짧은 모델을, 그 뒤를 긴 모델로
 * 이어 놓기 때문에 창 앞쪽은 전부 이 값이다. 과거 겹침도 같은 값으로 맞춰야 두 구간의
 * 예측선이 같은 성격이 된다.
 */
/**
 * daily-market 으로 채워야 할 달. vintage 에 실측이 한 건도 없는 달만 고른다.
 *
 * 2022년부터의 전 구간을 월별로 부르면 56 회다. 운영 서버는 동시 요청을 몰아치면
 * 넘어간 전력이 있어(2026-08-28) 부를 달을 최소로 줄인다. vintage 의 actual 이
 * 2022~2025 대부분을 이미 덮고 있어서, 실제로 비는 달만 남는다.
 */
export function monthsMissingActual(entries: RawVintageEntry[], start: string, end: string) {
  const covered = new Set(
    entries.filter((entry) => entry.actual !== null).map((entry) => entry.targetDate.slice(0, 7))
  );

  return monthsInWindow(start, end).filter(
    (month) => !covered.has(`${month.year}-${String(month.month).padStart(2, "0")}`)
  );
}

export type YearAccuracy = {
  year: number;
  /** 그 해 겹침 구간의 평균절대백분율오차(%) */
  mape: number;
  sampleDays: number;
};

/**
 * 연도별 예측 정확도. 실측과 예측이 같은 날에 다 있는 날만 센다.
 *
 * 전체를 한 숫자로 뭉치면 2022년처럼 유난히 어려웠던 해가 평균을 끌어올려, 최근 예측선을
 * 얼마나 믿을지 판단할 수 없다. 연도로 나누면 그게 보인다.
 *
 * 다만 예측이 전부 한 모델로 과거를 되짚은 값이라, 연도 차이는 **모델의 발전이 아니라
 * 그 해의 난이도**다. 화면 문구가 이걸 뒤집어 읽지 않게 해야 한다.
 */
export function yearlyAccuracy(points: VintagePricePoint[]): YearAccuracy[] {
  const byYear = new Map<number, number[]>();

  for (const point of points) {
    // 실측이 0 원이면 백분율 오차가 정의되지 않는다.
    if (point.actual === null || point.predicted === null || point.actual === 0) continue;
    const year = Number(point.date.slice(0, 4));
    const errors = byYear.get(year) ?? [];
    errors.push(Math.abs(point.actual - point.predicted) / point.actual);
    byYear.set(year, errors);
  }

  return Array.from(byYear.entries())
    .sort(([left], [right]) => left - right)
    .map(([year, errors]) => ({
      year,
      mape: (errors.reduce((sum, value) => sum + value, 0) / errors.length) * 100,
      sampleDays: errors.length
    }));
}

/** Y축 눈금. 0 원부터 step 원 간격으로, 최댓값을 덮는 데까지. */
export function priceAxisTicks(maxValue: number, step = 500) {
  const top = Math.max(Math.ceil(maxValue / step) * step, step);
  const ticks: number[] = [];
  for (let value = 0; value <= top; value += step) ticks.push(value);
  return ticks;
}

/** X축 눈금. 범위 안에 드는 매월 1일. 일 단위 데이터 위에 월 단위 기준선을 얹는 용도다. */
export function monthTicks(start: string, end: string) {
  const ticks: string[] = [];

  for (const { year, month } of monthsInWindow(start, end)) {
    const first = `${year}-${String(month).padStart(2, "0")}-01`;
    if (first >= start && first <= end) ticks.push(first);
  }

  return ticks;
}

/**
 * 마우스가 가리킨 날짜에 가장 가까운 포인트. toleranceDays 를 넘게 떨어져 있으면 null.
 * 휴장일과 실측 공백이 많아 "그 날짜의 포인트" 를 그대로 찾으면 대개 빈손이 된다.
 */
export function nearestPoint(points: VintagePricePoint[], date: string, toleranceDays = 4) {
  let best: VintagePricePoint | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const point of points) {
    const distance = Math.abs(daysBetween(point.date, date));
    if (distance < bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }

  return bestDistance <= toleranceDays ? best : null;
}

export function nearestHorizon(entries: RawVintageEntry[]) {
  const live = entries.filter((entry) => entry.source === "live");
  if (live.length === 0) return null;
  return Math.min(...live.map((entry) => entry.horizonDays));
}

type BuildOptions = {
  entries: RawVintageEntry[];
  market: RawMarketTrendPoint[];
  /** 기준일에서 뒤로 며칠까지. 안 주면 데이터가 있는 만큼 전부. */
  pastDays?: number | null;
  /** 기준일에서 앞으로 며칠까지. 안 주면 데이터가 있는 만큼 전부. */
  futureDays?: number | null;
  /**
   * 실제로 거래되는 달만 골라 예측선을 그릴 때 쓴다(예: 고랭지배추는 7~10월만
   * 시장이 선다). 실측·예측 둘 다 이 달에 속한 날짜만 남긴다 — 실측도 daily-market
   * 쪽에 어쩌다 비수기 값이 섞여 들어올 수 있어(휴장일 보정 등) 예측만 거르면
   * 실측·예측 구간이 안 맞아 보여 오히려 헷갈린다. 안 주면 모든 달을 그대로
   * 그린다 — 온션처럼 사철 거래되는 품목은 이 옵션이 필요 없다.
   */
  seasonMonths?: number[] | null;
};

export function buildVintagePriceSeries({
  entries,
  market,
  pastDays = null,
  futureDays = null,
  seasonMonths = null
}: BuildOptions): VintagePriceSeries | null {
  const boundaryDate = vintageBoundaryDate(entries);
  if (boundaryDate === null) return null;

  const allDates = entries
    .map((entry) => entry.targetDate)
    .concat(market.map((point) => point.trendDate))
    .sort();
  const start = pastDays === null ? allDates[0] ?? boundaryDate : shiftDate(boundaryDate, -pastDays);
  const end = futureDays === null ? allDates[allDates.length - 1] ?? boundaryDate : shiftDate(boundaryDate, futureDays);
  const horizonDays = nearestHorizon(entries) ?? minReconstructedHorizon(entries);
  const inSeason = (date: string) => seasonMonths === null || seasonMonths.includes(Number(date.slice(5, 7)));

  const predicted = new Map<string, number>();
  for (const entry of entries) {
    if (entry.targetDate < start || entry.targetDate > end) continue;
    if (!inSeason(entry.targetDate)) continue;

    const isPastOverlay =
      entry.targetDate <= boundaryDate && entry.source === "reconstructed_forecast" && entry.horizonDays === horizonDays;
    // 미래 구간은 리드타임을 가리지 않는다. 백엔드가 이미 짧은 모델과 긴 모델을 날짜로
    // 이어 붙여 하루에 한 행만 주기 때문이다.
    const isFuture = entry.targetDate > boundaryDate && entry.source === "live";

    if (isPastOverlay || isFuture) {
      predicted.set(entry.targetDate, entry.pred);
    }
  }

  const actual = new Map<string, number>();
  // vintage 의 actual 이 2022~2025 대부분을 덮는다. daily-market 을 그만큼 덜 불러도 된다.
  for (const entry of entries) {
    if (entry.actual === null) continue;
    if (entry.targetDate < start || entry.targetDate > boundaryDate) continue;
    if (!inSeason(entry.targetDate)) continue;
    actual.set(entry.targetDate, entry.actual);
  }
  // 같은 날짜가 겹치면 daily-market 이 이긴다 — 실측이 갱신되는 쪽이다.
  for (const point of market) {
    // 기준일 뒤의 daily-market 행은 실측이 아니라 같은 모델의 예측값이다. 이걸 실측선으로
    // 그리면 예측을 실측이라고 말하게 된다.
    if (point.trendDate < start || point.trendDate > boundaryDate) continue;
    if (point.avgWholesalePrice === null) continue;
    if (!inSeason(point.trendDate)) continue;
    actual.set(point.trendDate, point.avgWholesalePrice);
  }

  // 예측만 있는 날과 실측만 있는 날이 둘 다 있다. 인덱스로 짝지으면 선이 밀리므로
  // 날짜를 키로 합집합을 만든다.
  const dates = Array.from(new Set(Array.from(actual.keys()).concat(Array.from(predicted.keys())))).sort();
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

  const switchRow = entries
    .filter((entry) => entry.source === "live" && entry.targetDate > boundaryDate && entry.targetDate <= end && entry.horizonDays !== horizonDays)
    .sort((left, right) => left.targetDate.localeCompare(right.targetDate))[0];
  const horizonSwitchDate = switchRow?.targetDate ?? null;
  const horizonSwitchTo = switchRow?.horizonDays ?? null;

  const overlap = dates.filter((date) => actual.has(date) && predicted.has(date));
  const errorRate =
    overlap.length === 0
      ? null
      : (overlap.reduce((sum, date) => sum + Math.abs(actual.get(date)! - predicted.get(date)!) / actual.get(date)!, 0) /
          overlap.length) *
        100;

  return {
    points,
    boundaryDate,
    horizonDays,
    current,
    latestActualDate,
    delta,
    errorRate,
    overlapDays: overlap.length,
    horizonSwitchDate,
    horizonSwitchTo
  };
}

function minReconstructedHorizon(entries: RawVintageEntry[]) {
  const horizons = entries.filter((entry) => entry.source === "reconstructed_forecast").map((entry) => entry.horizonDays);
  return horizons.length === 0 ? null : Math.min(...horizons);
}
