import type { ForecastKey, fireRisk, forecasts, kpis, reports } from "@/lib/mock-data";
import { sidoName } from "@/lib/fire-region";
import { FIRE_REGION_NAMES } from "@/lib/fire-region-names";
import {
  buildFreshFoodIndex,
  freshFoodGradeClass,
  freshFoodGradeLabel,
  formatIndexValue,
  gradeCounts,
  monthWindow,
  normalizeFreshFoodMonth,
  provinceBarRatio,
  topAndBottomProvinces,
  type FreshFoodIndex,
  type FreshFoodKind,
  type FreshFoodProvince,
  type RawFreshFoodMonth
} from "@/lib/fresh-food";
import {
  buildOnionPriceSeries,
  monthsMissingActual,
  vintageBoundaryDate,
  yearlyAccuracy,
  type YearAccuracy,
  type OnionPricePoint,
  type OnionPriceSeries,
  type RawMarketTrendPoint
} from "@/lib/onion-price";
import type {
  ArticleSearchParams, ArticlePage, ArticleDetail, ArticleCategories, ArticleListItem,
} from "./archive-types";
import type { ArticleFormValues, CompletedFileUpload } from "./archive-types";

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export const API_BASE_URLS = {
  public: normalizeBaseUrl(process.env.NEXT_PUBLIC_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081"),
  open: normalizeBaseUrl(process.env.NEXT_PUBLIC_OPEN_API_BASE_URL ?? "http://localhost:8083")
} as const;

const OPEN_API_DEFAULT_YEAR = process.env.NEXT_PUBLIC_OPEN_API_DEFAULT_YEAR ?? String(new Date().getFullYear());
const OPEN_API_DEFAULT_MONTH = process.env.NEXT_PUBLIC_OPEN_API_DEFAULT_MONTH ?? String(new Date().getMonth() + 1);

function toPositiveInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * open-api 조회 기준 연월. 예측·지수 모델이 월 1회 재학습되므로 조회 단위도 월이다.
 * 화면 필터의 초기값이자, year/month 를 넘기지 않은 호출의 기본값이다.
 */
export const OPEN_API_DEFAULT_PERIOD = {
  year: toPositiveInt(OPEN_API_DEFAULT_YEAR, new Date().getFullYear()),
  month: toPositiveInt(OPEN_API_DEFAULT_MONTH, new Date().getMonth() + 1)
} as const;

export type OpenApiPeriod = { year: number; month: number };

export type ApiResponse<T> = {
  result: "SUCCESS" | "ERROR";
  data: T | null;
  error: unknown | null;
};

type PublicApiResponse<T> = {
  status?: number;
  message?: string;
  data?: T | null;
  error?: { code?: string; details?: string } | null;
};

export type PriceForecastKey = Extract<ForecastKey, "cabbage" | "onion">;
export type PriceForecastItem = "napa-cabbage" | "onion";
export type PriceForecastRegion = "42150" | "48890";
export type PriceForecastDataType = "observed" | "predicted" | "indexed";

export type PriceForecastPoint = {
  baseDate: string;
  value: number;
  dataType: PriceForecastDataType;
  lowerBound?: number | null;
  upperBound?: number | null;
};

export type PriceForecastResponse = {
  item: PriceForecastItem;
  regionCode: PriceForecastRegion;
  unit: string;
  errorRate: number | null;
  points: PriceForecastPoint[];
};

export type PredictionVintageSource = "live" | "reconstructed_forecast" | "reconstructed_nowcast_walkforward";

/** onion_prediction_vintage_log 한 행. pred 는 재학습돼도 안 바뀌는 불변값, actual 만 갱신된다. */
export type PredictionVintageEntry = {
  targetDate: string;
  horizonDays: number;
  source: PredictionVintageSource;
  modelType: string | null;
  modelTrainEndDate: string | null;
  pred: number;
  actual: number | null;
  arrivalTon: number | null;
};

export type PredictionVintageResponse = {
  location: string;
  item: string;
  variety: string;
  entries: PredictionVintageEntry[];
};

/**
 * 양파 메인 차트는 실측 뒤에 예측을 이어 붙이는 모양이 아니라 같은 날짜축 위에 겹치는
 * 모양이라 배열 두 개로는 표현이 안 된다. 날짜마다 실측·예측을 함께 들고 다닌다.
 */
export type OnionForecastView = {
  label: string;
  current: string;
  unit: string;
  error: string;
  errorNote: string;
  source: string;
  sub: string;
  note: string;
  /** 연도별 정확도. 큰 숫자는 마지막 항목을 쓴다. */
  years: YearAccuracy[];
  points: OnionPricePoint[];
  boundaryDate: string;
  /** 미래선의 리드타임이 바뀌는 날. 오차율이 설명하지 못하는 구간의 시작이다. */
  horizonSwitchDate: string | null;
  latestActualDate: string | null;
};

export type PriceForecastView = typeof forecasts.cabbage;
export type PriceKpiView = (typeof kpis)[number];
export type HydropowerForecastView = typeof forecasts.hydro;
export type HydropowerKpiView = (typeof kpis)[number];

export type HydropowerForecastDataType = "observed" | "predicted";

export type HydropowerForecastPoint = {
  baseDate: string;
  value: number;
  dataType: HydropowerForecastDataType;
  lowerBound?: number | null;
  upperBound?: number | null;
  storageRate?: number | null;
};

export type HydropowerForecastResponse = {
  plant: "hapcheon-dam";
  regionCode: "48890";
  unit: string;
  errorRate: number | null;
  points: HydropowerForecastPoint[];
};

export type FireRiskGradeCode = "low" | "moderate" | "high" | "very-high" | "very_high";

export type FireRiskIndexPoint = {
  baseDate: string;
  observedAt: string | null;
  value: number;
  gradeCode: FireRiskGradeCode;
};

export type FireRiskRegion = {
  regionCode: string;
  regionName: string;
  value: number;
  gradeCode: FireRiskGradeCode;
  change: number;
  observedAt: string | null;
  points: FireRiskIndexPoint[];
};

export type FireRiskIndexResponse = {
  unit: "score_0_100";
  regions: FireRiskRegion[];
};

export type FireRiskView = typeof fireRisk;
export type FreshFoodKpiView = (typeof kpis)[number];

export type FreshFoodProvinceRow = {
  code: number;
  name: string;
  value: string;
  gradeLabel: string;
  gradeClass: string;
  /** 0~1. 그 달의 최소~최대를 양 끝으로 늘린 값이다. */
  ratio: number;
};

export type FreshFoodGaugeView = {
  kind: FreshFoodKind;
  value: string;
  baseMonth: string;
  monthOverMonthRate: string;
  yearOverYearRate: string;
  monthOverMonthDirection: "up" | "down" | null;
  yearOverYearDirection: "up" | "down" | null;
  series: number[];
  /** 추세선 양 끝에 붙일 월 라벨 */
  rangeStart: string;
  rangeEnd: string;
  provinceCount: number;
  grades: { label: string; className: string; count: number }[];
  /** 접힌 상태에서 보여줄 위·아래 조각 */
  top: FreshFoodProvinceRow[];
  bottom: FreshFoodProvinceRow[];
  /** 펼쳤을 때 보여줄 전체 목록. top·bottom 과 같은 정렬이라 펼쳐도 줄 순서가 튀지 않는다. */
  all: FreshFoodProvinceRow[];
  omitted: number;
};

export type SummaryAlertSeverity = "info" | "warning" | "danger";

export type SummaryAlert = {
  id: string;
  category: string;
  dataset: string;
  regionCode: string;
  regionName: string;
  title: string;
  description: string;
  severity: SummaryAlertSeverity;
  score: number;
  value: number;
  unit: string;
  observedAt: string | null;
  relatedReportCount: number;
};

export type SummaryKpi = {
  dataset: string;
  regionCode: string;
  regionName: string;
  name: string;
  value: number;
  unit: string;
  changeRate: number | null;
  severity: SummaryAlertSeverity;
  observedAt: string | null;
};

export type SummaryResponse = {
  generatedAt: string;
  alerts: SummaryAlert[];
  kpis: SummaryKpi[];
};

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

type FetchPriceForecastOptions = {
  signal?: AbortSignal;
  year?: number;
  month?: number;
};

type FetchHydropowerForecastOptions = {
  signal?: AbortSignal;
  year?: number;
  month?: number;
};

type FetchFireRiskIndexOptions = {
  signal?: AbortSignal;
};

type FetchFreshFoodIndexOptions = {
  signal?: AbortSignal;
  year?: number;
  month?: number;
  kind?: FreshFoodKind;
};

type FetchSummaryOptions = {
  signal?: AbortSignal;
};

type FetchDroughtReportsOptions = {
  signal?: AbortSignal;
  size?: number;
};

type FetchDroughtReportDetailOptions = {
  signal?: AbortSignal;
};

type OpenAgriDailyPriceResponse = {
  location: string;
  item: string;
  variety: string;
  calendarData: {
    predictionDate: string;
    predictedPrice: number | null;
    rateOfChangeFromPrevYear: number | null;
  }[];
};

/**
 * 실측 도매가 계열. `daily-price` 의 예측값과는 다른 계열이다.
 * 기준일 이후 행은 실측이 아니라 예측으로 채워져 있어 그대로 쓰면 안 된다 — onion-price 가 자른다.
 */
type OpenAgriDailyMarketResponse = {
  location: string;
  item: string;
  variety: string;
  monthlyTrend: RawMarketTrendPoint[];
};

type OpenHydropowerGenerationResponse = {
  damName: string;
  damCode: string;
  monthlyGenerationDto: {
    year: string;
    month: string;
    plannedMwh: number | null;
    actualMwh: number | null;
  }[];
};

type OpenHydropowerPredictionResponse = {
  damName: string;
  damCode: string;
  predictedPowerGenerationDto: {
    predictedPowerGenerationLowerBound: number | null;
    predictedPowerGenerationUpperBound: number | null;
  };
  predictedWaterStorageDto: {
    predictedWaterStorageLowerBound: number | null;
    predictedWaterStorageUpperBound: number | null;
  };
};

type OpenWildFireRegion = {
  regionCode: string;
  riskLevel: string;
  indexValue: number | null;
};

type OpenWildFireForecastResponse = {
  targetDate: string;
  targetTime: string;
  regionData: OpenWildFireRegion[];
}[];

type PublicArticleListItemResponse = Omit<ArticleListItem, "extensions" | "sourceUrl" | "sourceArticleCount" | "regionMentions" | "keywords" | "autoSummaryNotice"> &
  Partial<Pick<ArticleListItem, "extensions" | "sourceUrl" | "sourceArticleCount" | "regionMentions" | "keywords" | "autoSummaryNotice">>;

type PublicArticlePageResponse = {
  content: PublicArticleListItemResponse[];
  totalElements: number;
  totalPages: number;
  page?: number;
  size?: number;
  first?: boolean;
  last?: boolean;
};

type PublicArticleDetailResponse = Omit<ArticleDetail, "source" | "sourceUrl" | "sourceArticleCount" | "regionMentions" | "keywords" | "autoSummaryNotice"> &
  Partial<Pick<ArticleDetail, "source" | "sourceUrl" | "sourceArticleCount" | "regionMentions" | "keywords" | "autoSummaryNotice">>;

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
    location: process.env.NEXT_PUBLIC_AGRI_CABBAGE_LOCATION ?? "강릉"
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
    location: process.env.NEXT_PUBLIC_AGRI_ONION_LOCATION ?? "합천"
  }
};

