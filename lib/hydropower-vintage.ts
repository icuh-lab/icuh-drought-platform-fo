/**
 * 수력발전량의 과거 예측·실측 + 미래 예측 시계열을 만드는 순수 로직 (양파 vintage와 동형).
 *
 * 발전량(MWh)·저수량(백만㎥) 둘 다 같은 모양(예측 하한/상한 + 실측 하나)이라 이 빌더 하나를
 * 공유한다 — 호출부에서 어떤 지표의 값을 넘기는지만 다르다.
 *
 * 양파와 달리 하나의 vintage 로그 테이블이 없다 — `dam_monthly_predictions`를 그대로 쓴다.
 * 이 테이블은 시점(vintage)별로 기록된 로그가 아니라 "지금 아는 최신 예측"만 담은 테이블이라,
 * 한 번 지나간 달의 값은 그 뒤로 절대 안 바뀐다(모델이 매달 direct 1~3개월만 예측하므로).
 * 그래서 그대로 전체 이력을 가져다 쓰면 결과적으로 point-in-time 로그와 같아진다.
 *
 * 2022-01~2024-10 구간은 원래 실제 모델 산출물이 아니라 고정밴드였는데, 2026-08-30에
 * backtest_fill(누수 없는 시점별 재학습 walk-forward)로 그 구간 전체를 진짜 모델 예측으로
 * 다시 채웠다 — 이제 전 구간이 동일한 성격의 예측이다.
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
  value: number | null;
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
};

function toMonthDate(year: string, month: string) {
  return `${year}-${month.padStart(2, "0")}-01`;
}

/**
 * 선택한 연/월의 실측값과, 직전 실측월 대비 변동률(%). monthly-generation 은 연·월
 * 파라미터로 걸러 받을 수 없어(연 단위 응답) 기간을 바꿔도 다시 부르지 않고 항상 전체
 * 이력을 준다 — 그래서 KPI 카드는 이미 받아 둔 points 에서 그 달의 값을 직접 골라야
 * 기간 선택기에 반응한다. 그 달에 실측이 없으면 current 가 null.
 */
export function actualAtPeriod(points: HydropowerVintagePoint[], year: number, month: number) {
  const targetDate = toMonthDate(String(year), String(month));
  const actualDates = points.filter((point) => point.actual !== null).map((point) => point.date).sort();

  if (!actualDates.includes(targetDate)) {
    return { current: null, currentDate: null, delta: null };
  }

  const currentIndex = actualDates.indexOf(targetDate);
  const previousDate = currentIndex > 0 ? actualDates[currentIndex - 1] : null;
  const byDate = new Map(points.map((point) => [point.date, point.actual] as const));
  const current = byDate.get(targetDate) ?? null;
  const previous = previousDate === null ? null : byDate.get(previousDate) ?? null;
  const delta = current === null || previous === null || previous === 0 ? null : ((current - previous) / previous) * 100;

  return { current, currentDate: targetDate, delta };
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
    if (entry.value === null) continue;
    actual.set(toMonthDate(entry.year, entry.month), entry.value);
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

  return { points, boundaryDate, latestActualDate, delta, current };
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
