import { OPEN_API_DEFAULT_PERIOD, type OpenApiPeriod } from "@/lib/api-client";

/**
 * 예측·지수 모델은 월 1회 재학습되므로 조회 단위를 월로 맞춘다.
 * 선택 가능한 최신 시점은 기본 연월이다 — 그보다 미래는 아직 산출되지 않았다.
 */
/** 예측 데이터는 2022년부터 생성된다. 그 이전 시점은 조회할 수 없다. */
export const PERIOD_START_YEAR = 2022;

/** 기본 연월이 시작 연도보다 앞서도 최소 1개 연도는 남긴다. */
const PERIOD_END_YEAR = Math.max(PERIOD_START_YEAR, OPEN_API_DEFAULT_PERIOD.year);

export const PERIOD_YEARS = Array.from(
  { length: PERIOD_END_YEAR - PERIOD_START_YEAR + 1 },
  (_, index) => PERIOD_START_YEAR + index
);

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

/** 기준 연도에는 아직 산출되지 않은 달을 제외한다. */
export function availableMonths(year: number) {
  return year >= OPEN_API_DEFAULT_PERIOD.year ? MONTHS.slice(0, OPEN_API_DEFAULT_PERIOD.month) : MONTHS;
}

/** 선택 가능한 범위를 벗어나지 않도록 보정한다. */
export function clampPeriod({ year, month }: OpenApiPeriod): OpenApiPeriod {
  const minYear = PERIOD_YEARS[0];
  if (year < minYear) return { year: minYear, month: 1 };
  if (year > OPEN_API_DEFAULT_PERIOD.year) return { ...OPEN_API_DEFAULT_PERIOD };
  const months = availableMonths(year);
  return { year, month: Math.min(Math.max(month, 1), months[months.length - 1]) };
}

/** 월 단위 이동. 연 경계를 넘으면 연도도 함께 조정한다. */
export function shiftPeriod({ year, month }: OpenApiPeriod, delta: number): OpenApiPeriod {
  const total = year * 12 + (month - 1) + delta;
  return clampPeriod({ year: Math.floor(total / 12), month: (total % 12) + 1 });
}

export function isPeriodAtStart({ year, month }: OpenApiPeriod) {
  return year <= PERIOD_YEARS[0] && month <= 1;
}

export function isPeriodAtEnd({ year, month }: OpenApiPeriod) {
  return year >= OPEN_API_DEFAULT_PERIOD.year && month >= OPEN_API_DEFAULT_PERIOD.month;
}