export async function fetchPriceForecast(key: PriceForecastKey, { signal, year, month }: FetchPriceForecastOptions = {}) {
  const config = PRICE_FORECAST_CONFIG[key];
  const search = new URLSearchParams({
    year: String(year ?? OPEN_API_DEFAULT_PERIOD.year),
    month: String(month ?? OPEN_API_DEFAULT_PERIOD.month),
    location: config.location
  });
  const data = await getOpenApiData<OpenAgriDailyPriceResponse>("/api/v1/agrimarket/daily-price", search, signal);
  // daily-price 는 "predictedPrice" 한 컬럼뿐이라 실측과 예측이 구분되어 오지 않는다.
  // 오늘(today) 이전 날짜는 이미 지나간 값(실측에 가장 가까움)으로, 오늘 이후는 아직
  // 오지 않은 값(예측)으로 갈라서 observed/predicted 를 프론트에서 만든다.
  const todayIso = new Date().toISOString().slice(0, 10);
  const points = data.calendarData
    .filter((point) => typeof point.predictedPrice === "number")
    .map((point) => ({
      baseDate: point.predictionDate,
      value: point.predictedPrice as number,
      dataType: (point.predictionDate <= todayIso ? "observed" : "predicted") as PriceForecastDataType
    }));

  return {
    item: config.item,
    regionCode: config.region,
    unit: "KRW/kg",
    errorRate: null,
    points
  } satisfies PriceForecastResponse;
}

/** daily-price 가 쓰는 location 과 동일한 값을 얻는다("합천") — 호출부에서 문자열을 직접 하드코딩하지 않게. */
export function priceForecastLocation(key: PriceForecastKey): string {
  return PRICE_FORECAST_CONFIG[key].location;
}

export async function fetchPredictionVintage(location: string, signal?: AbortSignal) {
  const search = new URLSearchParams({ location });
  return getOpenApiData<PredictionVintageResponse>("/api/v1/agrimarket/prediction-vintage", search, signal);
}

/**
 * 양파 메인 차트용 실측·예측 시계열. 2022년부터의 전체 이력을 만든다.
 *
 * 예측은 이미 받아 둔 vintage 응답에서 꺼낸다(정확도 패널과 같은 호출을 나눠 쓴다).
 * 실측도 대부분 거기 들어 있다 — vintage 의 actual 이 2022~2025 를 덮는다.
 *
 * 남는 구멍만 daily-market 으로 메운다. 전 구간을 월별로 부르면 56 회인데, 운영 서버는
 * 동시 요청을 몰아치면 넘어간 전력이 있어(2026-08-28) 실측이 한 건도 없는 달만 고르고
 * 그마저 4 개씩 끊어 던진다. 오늘 기준 13 개월이다.
 */
const MARKET_FETCH_CONCURRENCY = 4;

export async function fetchOnionPriceSeries(vintage: PredictionVintageResponse, signal?: AbortSignal) {
  const boundaryDate = vintageBoundaryDate(vintage.entries);
  if (boundaryDate === null) {
    return null;
  }

  const location = PRICE_FORECAST_CONFIG.onion.location;
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
          // 없는 달은 E404 다. 그 구간만 실측선이 끊길 뿐이라 나머지로 계속 그린다.
          if (signal?.aborted) throw error;
          return [];
        }
      })
    );
    trends.push(...batch.flat());
  }

  return buildOnionPriceSeries({ entries: vintage.entries, market: trends });
}

