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

export type OnionPricePoint = {
  date: string;
  actual: number | null;
  predicted: number | null;
};

export type OnionPriceSeries = {
  points: OnionPricePoint[];
  /** 실측이 끝나고 예측만 남는 경계. 모델 학습 종료일이다. */
  boundaryDate: string;
  /** 겹침 구간에 쓴 리드타임. 미래 구간과 같은 값이어야 선이 한 줄로 읽힌다. */
  horizonDays: number | null;
  current: number | null;
  latestActualDate: string | null;
  /** 직전 실측 대비 변동률(%) */
  delta: number | null;
  /** 겹침 구간의 MAPE(%) */
  errorRate: number | null;
  overlapDays: number;
};

/** 화면에 그리는 창. 기준일 앞뒤로 반년씩. */
export const ONION_PAST_DAYS = 183;
export const ONION_FUTURE_DAYS = 183;

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
export function nearestHorizon(entries: RawVintageEntry[]) {
  const live = entries.filter((entry) => entry.source === "live");
  if (live.length === 0) return null;
  return Math.min(...live.map((entry) => entry.horizonDays));
}

type BuildOptions = {
  entries: RawVintageEntry[];
  market: RawMarketTrendPoint[];
  pastDays?: number;
  futureDays?: number;
};

export function buildOnionPriceSeries({
  entries,
  market,
  pastDays = ONION_PAST_DAYS,
  futureDays = ONION_FUTURE_DAYS
}: BuildOptions): OnionPriceSeries | null {
  const boundaryDate = vintageBoundaryDate(entries);
  if (boundaryDate === null) return null;

  const start = shiftDate(boundaryDate, -pastDays);
  const end = shiftDate(boundaryDate, futureDays);
  const horizonDays = nearestHorizon(entries) ?? minReconstructedHorizon(entries);

  const predicted = new Map<string, number>();
  for (const entry of entries) {
    if (entry.targetDate < start || entry.targetDate > end) continue;

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
  for (const point of market) {
    // 기준일 뒤의 daily-market 행은 실측이 아니라 같은 모델의 예측값이다. 이걸 실측선으로
    // 그리면 예측을 실측이라고 말하게 된다.
    if (point.trendDate < start || point.trendDate > boundaryDate) continue;
    if (point.avgWholesalePrice === null) continue;
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
    overlapDays: overlap.length
  };
}

function minReconstructedHorizon(entries: RawVintageEntry[]) {
  const horizons = entries.filter((entry) => entry.source === "reconstructed_forecast").map((entry) => entry.horizonDays);
  return horizons.length === 0 ? null : Math.min(...horizons);
}