export function toOnionForecastView(series: OnionPriceSeries): OnionForecastView | null {
  if (series.points.length === 0) {
    return null;
  }

  const config = PRICE_FORECAST_CONFIG.onion;
  const years = yearlyAccuracy(series.points);
  const latestYear = years.at(-1) ?? null;
  const dated = series.latestActualDate ?? series.boundaryDate;
  const change = series.delta === null ? "" : ` · 전일대비 ${formatSignedPercent(series.delta)}`;

  return {
    label: config.label,
    current: series.current === null ? "–" : formatWholeNumber(series.current),
    unit: config.displayUnit,
    // 전체 평균은 유난히 어려웠던 해가 끌어올린다. 최근 연도가 "지금 이 예측선을 믿어도
    // 되나" 에 더 맞는 답이라 큰 숫자는 마지막 연도를 쓴다.
    error: latestYear === null ? "N/A" : `${latestYear.mape.toFixed(1)}%`,
    errorNote: latestYear === null
      ? "실측과 겹치는 구간 없음"
      : `${latestYear.year}년 평균 오차율 · 표본 ${latestYear.sampleDays}일`,
    source: "open-api /api/v1/agrimarket/daily-market · prediction-vintage (합천)",
    sub: `${config.regionName} 출하 물량 기준 · ${dated}${change}`,
    // 과거 예측선은 지금 모델로 과거를 되짚은 값이다. "그때 실제로 이렇게 예측했다" 가
    // 아니라는 걸 화면에 적어 두지 않으면 정확도를 실제보다 후하게 읽게 된다.
    note: [
      `실측은 ${series.boundaryDate}까지 · 그 뒤는 예측만`,
      `과거 예측선은 현재 모델(${series.boundaryDate} 학습)로 되짚은 재구성 예측이라, 연도별 차이는 모델의 발전이 아니라 그 해의 난이도다`,
      // 미래선이 중간에 더 긴 리드타임 모델로 넘어가면 위 오차율은 그 앞 구간만 설명한다.
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

export function toOnionKpiView(series: OnionPriceSeries): PriceKpiView | null {
  if (series.current === null) {
    return null;
  }

  const config = PRICE_FORECAST_CONFIG.onion;
  const latestYearMape = yearlyAccuracy(series.points).at(-1)?.mape ?? null;
  const spark = series.points
    .filter((point) => point.actual !== null)
    .slice(-7)
    .map((point) => point.actual as number);
  const delta = series.delta ?? 0;

  return {
    tag: "예측 · 농산물",
    region: config.regionName,
    name: "양파 도매가격",
    value: formatWholeNumber(series.current),
    unit: config.kpiUnit,
    delta: formatSignedPercent(delta),
    direction: delta >= 0 ? "up" : "down",
    error: latestYearMape === null ? "N/A" : `${latestYearMape.toFixed(1)}%`,
    spark,
    target: "onion"
  };
}

/** "YYYY-MM-DD" 형태의 baseDate 에서 offset 개월 뒤(음수면 앞) 연/월을 구한다. 순수 함수. */
export function shiftMonth(baseDate: string, offset: number) {
  const [year, month] = baseDate.split("-").map(Number);
  const total = year * 12 + (month - 1) + offset;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

export async function fetchHydropowerForecast({ signal, year, month }: FetchHydropowerForecastOptions = {}) {
  // open-api 가 찾는 댐 이름은 "합천" 이다. "합천댐" 으로 물으면 E404 를 준다.
  // 화면 문구의 "합천댐" 은 사람이 읽는 이름이라 그대로 두고, 질의 값만 맞춘다.
  const damName = process.env.NEXT_PUBLIC_HYDROPOWER_DAM_NAME ?? "합천";
  const search = new URLSearchParams({
    year: String(year ?? OPEN_API_DEFAULT_PERIOD.year),
    month: String(month ?? OPEN_API_DEFAULT_PERIOD.month),
    damName
  });
  const data = await getOpenApiData<OpenHydropowerGenerationResponse>("/api/v1/hydropower/monthly-generation", search, signal);
  const observedPoints = data.monthlyGenerationDto
    .filter((point) => typeof point.actualMwh === "number" || typeof point.plannedMwh === "number")
    .map((point) => ({
      baseDate: `${point.year}-${point.month.padStart(2, "0")}-01`,
      value: (point.actualMwh ?? point.plannedMwh) as number,
      dataType: "observed" as const,
      lowerBound: null,
      upperBound: null
    }))
    // 백엔드가 월 순서를 보장하지 않을 수 있어(별도 배포, 알려진 이슈) 방어적으로 정렬한다 —
    // fetchFireRiskIndex 의 targetDate 정렬과 동일한 패턴. 정렬 없으면 observedPoints.at(-1) 이
    // 최신 실측월이 아닐 수 있어 미래 예측 범위 계산이 틀어진다.
    .sort((a, b) => a.baseDate.localeCompare(b.baseDate));

  // /monthly-predict 는 (year, month, damName) 한 조합만 조회하는 단일 응답 엔드포인트라,
  // 여러 달을 보려면 달마다 호출해야 한다. 마지막 실측 달 다음 3개월을 시도한다 — 모델이
  // 실제로 그 범위만큼 채워두므로(운영 RDS 확인) 3이 근거 있는 상한이다. 아직 안 채워진
  // 미래 달은 DATA_NOT_FOUND(404)로 오므로 개별적으로 건너뛴다 — 한 달이 없다고 나머지
  // 달까지 안 보여주면 안 된다.
  const lastObserved = observedPoints.at(-1);
  const predictedPoints = lastObserved
    ? (
        await Promise.all(
          Array.from({ length: 3 }, (_, index) => index + 1).map(async (offset) => {
            const target = shiftMonth(lastObserved.baseDate, offset);
            const predictSearch = new URLSearchParams({ year: String(target.year), month: String(target.month), damName });
            try {
              const prediction = await getOpenApiData<OpenHydropowerPredictionResponse>("/api/v1/hydropower/monthly-predict", predictSearch, signal);
              const { predictedPowerGenerationLowerBound: lower, predictedPowerGenerationUpperBound: upper } = prediction.predictedPowerGenerationDto;
              if (lower === null || upper === null) return null;
              return {
                baseDate: `${target.year}-${String(target.month).padStart(2, "0")}-01`,
                // 백엔드가 중앙값(p50)을 별도로 안 줘서 상하한의 중점으로 근사한다 — 실제
                // 예측 점값이 아니라 근사치라는 걸 화면 카피에 반드시 밝혀야 한다.
                value: (lower + upper) / 2,
                dataType: "predicted" as const,
                lowerBound: lower,
                upperBound: upper
              };
            } catch (error) {
              if (signal?.aborted) throw error;
              return null;
            }
          })
        )
      ).filter((point): point is NonNullable<typeof point> => point !== null)
    : [];

  return {
    plant: "hapcheon-dam",
    regionCode: "48890",
    unit: "MWh/month",
    errorRate: null,
    points: [...observedPoints, ...predictedPoints]
  } satisfies HydropowerForecastResponse;
}

export async function fetchFireRiskIndex({ signal }: FetchFireRiskIndexOptions = {}) {
  const response = await getOpenApiData<OpenWildFireForecastResponse>("/api/v1/wild-fire-risk/forecast", null, signal);
  // 응답은 오늘부터 이틀 뒤까지의 예보다. 지난 날짜는 오지 않는다.
  const forecasts = [...response].sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  const today = forecasts[0];
  if (!today) return { unit: "score_0_100", regions: [] } satisfies FireRiskIndexResponse;

  const regions = today.regionData
    .filter((region) => typeof region.indexValue === "number")
    .map((region) => {
      // 날짜별로 같은 지역을 찾아 붙인다. 빠진 날이 있어도 날짜가 밀리지 않도록 예보를 기준으로 돈다.
      const points = forecasts
        .map((forecast) => {
          const match = forecast.regionData.find((candidate) => candidate.regionCode === region.regionCode);
          if (!match || typeof match.indexValue !== "number") return null;
          return {
            baseDate: forecast.targetDate,
            observedAt: `${forecast.targetDate} ${forecast.targetTime}`,
            value: match.indexValue,
            gradeCode: normalizeFireRiskGrade(match.riskLevel)
          };
        })
        .filter((point): point is NonNullable<typeof point> => point !== null);

      // 과거 값이 없으니 전일 대비는 만들 수 없다. 대신 예보 구간의 추세(오늘 -> 마지막 예보일)를 쓴다.
      const last = points.at(-1);
      const change = last && points.length > 1 ? last.value - (region.indexValue as number) : 0;

      return {
        regionCode: region.regionCode,
        regionName: FIRE_REGION_NAMES[region.regionCode] ?? region.regionCode,
        value: region.indexValue as number,
        gradeCode: normalizeFireRiskGrade(region.riskLevel),
        change,
        observedAt: `${today.targetDate} ${today.targetTime}`,
        points
      };
    });

  return {
    unit: "score_0_100",
    regions
  } satisfies FireRiskIndexResponse;
}

/** 추세선에 담을 개월 수. 오른쪽 끝이 선택 월, 왼쪽 끝이 전년 동월이라 전년대비가 창 안에서 나온다. */
const FRESH_FOOD_WINDOW_MONTHS = 13;

const FRESH_FOOD_PATHS: Record<FreshFoodKind, string> = {
  vegetable: "/api/v1/freshfood/fresh-vegetable",
  fruit: "/api/v1/freshfood/fresh-fruit"
};

/**
 * 신선식품물가지수를 13 개월치 모아 온다.
 *
 * API 가 월 1건씩만 주므로 추세선과 증감률은 프론트가 여러 달을 모아 만든다. 병렬로
 * 던지고, 없는 달(2026-08 처럼 빈 응답)이나 실패한 달은 그 점만 빼고 나머지로 그린다.
 * 선택 월 자체에 값이 없으면 null 이다.
 */
export async function fetchFreshFoodIndex({ signal, year, month, kind = "vegetable" }: FetchFreshFoodIndexOptions = {}): Promise<FreshFoodIndex | null> {
  const baseYear = year ?? OPEN_API_DEFAULT_PERIOD.year;
  const baseMonth = month ?? OPEN_API_DEFAULT_PERIOD.month;
  const path = FRESH_FOOD_PATHS[kind];

  const months = await Promise.all(
    monthWindow(baseYear, baseMonth, FRESH_FOOD_WINDOW_MONTHS).map(async (target) => {
      const search = new URLSearchParams({ year: String(target.year), month: String(target.month) });
      try {
        const data = await getOpenApiData<RawFreshFoodMonth>(path, search, signal);
        return normalizeFreshFoodMonth(data, kind);
      } catch (error) {
        // 창 안의 한 달이 비어도 나머지로 추세선은 그린다. 중단은 호출자가 판단한다.
        if (signal?.aborted) throw error;
        return null;
      }
    })
  );

  const loaded = months.filter((value): value is NonNullable<typeof value> => value !== null);
  // 한 달도 못 받았으면 "데이터가 없다" 가 아니라 조회 자체가 실패한 것이다. 둘을 같은
  // 문구로 보여주면 CORS·네트워크 오류가 정상적인 빈 달처럼 읽힌다.
  if (loaded.length === 0) {
    throw new Error("Fresh food index request failed for every month in the window");
  }

  return buildFreshFoodIndex(loaded, `${baseYear}-${String(baseMonth).padStart(2, "0")}`, kind);
}

export async function fetchSummary({ signal }: FetchSummaryOptions = {}) {
  const url = new URL("/v1/summary", API_BASE_URLS.open);

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Summary API failed with ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!isApiSummaryResponse(payload) || payload.result !== "SUCCESS" || !payload.data) {
    throw new Error("Summary API returned an invalid response");
  }

  return payload.data;
}

export async function fetchDroughtReports({ signal, size = 20 }: FetchDroughtReportsOptions = {}) {
  const search = new URLSearchParams({
    page: "0",
    size: String(size),
    sort: "updatedAt,desc"
  });
  const page = normalizeArticlePage(
    await getPublicApiData<PublicArticlePageResponse>("/api/v1/articles", search, signal),
    1,
    size
  );
  return {
    reports: page.content.map(articleListItemToDroughtReportSummary)
  };
}

export async function fetchDroughtReportDetail(id: string, { signal }: FetchDroughtReportDetailOptions = {}) {
  const detail = normalizeArticleDetail(
    await getPublicApiData<PublicArticleDetailResponse>(`/api/v1/articles/${encodeURIComponent(id)}`, null, signal)
  );
  return articleDetailToDroughtReportDetail(detail);
}

export function toPriceForecastView(key: PriceForecastKey, response: PriceForecastResponse): PriceForecastView | null {
  const config = PRICE_FORECAST_CONFIG[key];
  const observedPoints = response.points.filter((point) => point.dataType === "observed").slice(-30);
  const predictedPoints = response.points.filter((point) => point.dataType === "predicted").slice(-7);
  const actual = observedPoints.map((point) => toDisplayPrice(point.value, config.displayMultiplier));

  if (actual.length === 0) {
    return null;
  }

  const predicted = predictedPoints.map((point) => toDisplayPrice(point.value, config.displayMultiplier));
  const band = predictedPoints.map((point, index) => {
    const value = predicted[index];
    const lower = toOptionalDisplayPrice(point.lowerBound, config.displayMultiplier);
    const upper = toOptionalDisplayPrice(point.upperBound, config.displayMultiplier);

    if (lower === null || upper === null) {
      return 0;
    }

    return Math.max(Math.abs(value - lower), Math.abs(upper - value), (upper - lower) / 2);
  });
  const currentPoint = observedPoints[observedPoints.length - 1];
  const previousPoint = observedPoints[observedPoints.length - 2];
  const current = actual[actual.length - 1];
  const delta = previousPoint ? percentDelta(currentPoint.value, previousPoint.value) : null;

  return {
    label: config.label,
    current: formatWholeNumber(current),
    unit: displayUnit(response.unit, config.displayUnit),
    error: formatErrorRate(response.errorRate),
    source: config.source,
    sub: `${config.regionName} 출하 물량 기준 · ${currentPoint.baseDate}${delta === null ? "" : ` · 전일대비 ${formatSignedPercent(delta)}`}`,
    actual,
    predicted,
    band
  };
}

export function toPriceKpiView(key: PriceForecastKey, response: PriceForecastResponse): PriceKpiView | null {
  const config = PRICE_FORECAST_CONFIG[key];
  const observedPoints = response.points.filter((point) => point.dataType === "observed");
  if (observedPoints.length === 0) {
    return null;
  }

  const currentPoint = observedPoints[observedPoints.length - 1];
  const previousPoint = observedPoints[observedPoints.length - 2];
  const spark = observedPoints.slice(-7).map((point) => toDisplayPrice(point.value, config.displayMultiplier));
  const delta = previousPoint ? percentDelta(currentPoint.value, previousPoint.value) : 0;

  return {
    tag: "예측 · 농산물",
    region: config.regionName,
    name: key === "cabbage" ? "고랭지배추 도매가격" : "양파 도매가격",
    value: formatWholeNumber(toDisplayPrice(currentPoint.value, config.displayMultiplier)),
    unit: displayKpiUnit(response.unit, config.kpiUnit),
    delta: formatSignedPercent(delta),
    direction: delta >= 0 ? "up" : "down",
    error: formatErrorRate(response.errorRate),
    spark,
    target: key
  };
}

export function latestPriceForecastDate(response: PriceForecastResponse) {
  return response.points.at(-1)?.baseDate ?? null;
}

export function toHydropowerForecastView(response: HydropowerForecastResponse): HydropowerForecastView | null {
  const observedPoints = response.points.filter((point) => point.dataType === "observed").slice(-30);
  const predictedPoints = response.points.filter((point) => point.dataType === "predicted").slice(-7);
  const actual = observedPoints.map((point) => point.value);

  if (actual.length === 0) {
    return null;
  }

  const predicted = predictedPoints.map((point) => point.value);
  const band = predictedPoints.map((point, index) => {
    const value = predicted[index];
    if (value === undefined || point.lowerBound === null || point.lowerBound === undefined || point.upperBound === null || point.upperBound === undefined) {
      return 0;
    }

    return Math.max(Math.abs(value - point.lowerBound), Math.abs(point.upperBound - value), (point.upperBound - point.lowerBound) / 2);
  });
  const currentPoint = observedPoints[observedPoints.length - 1];
  const previousPoint = observedPoints[observedPoints.length - 2];
  const current = actual[actual.length - 1];
  const delta = previousPoint ? percentDelta(currentPoint.value, previousPoint.value) : null;

  return {
    label: "합천댐 수력발전량",
    current: formatDecimalNumber(current),
    unit: displayHydropowerUnit(response.unit),
    error: formatErrorRate(response.errorRate),
    source: "open-api /api/v1/hydropower/monthly-generation (합천댐)",
    sub: `합천댐 · ${currentPoint.baseDate}${delta === null ? "" : ` · 전월대비 ${formatSignedPercent(delta)}`}`,
    actual,
    predicted,
    band
  };
}

export function toHydropowerKpiView(response: HydropowerForecastResponse): HydropowerKpiView | null {
  const observedPoints = response.points.filter((point) => point.dataType === "observed");
  if (observedPoints.length === 0) {
    return null;
  }

  const currentPoint = observedPoints[observedPoints.length - 1];
  const previousPoint = observedPoints[observedPoints.length - 2];
  const delta = previousPoint ? percentDelta(currentPoint.value, previousPoint.value) : 0;

  return {
    tag: "예측 · 에너지",
    region: "합천댐",
    name: "수력발전량",
    value: formatDecimalNumber(currentPoint.value),
    unit: displayHydropowerKpiUnit(response.unit),
    delta: formatSignedPercent(delta),
    direction: delta >= 0 ? "up" : "down",
    error: formatErrorRate(response.errorRate),
    spark: observedPoints.slice(-7).map((point) => point.value),
    target: "hydro"
  };
}

export function latestHydropowerForecastDate(response: HydropowerForecastResponse) {
  const observed = response.points.filter((point) => point.dataType === "observed");
  return observed.at(-1)?.baseDate ?? null;
}

export function toDroughtReportViews(response: DroughtReportListResponse): DroughtReportView[] {
  return response.reports.map((report) => toDroughtReportView(report));
}

export function toDroughtReportDetailView(response: DroughtReportDetail): DroughtReportView {
  return toDroughtReportView(response, response.body, response.sources, response.mentionedRegions, response.visualSummary);
}

export function toFireRiskView(response: FireRiskIndexResponse): FireRiskView | null {
  if (response.regions.length === 0) {
    return null;
  }

  return response.regions.map((region) => ({
    name: region.regionName,
    sido: sidoName(region.regionCode),
    value: Math.round(region.value),
    delta: formatSignedWholeNumber(region.change),
    // 예보는 오늘 포함 3일이다. 그보다 길게 잘라도 더 나올 게 없다.
    series: region.points.map((point) => Math.round(point.value))
  }));
}

export type FireRiskMapDay = {
  baseDate: string;
  observedAt: string | null;
};

export type FireRiskMapRegion = {
  name: string;
  sido: string;
  /** days 와 같은 순서. 그 날 값이 없으면 null. */
  values: (number | null)[];
};

export type FireRiskMapView = {
  days: FireRiskMapDay[];
  /** 시군구 코드 -> 지역. 응답에 없는 시군구는 아예 들어오지 않고, 지도에서 '미제공' 으로 칠한다. */
  regions: Record<string, FireRiskMapRegion>;
};

/** 지도는 날짜별로 전국을 한 번에 칠하므로 지역 배열이 아니라 날짜축 + 코드 색인이 필요하다. */
export function toFireRiskMapView(response: FireRiskIndexResponse): FireRiskMapView | null {
  if (response.regions.length === 0) {
    return null;
  }

  // 날짜축은 지역마다 빠진 날이 있어도 흔들리지 않도록 전체 지역의 합집합으로 만든다.
  const baseDates = Array.from(new Set(response.regions.flatMap((region) => region.points.map((point) => point.baseDate)))).sort();
  const days = baseDates.map((baseDate) => ({
    baseDate,
    observedAt: response.regions.flatMap((region) => region.points).find((point) => point.baseDate === baseDate)?.observedAt ?? null
  }));

  const regions: Record<string, FireRiskMapRegion> = {};
  for (const region of response.regions) {
    regions[region.regionCode] = {
      name: region.regionName,
      sido: sidoName(region.regionCode),
      values: baseDates.map((baseDate) => {
        const point = region.points.find((candidate) => candidate.baseDate === baseDate);
        return point ? Math.round(point.value) : null;
      })
    };
  }

  return { days, regions };
}

export function latestFireRiskObservedAt(response: FireRiskIndexResponse) {
  return response.regions
    .map((region) => region.observedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
}

export function toFreshFoodKpiView(index: FreshFoodIndex): FreshFoodKpiView | null {
  if (index.points.length === 0) {
    return null;
  }

  const delta = index.monthOverMonthRate ?? 0;

  return {
    tag: "지수 · 물가",
    region: "전국",
    name: "신선식품물가지수",
    value: formatIndexValue(index.value),
    unit: displayFreshFoodUnit("index_2020_100"),
    delta: formatSignedPercent(delta),
    direction: delta >= 0 ? "up" : "down",
    error: null,
    // 예전에는 여기에 시도 목록이 들어가 추세선처럼 보였다. 이제 월별 시계열이다.
    spark: index.points.slice(-7).map((point) => point.value),
    target: "cabbage"
  };
}

function toProvinceRow(province: FreshFoodProvince, min: number, max: number): FreshFoodProvinceRow {
  return {
    code: province.code,
    name: province.name,
    value: formatIndexValue(province.value),
    gradeLabel: freshFoodGradeLabel(province.grade),
    gradeClass: freshFoodGradeClass(province.grade),
    ratio: provinceBarRatio(province.value, min, max)
  };
}

/** 상·하위 몇 곳씩 보여줄지. 19 개 시도를 다 늘어놓으면 카드가 목록으로 변한다. */
const FRESH_FOOD_RANK_SIZE = 3;

export function toFreshFoodGaugeView(index: FreshFoodIndex): FreshFoodGaugeView | null {
  if (index.points.length === 0) {
    return null;
  }

  const values = index.provinces.map((province) => province.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const ranked = topAndBottomProvinces(index.provinces, FRESH_FOOD_RANK_SIZE);

  return {
    kind: index.kind,
    value: formatIndexValue(index.value),
    baseMonth: index.baseMonth,
    monthOverMonthRate: formatNullableSignedPercent(index.monthOverMonthRate),
    yearOverYearRate: formatNullableSignedPercent(index.yearOverYearRate),
    monthOverMonthDirection: toRateDirection(index.monthOverMonthRate),
    yearOverYearDirection: toRateDirection(index.yearOverYearRate),
    series: index.points.map((point) => point.value),
    rangeStart: index.points[0]?.baseMonth ?? index.baseMonth,
    rangeEnd: index.points.at(-1)?.baseMonth ?? index.baseMonth,
    provinceCount: index.provinces.length,
    grades: gradeCounts(index.provinces).map((entry) => ({
      label: freshFoodGradeLabel(entry.grade),
      className: freshFoodGradeClass(entry.grade),
      count: entry.count
    })),
    top: ranked.top.map((province) => toProvinceRow(province, min, max)),
    bottom: ranked.bottom.map((province) => toProvinceRow(province, min, max)),
    all: ranked.all.map((province) => toProvinceRow(province, min, max)),
    omitted: ranked.omitted
  };
}

function toRateDirection(rate: number | null) {
  if (rate === null) return null;
  return rate >= 0 ? "up" : "down";
}

function isApiPriceForecastResponse(value: unknown): value is ApiResponse<PriceForecastResponse> {
  if (!isRecord(value)) return false;
  return (
    (value.result === "SUCCESS" || value.result === "ERROR") &&
    (value.data === null || isPriceForecastResponse(value.data)) &&
    "error" in value
  );
}

function isPriceForecastResponse(value: unknown): value is PriceForecastResponse {
  if (!isRecord(value)) return false;
  return (
    (value.item === "napa-cabbage" || value.item === "onion") &&
    (value.regionCode === "42150" || value.regionCode === "48890") &&
    typeof value.unit === "string" &&
    (typeof value.errorRate === "number" || value.errorRate === null) &&
    Array.isArray(value.points) &&
    value.points.every(isPriceForecastPoint)
  );
}

function isPriceForecastPoint(value: unknown): value is PriceForecastPoint {
  if (!isRecord(value)) return false;
  return (
    typeof value.baseDate === "string" &&
    typeof value.value === "number" &&
    (value.dataType === "observed" || value.dataType === "predicted" || value.dataType === "indexed") &&
    (value.lowerBound === undefined || value.lowerBound === null || typeof value.lowerBound === "number") &&
    (value.upperBound === undefined || value.upperBound === null || typeof value.upperBound === "number")
  );
}

function isApiPredictionVintageResponse(value: unknown): value is ApiResponse<PredictionVintageResponse> {
  if (!isRecord(value)) return false;
  return (
    (value.result === "SUCCESS" || value.result === "ERROR") &&
    (value.data === null || isPredictionVintageResponse(value.data)) &&
    "error" in value
  );
}

function isPredictionVintageResponse(value: unknown): value is PredictionVintageResponse {
  if (!isRecord(value)) return false;
  return (
    typeof value.location === "string" &&
    typeof value.item === "string" &&
    typeof value.variety === "string" &&
    Array.isArray(value.entries) &&
    value.entries.every(isPredictionVintageEntry)
  );
}

function isPredictionVintageEntry(value: unknown): value is PredictionVintageEntry {
  if (!isRecord(value)) return false;
  return (
    typeof value.targetDate === "string" &&
    typeof value.horizonDays === "number" &&
    (value.source === "live" || value.source === "reconstructed_forecast" || value.source === "reconstructed_nowcast_walkforward") &&
    (value.modelType === null || typeof value.modelType === "string") &&
    (value.modelTrainEndDate === null || typeof value.modelTrainEndDate === "string") &&
    typeof value.pred === "number" &&
    (value.actual === null || typeof value.actual === "number") &&
    (value.arrivalTon === null || typeof value.arrivalTon === "number")
  );
}

function isApiHydropowerForecastResponse(value: unknown): value is ApiResponse<HydropowerForecastResponse> {
  if (!isRecord(value)) return false;
  return (
    (value.result === "SUCCESS" || value.result === "ERROR") &&
    (value.data === null || isHydropowerForecastResponse(value.data)) &&
    "error" in value
  );
}

function isHydropowerForecastResponse(value: unknown): value is HydropowerForecastResponse {
  if (!isRecord(value)) return false;
  return (
    value.plant === "hapcheon-dam" &&
    value.regionCode === "48890" &&
    typeof value.unit === "string" &&
    (typeof value.errorRate === "number" || value.errorRate === null) &&
    Array.isArray(value.points) &&
    value.points.every(isHydropowerForecastPoint)
  );
}

function isHydropowerForecastPoint(value: unknown): value is HydropowerForecastPoint {
  if (!isRecord(value)) return false;
  return (
    typeof value.baseDate === "string" &&
    typeof value.value === "number" &&
    (value.dataType === "observed" || value.dataType === "predicted") &&
    (value.lowerBound === undefined || value.lowerBound === null || typeof value.lowerBound === "number") &&
    (value.upperBound === undefined || value.upperBound === null || typeof value.upperBound === "number") &&
    (value.storageRate === undefined || value.storageRate === null || typeof value.storageRate === "number")
  );
}

function isApiFireRiskIndexResponse(value: unknown): value is ApiResponse<FireRiskIndexResponse> {
  if (!isRecord(value)) return false;
  return (
    (value.result === "SUCCESS" || value.result === "ERROR") &&
    (value.data === null || isFireRiskIndexResponse(value.data)) &&
    "error" in value
  );
}

function isFireRiskIndexResponse(value: unknown): value is FireRiskIndexResponse {
  if (!isRecord(value)) return false;
  return value.unit === "score_0_100" && Array.isArray(value.regions) && value.regions.every(isFireRiskRegion);
}

function isFireRiskRegion(value: unknown): value is FireRiskRegion {
  if (!isRecord(value)) return false;
  return (
    typeof value.regionCode === "string" &&
    typeof value.regionName === "string" &&
    typeof value.value === "number" &&
    isFireRiskGradeCode(value.gradeCode) &&
    typeof value.change === "number" &&
    (value.observedAt === null || typeof value.observedAt === "string") &&
    Array.isArray(value.points) &&
    value.points.every(isFireRiskPoint)
  );
}

function isFireRiskPoint(value: unknown): value is FireRiskIndexPoint {
  if (!isRecord(value)) return false;
  return (
    typeof value.baseDate === "string" &&
    (value.observedAt === null || typeof value.observedAt === "string") &&
    typeof value.value === "number" &&
    isFireRiskGradeCode(value.gradeCode)
  );
}

function isFireRiskGradeCode(value: unknown): value is FireRiskGradeCode {
  return value === "low" || value === "moderate" || value === "high" || value === "very-high" || value === "very_high";
}

function normalizeFireRiskGrade(value: string): FireRiskGradeCode {
  if (value === "very_high" || value === "very-high") return "very-high";
  if (value === "high") return "high";
  if (value === "moderate") return "moderate";
  return "low";
}

function isApiSummaryResponse(value: unknown): value is ApiResponse<SummaryResponse> {
  if (!isRecord(value)) return false;
  return (
    (value.result === "SUCCESS" || value.result === "ERROR") &&
    (value.data === null || isSummaryResponse(value.data)) &&
    "error" in value
  );
}

function isApiDroughtReportListResponse(value: unknown): value is ApiResponse<DroughtReportListResponse> {
  if (!isRecord(value)) return false;
  return (
    (value.result === "SUCCESS" || value.result === "ERROR") &&
    (value.data === null || isDroughtReportListResponse(value.data)) &&
    "error" in value
  );
}

function isDroughtReportListResponse(value: unknown): value is DroughtReportListResponse {
  if (!isRecord(value)) return false;
  return Array.isArray(value.reports) && value.reports.every(isDroughtReportSummary);
}

function isApiDroughtReportDetailResponse(value: unknown): value is ApiResponse<DroughtReportDetail> {
  if (!isRecord(value)) return false;
  return (
    (value.result === "SUCCESS" || value.result === "ERROR") &&
    (value.data === null || isDroughtReportDetail(value.data)) &&
    "error" in value
  );
}

function isDroughtReportDetail(value: unknown): value is DroughtReportDetail {
  if (!isDroughtReportSummary(value) || !isRecord(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.body) &&
    record.body.every((paragraph) => typeof paragraph === "string") &&
    Array.isArray(record.mentionedRegions) &&
    record.mentionedRegions.every(isDroughtReportMentionedRegion) &&
    isDroughtReportVisualSummary(record.visualSummary) &&
    Array.isArray(record.sources) &&
    record.sources.every(isDroughtReportSource) &&
    typeof record.notice === "string"
  );
}

function isDroughtReportSummary(value: unknown): value is DroughtReportSummary {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    isDroughtReportImpact(value.impact) &&
    typeof value.impactName === "string" &&
    typeof value.level === "number" &&
    typeof value.publishedDate === "string" &&
    Array.isArray(value.regions) &&
    value.regions.every(isDroughtReportRegion) &&
    typeof value.summary === "string" &&
    typeof value.sourceArticleCount === "number" &&
    Array.isArray(value.keywords) &&
    value.keywords.every((keyword) => typeof keyword === "string")
  );
}

function isDroughtReportRegion(value: unknown): value is DroughtReportRegion {
  if (!isRecord(value)) return false;
  return (
    typeof value.regionCode === "string" &&
    typeof value.regionName === "string" &&
    typeof value.sidoName === "string" &&
    (value.note === null || typeof value.note === "string")
  );
}

function isDroughtReportSource(value: unknown): value is DroughtReportSource {
  if (!isRecord(value)) return false;
  return (
    typeof value.title === "string" &&
    (value.publisher === null || typeof value.publisher === "string") &&
    (value.publishedDate === null || typeof value.publishedDate === "string") &&
    (value.url === null || typeof value.url === "string")
  );
}

function isDroughtReportMentionedRegion(value: unknown): value is DroughtReportMentionedRegion {
  if (!isRecord(value)) return false;
  return (
    typeof value.sidoName === "string" &&
    (value.sigunguName === null || typeof value.sigunguName === "string") &&
    (value.sigunguCode === null || typeof value.sigunguCode === "string") &&
    (value.regionCode === null || typeof value.regionCode === "string") &&
    (value.regionName === null || typeof value.regionName === "string") &&
    (value.impactCode === null || typeof value.impactCode === "string") &&
    typeof value.impactName === "string" &&
    (value.note === null || typeof value.note === "string") &&
    (value.damageDetail === null || typeof value.damageDetail === "string")
  );
}

function isDroughtReportVisualSummary(value: unknown): value is DroughtReportVisualSummary {
  if (!isRecord(value)) return false;
  return (
    typeof value.articleCount === "number" &&
    typeof value.sourceCount === "number" &&
    typeof value.mentionedRegionCount === "number" &&
    Array.isArray(value.impactFields) &&
    value.impactFields.every(isDroughtReportImpactField)
  );
}

function isDroughtReportImpactField(value: unknown): value is DroughtReportImpactField {
  if (!isRecord(value)) return false;
  return (
    typeof value.impactCode === "string" &&
    typeof value.impactName === "string" &&
    typeof value.count === "number"
  );
}

function isDroughtReportImpact(value: unknown): value is DroughtReportSummary["impact"] {
  return value === "minor" || value === "moderate" || value === "severe" || value === "critical";
}

function isSummaryResponse(value: unknown): value is SummaryResponse {
  if (!isRecord(value)) return false;
  return (
    typeof value.generatedAt === "string" &&
    Array.isArray(value.alerts) &&
    value.alerts.every(isSummaryAlert) &&
    Array.isArray(value.kpis) &&
    value.kpis.every(isSummaryKpi)
  );
}

function isSummaryAlert(value: unknown): value is SummaryAlert {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.category === "string" &&
    typeof value.dataset === "string" &&
    typeof value.regionCode === "string" &&
    typeof value.regionName === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    isSummaryAlertSeverity(value.severity) &&
    typeof value.score === "number" &&
    typeof value.value === "number" &&
    typeof value.unit === "string" &&
    (value.observedAt === null || typeof value.observedAt === "string") &&
    typeof value.relatedReportCount === "number"
  );
}

function isSummaryKpi(value: unknown): value is SummaryKpi {
  if (!isRecord(value)) return false;
  return (
    typeof value.dataset === "string" &&
    typeof value.regionCode === "string" &&
    typeof value.regionName === "string" &&
    typeof value.name === "string" &&
    typeof value.value === "number" &&
    typeof value.unit === "string" &&
    (value.changeRate === null || typeof value.changeRate === "number") &&
    isSummaryAlertSeverity(value.severity) &&
    (value.observedAt === null || typeof value.observedAt === "string")
  );
}

function isSummaryAlertSeverity(value: unknown): value is SummaryAlertSeverity {
  return value === "info" || value === "warning" || value === "danger";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toDroughtReportView(
  report: DroughtReportSummary,
  body: string[] = [report.summary],
  sources: DroughtReportSource[] = [],
  mentionedRegions: DroughtReportMentionedRegion[] = [],
  visualSummary: DroughtReportVisualSummary = {
    articleCount: report.sourceArticleCount,
    sourceCount: sources.length,
    mentionedRegionCount: report.regions.length,
    impactFields: []
  }
): DroughtReportView {
  const regionLabels = report.regions.flatMap((region) => [region.regionName, region.sidoName]).filter(Boolean);
  const uniqueRegions = Array.from(new Set(regionLabels));
  const pinSource = mentionedRegions.length > 0
    ? mentionedRegions.map((region) => ({
      name: region.sigunguName ?? region.regionName ?? region.sidoName,
      note: region.note ?? `${region.sigunguName ?? region.regionName ?? region.sidoName} 지역 언급`
    }))
    : report.regions.map((region) => ({
      name: region.regionName,
      note: region.note ?? `${region.regionName} 지역 언급`
    }));
  const normalizedMentionedRegions = mentionedRegions.map((region) => ({
    sidoName: region.sidoName,
    sigunguName: region.sigunguName ?? "",
    sigunguCode: region.sigunguCode ?? "",
    regionCode: region.regionCode ?? "",
    regionName: region.regionName ?? "",
    impactCode: region.impactCode ?? "",
    impactName: region.impactName,
    note: region.note ?? "",
    damageDetail: region.damageDetail ?? ""
  }));

  return {
    id: report.id,
    title: report.title,
    level: Math.min(Math.max(report.level, 1), 4),
    levelName: report.impactName,
    date: report.publishedDate,
    regions: uniqueRegions.length > 0 ? uniqueRegions : ["전국"],
    summary: report.summary,
    count: report.sourceArticleCount,
    body,
    keywords: report.keywords,
    pins: pinSource,
    mentionedRegions: normalizedMentionedRegions,
    visualSummary,
    sources: sources.length > 0
      ? sources.map((source) => `${source.title}${source.publisher ? ` · ${source.publisher}` : ""}${source.url ? ` · ${source.url}` : ""}`)
      : []
  };
}

function articleListItemToDroughtReportSummary(article: ArticleListItem): DroughtReportSummary {
  const { impact, impactName, level } = articleImpact(article.sourceArticleCount, article.regionMentions.length);
  const regions = article.regionMentions.length > 0
    ? article.regionMentions.map((region) => ({
      regionCode: region,
      regionName: region,
      sidoName: "",
      note: `${region} 지역 언급`
    }))
    : [{ regionCode: "ALL", regionName: "전국", sidoName: "전국", note: null }];

  return {
    id: String(article.id),
    title: article.title,
    impact,
    impactName,
    level,
    publishedDate: article.updatedAt.slice(0, 10),
    regions,
    summary: article.autoSummaryNotice ?? `${article.authorOrganization}에서 등록한 가뭄 영향 자료입니다.`,
    sourceArticleCount: article.sourceArticleCount,
    keywords: article.keywords
  };
}

function normalizeArticlePage(page: PublicArticlePageResponse, uiPage: number, size: number): ArticlePage {
  const totalPages = Math.max(1, page.totalPages);
  const normalizedPage = clampUiPage(uiPage, totalPages);

  return {
    content: page.content.map(normalizeArticleListItem),
    page: normalizedPage,
    size,
    totalElements: page.totalElements,
    totalPages,
    first: normalizedPage === 1,
    last: normalizedPage === totalPages
  };
}

function normalizeArticleListItem(article: PublicArticleListItemResponse): ArticleListItem {
  return {
    id: article.id,
    title: article.title,
    authorOrganization: article.authorOrganization,
    updatedAt: article.updatedAt,
    views: article.views,
    documentType: article.documentType,
    subjectDomain: article.subjectDomain,
    source: article.source ?? null,
    extensions: article.extensions ?? [],
    sourceUrl: article.sourceUrl ?? null,
    sourceArticleCount: article.sourceArticleCount ?? 0,
    regionMentions: article.regionMentions ?? [],
    keywords: article.keywords ?? [],
    autoSummaryNotice: article.autoSummaryNotice ?? null
  };
}

function normalizeArticleDetail(article: PublicArticleDetailResponse): ArticleDetail {
  return {
    id: article.id,
    title: article.title,
    description: article.description,
    author: article.author,
    authorOrganization: article.authorOrganization,
    department: article.department,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    views: article.views,
    classification: article.classification,
    serviceType: article.serviceType,
    source: article.source ?? null,
    sourceUrl: article.sourceUrl ?? null,
    sourceArticleCount: article.sourceArticleCount ?? 0,
    regionMentions: article.regionMentions ?? [],
    keywords: article.keywords ?? [],
    autoSummaryNotice: article.autoSummaryNotice ?? null,
    files: article.files
  };
}

function articleDetailToDroughtReportDetail(article: ArticleDetail): DroughtReportDetail {
  const summary = articleListItemToDroughtReportSummary({
    id: article.id,
    title: article.title,
    authorOrganization: article.authorOrganization,
    updatedAt: article.updatedAt,
    views: article.views,
    documentType: article.classification?.code ?? article.classification?.name ?? "",
    subjectDomain: article.serviceType?.code ?? article.serviceType?.name ?? "",
    source: article.source,
    // 리포트 변환에는 확장자를 쓰지 않지만 목록 항목 형태를 맞춘다.
    extensions: article.files.map((file) => file.extension ?? "").filter(Boolean),
    sourceUrl: article.sourceUrl,
    sourceArticleCount: article.sourceArticleCount,
    regionMentions: article.regionMentions,
    keywords: article.keywords,
    autoSummaryNotice: article.autoSummaryNotice
  });
  const mentionedRegions = summary.regions.map((region) => ({
    sidoName: region.sidoName || region.regionName,
    sigunguName: region.regionName === "전국" ? null : region.regionName,
    sigunguCode: null,
    regionCode: region.regionCode,
    regionName: region.regionName,
    impactCode: null,
    impactName: summary.impactName,
    note: region.note,
    damageDetail: null
  }));

  return {
    ...summary,
    body: splitArticleBody(article.description),
    mentionedRegions,
    visualSummary: {
      articleCount: Math.max(article.sourceArticleCount, 1),
      sourceCount: article.sourceUrl ? 1 : 0,
      mentionedRegionCount: mentionedRegions.length,
      impactFields: article.keywords.slice(0, 5).map((keyword, index) => ({
        impactCode: `keyword-${index + 1}`,
        impactName: keyword,
        count: 1
      }))
    },
    sources: article.sourceUrl
      ? [{
        title: article.source ?? article.title,
        publisher: article.authorOrganization,
        publishedDate: article.updatedAt.slice(0, 10),
        url: article.sourceUrl
      }]
      : [],
    notice: article.autoSummaryNotice ?? "자료실 게시글을 기반으로 구성한 리포트입니다."
  };
}

function splitArticleBody(description: string) {
  const paragraphs = description
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return paragraphs.length > 0 ? paragraphs : ["상세 설명이 등록되지 않았습니다."];
}

function articleImpact(sourceArticleCount: number, regionCount: number): Pick<DroughtReportSummary, "impact" | "impactName" | "level"> {
  const score = sourceArticleCount + regionCount;
  if (score >= 8) return { impact: "critical", impactName: "심각", level: 4 };
  if (score >= 5) return { impact: "severe", impactName: "높음", level: 3 };
  if (score >= 2) return { impact: "moderate", impactName: "보통", level: 2 };
  return { impact: "minor", impactName: "낮음", level: 1 };
}

function toDisplayPrice(value: number, multiplier: number) {
  return value * multiplier;
}

function toOptionalDisplayPrice(value: number | null | undefined, multiplier: number) {
  if (value === null || value === undefined) {
    return null;
  }

  return toDisplayPrice(value, multiplier);
}

function displayUnit(unit: string, fallback: string) {
  return unit === "KRW/kg" ? fallback : unit;
}

function displayKpiUnit(unit: string, fallback: string) {
  return unit === "KRW/kg" ? fallback : unit;
}

function formatWholeNumber(value: number) {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(value);
}

function formatDecimalNumber(value: number) {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(value);
}

function displayHydropowerUnit(unit: string) {
  if (unit === "GWh/month") return "GWh / 월";
  if (unit === "MWh/month") return "MWh / 월";
  return unit;
}

function displayHydropowerKpiUnit(unit: string) {
  if (unit === "GWh/month") return "GWh/월";
  if (unit === "MWh/month") return "MWh/월";
  return unit;
}

function displayFreshFoodUnit(unit: string) {
  return unit === "index_2020_100" ? "2020=100" : unit;
}

function formatSignedPercent(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatNullableSignedPercent(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return formatSignedPercent(value);
}

function formatSignedWholeNumber(value: number) {
  const rounded = Math.round(value);
  const sign = rounded >= 0 ? "+" : "";
  return `${sign}${rounded}`;
}

function formatErrorRate(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  const percent = Math.abs(value) < 1 ? value * 100 : value;
  return `${percent.toFixed(1)}%`;
}

function percentDelta(current: number, previous: number) {
  if (previous === 0) {
    return 0;
  }

  return ((current - previous) / previous) * 100;
}

// ===== 가뭄 자료실 (archive) =====

/** UI는 1-base, 백엔드는 0-base. 변환은 여기 한 곳에서만 한다. */
export function toApiPage(uiPage: number | undefined): number {
  if (!uiPage || uiPage < 1) return 0;
  return uiPage - 1;
}

/**
 * 범위를 벗어난 page 를 실제 존재하는 범위로 되돌린다.
 *
 * 서버는 page 를 보정하지 않고 요청값을 그대로 되돌려준다(page=999 → 200, content:[], page:999).
 * 그래서 응답만 믿으면 "999 / 9 페이지" 같은 표기가 나온다. totalPages 와 대조해 여기서 접는다.
 * totalPages 가 0 인 응답(자료 0건)도 1 페이지로 본다.
 */
export function clampUiPage(uiPage: number | undefined, totalPages: number): number {
  if (!uiPage || uiPage < 1) return 1;
  return Math.min(uiPage, Math.max(1, totalPages));
}

type Envelope<T> = { result: string; data: T | null; error: unknown };

async function getOpenApiData<T>(path: string, search: URLSearchParams | null, signal?: AbortSignal): Promise<T> {
  const url = new URL(path, API_BASE_URLS.open);
  if (search) search.forEach((value, key) => url.searchParams.set(key, value));

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Open API request failed with ${response.status}`);
  }

  const payload = (await response.json()) as ApiResponse<T>;
  if (payload.result !== "SUCCESS" || payload.data === null) {
    throw new Error("Open API returned an invalid response");
  }

  return payload.data;
}

async function getPublicApiData<T>(path: string, search: URLSearchParams | null, signal?: AbortSignal): Promise<T> {
  const url = new URL(path, API_BASE_URLS.public);
  if (search) search.forEach((value, key) => url.searchParams.set(key, value));

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new ArchiveApiError("요청이 실패했습니다.", response.status);
  }

  const payload = (await response.json()) as PublicApiResponse<T> & Envelope<T>;
  if ("result" in payload && payload.result !== "SUCCESS") {
    throw new ArchiveApiError("서버가 올바르지 않은 응답을 반환했습니다.", response.status);
  }
  if (payload.data === null || payload.data === undefined) {
    throw new ArchiveApiError("서버가 올바르지 않은 응답을 반환했습니다.", response.status);
  }

  return payload.data;
}

async function getEnveloped<T>(path: string, search: URLSearchParams | null, signal?: AbortSignal): Promise<T> {
  return getPublicApiData(path, search, signal);
}

export class ArchiveApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ArchiveApiError";
    this.status = status;
  }
}

export async function fetchArticles(
  params: ArticleSearchParams,
  { signal }: { signal?: AbortSignal } = {}
): Promise<ArticlePage> {
  const search = new URLSearchParams();
  if (params.query) search.set("query", params.query);
  if (params.documentType) search.set("documentType", params.documentType);
  if (params.subjectDomain) search.set("subjectDomain", params.subjectDomain);
  if (params.source) search.set("source", params.source);
  search.set("page", String(toApiPage(params.page)));
  search.set("size", String(params.size ?? 10));
  // 목록은 updatedAt을 표시하므로 정렬 기준도 updatedAt으로 맞춘다(기본 정렬은 createdAt).
  search.set("sort", "updatedAt,desc");
  return normalizeArticlePage(
    await getEnveloped<PublicArticlePageResponse>("/api/v1/articles", search, signal),
    params.page ?? 1,
    params.size ?? 10
  );
}

export async function fetchArticleDetail(
  id: number,
  { signal }: { signal?: AbortSignal } = {}
): Promise<ArticleDetail> {
  return normalizeArticleDetail(await getEnveloped<PublicArticleDetailResponse>(`/api/v1/articles/${id}`, null, signal));
}

/**
 * 주의: 이 엔드포인트(CategoryController)는 다른 article API와 달리 ApiResponse로
 * 감싸지 않고 DTO를 그대로 반환한다(실제 백엔드로 검증함). getEnveloped를 쓰지 않는다.
 */
export async function fetchArticleCategories(
  { signal }: { signal?: AbortSignal } = {}
): Promise<ArticleCategories> {
  const url = new URL("/api/v1/article-categories", API_BASE_URLS.public);
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new ArchiveApiError("요청이 실패했습니다.", response.status);
  }
  return (await response.json()) as ArticleCategories;
}

/** 다운로드는 fetch가 아니라 <a href download> 로 건다. */
export function buildFileDownloadUrl(fileId: number): string {
  return new URL(`/api/v1/multipart-upload/files/${fileId}/download`, API_BASE_URLS.public).toString();
}

async function postEnveloped<T>(path: string, body: unknown, method: "POST" | "PATCH" | "DELETE" = "POST"): Promise<T | null> {
  const response = await fetch(new URL(path, API_BASE_URLS.public), {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    // 백엔드는 비밀번호 불일치를 401이 아니라 400(E400 Invalid parameter format.)으로 응답하고,
    // 실제 원인은 error.data 문자열("Invalid password.")로만 구분할 수 있다. 400은 잘못된
    // 요청 형식일 때도 나오므로 상태코드만으로는 판별 불가 — 본문을 파싱해 확인한다.
    // 본문이 비어있거나 JSON이 아니어도(파싱 실패) 일반 메시지로 안전하게 폴백한다.
    let errorData: unknown = null;
    try {
      const errorText = await response.text();
      if (errorText) {
        const parsed = JSON.parse(errorText) as { error?: { data?: unknown; details?: unknown } };
        errorData = parsed?.error?.data ?? parsed?.error?.details ?? null;
      }
    } catch {
      errorData = null;
    }
    const isInvalidPassword = typeof errorData === "string" && errorData.includes("Invalid password");
    throw new ArchiveApiError(
      isInvalidPassword ? "비밀번호가 일치하지 않습니다."
      : response.status === 401 ? "비밀번호가 일치하지 않습니다."
      : response.status === 404 ? "게시글을 찾을 수 없습니다."
      : "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.",
      response.status
    );
  }
  const text = await response.text();
  if (!text) return null;
  const payload = JSON.parse(text) as PublicApiResponse<T> & Envelope<T>;
  if ("result" in payload && payload.result !== "SUCCESS") {
    throw new ArchiveApiError("서버가 올바르지 않은 응답을 반환했습니다.", response.status);
  }
  return payload.data ?? null;
}

export async function createArticleWithFiles(
  payload: ArticleFormValues & { completedFiles: CompletedFileUpload[] }
): Promise<{ id: number }> {
  const data = await postEnveloped<{ id: number }>("/api/v1/articles-with-files", payload);
  if (!data) throw new ArchiveApiError("등록 결과를 받지 못했습니다.", 500);
  return data;
}

/**
 * 폼에는 없지만 백엔드 UpdateArticleRequest/approveUpdate가 무조건 덮어쓰는 필드들.
 * 수정 요청에 원본 값을 그대로 실어 보내지 않으면 승인 시 null/0/[]로 유실된다.
 */
export type ArticleUpdatePassthroughFields = {
  sourceUrl: string | null;
  sourceArticleCount: number;
  regionMentions: string[];
  keywords: string[];
  autoSummaryNotice: string | null;
};

/**
 * 주의: 등록은 `completedFiles`, 수정은 `newFiles` 로 필드명이 다르다.
 * 백엔드 UpdateArticleRequest 가 받는 이름은 newFiles 다.
 */
export async function updateArticle(
  id: number,
  payload: ArticleFormValues & ArticleUpdatePassthroughFields & { newFiles?: CompletedFileUpload[] }
): Promise<void> {
  await postEnveloped<null>(`/api/v1/articles/${id}`, payload, "PATCH");
}

export async function deleteArticle(
  id: number,
  payload: { reason: string; password: string }
): Promise<void> {
  await postEnveloped<null>(`/api/v1/articles/${id}`, payload, "DELETE");
}
