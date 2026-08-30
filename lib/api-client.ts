import type { ForecastKey, fireRisk, forecasts, kpis } from "@/lib/mock-data";
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
  buildVintagePriceSeries,
  monthsMissingActual,
  vintageBoundaryDate,
  yearlyAccuracy,
  walkforwardAccuracy,
  type YearAccuracy,
  type VintagePricePoint,
  type VintagePriceSeries,
  type RawMarketTrendPoint
} from "@/lib/vintage-price-series";
import {
  buildHydropowerVintageSeries,
  type HydropowerActualEntry,
  type HydropowerPredictionEntry,
  type HydropowerVintagePoint,
  type HydropowerVintageSeries
} from "@/lib/hydropower-vintage";
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

export type PredictionVintageSource =
  | "live"
  | "reconstructed_forecast"
  | "reconstructed_nowcast_walkforward"
  | "reconstructed_walkforward";

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
export type OverlayForecastView = {
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
  points: VintagePricePoint[];
  boundaryDate: string;
  /** 미래선의 리드타임이 바뀌는 날. 오차율이 설명하지 못하는 구간의 시작이다. */
  horizonSwitchDate: string | null;
  latestActualDate: string | null;
};

export type PriceForecastView = typeof forecasts.cabbage;
export type PriceKpiView = (typeof kpis)[number];

/**
 * 수력발전량도 양파처럼 실측 뒤에 예측을 이어 붙이는 모양이 아니라 같은 날짜축 위에
 * 겹치는 모양이다 — 과거에 예측한 값과 그 달의 실측이 나란히, 그리고 미래는 예측만.
 */
export type HydropowerStorageView = {
  current: string;
  unit: string;
  sub: string;
  points: HydropowerVintagePoint[];
  boundaryDate: string;
};

export type HydropowerForecastView = {
  label: string;
  current: string;
  unit: string;
  error: string;
  errorNote: string;
  source: string;
  sub: string;
  note: string;
  /** 연도별 정확도(발전량 기준). 큰 숫자는 마지막 항목을 쓴다. */
  years: YearAccuracy[];
  points: HydropowerVintagePoint[];
  boundaryDate: string;
  latestActualDate: string | null;
  /** 같은 댐의 저수량 시계열. 실측·예측이 전혀 없으면 null. */
  storage: HydropowerStorageView | null;
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

export type DroughtGrade = "관심" | "주의" | "경계" | "심각";

export type DroughtImpactBucket = {
  impactCode: string;
  impactName: string;
  grade: DroughtGrade;
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
  maxGrade: DroughtGrade | null;
};

export type DroughtReportListItem = {
  reportYm: string;
  headlineGrade: DroughtGrade | null;
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

/**
 * 목록/상세 화면이 공통으로 쓰는 뷰 타입. 목록에서 만든 뷰는 detailLoaded=false로
 * regions/nationwide가 빈 배열 — 상세 진입 시 실제 상세를 불러오면 detailLoaded=true로 채워진다.
 * (감지된 지역이 진짜 0건인 상태와 "아직 상세를 못 불러온" 상태를 이 플래그로 구분한다.)
 */
export type DroughtReportDetailView = {
  reportYm: string;
  headlineGrade: DroughtGrade | null;
  generatedAt: string | null;
  articleCount: number;
  detectedSidoCount: number;
  detectedSidoNames: string[];
  nationwide: DroughtSidoStatus[];
  regions: DroughtRegionSection[];
  detailLoaded: boolean;
};

type FetchPriceForecastOptions = {
  signal?: AbortSignal;
  year?: number;
  month?: number;
};

type FetchHydropowerVintageOptions = {
  signal?: AbortSignal;
  damName?: string;
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
  page?: number;
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
 * 기준일 이후 행은 실측이 아니라 예측으로 채워져 있어 그대로 쓰면 안 된다 — vintage-price-series 가 자른다.
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

type OpenHydropowerReservoirResponse = {
  damName: string;
  damCode: string;
  monthlyReservoirStatusDto: {
    year: string;
    month: string;
    waterLevelElm: number | null;
    waterStorageMcm: number | null;
  }[];
};

type OpenHydropowerPredictionHistoryResponse = {
  damName: string;
  damCode: string;
  entries: {
    year: string;
    month: string;
    predictedPowerGenerationLowerBound: number | null;
    predictedPowerGenerationUpperBound: number | null;
    predictedWaterStorageLowerBound: number | null;
    predictedWaterStorageUpperBound: number | null;
  }[];
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
  kpiName: string;
  /** 실제로 시장이 서는 달만. 안 주면(온션처럼 사철 거래) 모든 달의 예측을 그린다. */
  seasonMonths?: number[];
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
    kpiName: "고랭지배추 도매가격",
    // 고랭지배추는 2022년부터 줄곧 7~10월에만 실제로 거래됐다 — 그 외 달은 forecast
    // 모델이 lag+달력 정보만으로 값을 뽑아낼 뿐 근거가 없어 예측선을 그리지 않는다.
    seasonMonths: [7, 8, 9, 10]
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

/** daily-price 가 쓰는 location 과 동일한 값을 얻는다("합천") — 호출부에서 문자열을 직접 하드코딩하지 않게. */
export function priceForecastLocation(key: PriceForecastKey): string {
  return PRICE_FORECAST_CONFIG[key].location;
}

/**
 * 절대 가격값에 곱해야 하는 배수. 배추는 모델이 원/kg 로 내지만 화면은 원/10kg망
 * 관행이라 10, 양파는 원/kg 그대로라 1 — 테스트가 이 값을 그대로 참조해 하드코딩된
 * 10/1 이 설정과 어긋나지 않게 한다.
 */
export function priceForecastDisplayMultiplier(key: PriceForecastKey): number {
  return PRICE_FORECAST_CONFIG[key].displayMultiplier;
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
          // 없는 달은 E404 다. 그 구간만 실측선이 끊길 뿐이라 나머지로 계속 그린다.
          if (signal?.aborted) throw error;
          return [];
        }
      })
    );
    trends.push(...batch.flat());
  }

  const multiplier = PRICE_FORECAST_CONFIG[key].displayMultiplier;
  return buildVintagePriceSeries({
    entries: scaleVintageEntriesForDisplay(vintage.entries, multiplier),
    market: scaleMarketTrendForDisplay(trends, multiplier),
    seasonMonths: PRICE_FORECAST_CONFIG[key].seasonMonths ?? null
  });
}

/**
 * 배추의 기반 모델은 원/kg 로 값을 내지만 화면은 "원/10kg망" 관행으로 표시한다
 * (displayMultiplier=10). 양파는 원/kg 그대로라 배수가 1 이라 이 변환이 없어도
 * 결과가 같다. onion 이 이 함수를 거쳐도 값이 그대로인 걸 테스트가 확인한다.
 *
 * vintage-price-series 의 순수 로직(합계·오차율 계산)은 건드리지 않는다 — 실측·예측
 * 양쪽을 같은 배수로 미리 스케일해서 넘기면, 그 비율로 계산하는 delta·errorRate 는
 * 배수가 상쇄돼 자동으로 맞는 값이 나온다.
 */
export function scaleVintageEntriesForDisplay(
  entries: PredictionVintageEntry[],
  multiplier: number
): PredictionVintageEntry[] {
  return entries.map((entry) => ({
    ...entry,
    pred: toDisplayPrice(entry.pred, multiplier),
    actual: toOptionalDisplayPrice(entry.actual, multiplier)
    // arrivalTon 은 물량이라 가격 배수의 영향을 받지 않는다.
  }));
}

export function scaleMarketTrendForDisplay(
  points: RawMarketTrendPoint[],
  multiplier: number
): RawMarketTrendPoint[] {
  return points.map((point) => ({
    ...point,
    avgWholesalePrice: toOptionalDisplayPrice(point.avgWholesalePrice, multiplier)
    // marketVolume 은 물량이라 가격 배수의 영향을 받지 않는다.
  }));
}

export function toOverlayForecastView(
  key: PriceForecastKey,
  series: VintagePriceSeries,
  entries: PredictionVintageEntry[]
): OverlayForecastView | null {
  if (series.points.length === 0) {
    return null;
  }

  const config = PRICE_FORECAST_CONFIG[key];
  const years = yearlyAccuracy(series.points);
  const latestYear = years.at(-1) ?? null;
  // walk-forward(매달 그 시점까지의 데이터로만 재학습해 검증한 진짜 out-of-sample 표본)가
  // 있으면 그 값이 우선이다 — in-sample 재구성보다 훨씬 신뢰할 수 있다. 아직 이 백테스트를
  // 안 돌린 품목(고랭지배추 등)은 표본이 없어 자동으로 연도별 in-sample 계산으로 떨어진다.
  const walkforward = walkforwardAccuracy(entries);
  const dated = series.latestActualDate ?? series.boundaryDate;
  const change = series.delta === null ? "" : ` · 전일대비 ${formatSignedPercent(series.delta)}`;

  return {
    label: config.label,
    current: series.current === null ? "–" : formatWholeNumber(series.current),
    unit: config.displayUnit,
    // 전체 평균은 유난히 어려웠던 해가 끌어올린다. 최근 연도가 "지금 이 예측선을 믿어도
    // 되나" 에 더 맞는 답이라 큰 숫자는 마지막 연도를 쓴다.
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
    // 과거 예측선은 지금 모델로 과거를 되짚은 값이다. "그때 실제로 이렇게 예측했다" 가
    // 아니라는 걸 화면에 적어 두지 않으면 정확도를 실제보다 후하게 읽게 된다.
    note: [
      `실측은 ${series.boundaryDate}까지 · 그 뒤는 예측만`,
      // walk-forward 값은 이미 진짜 out-of-sample 이라 이 캐비어트가 필요 없다.
      walkforward !== null
        ? null
        : `과거 예측선은 현재 모델(${series.boundaryDate} 학습)로 되짚은 재구성 예측이라, 연도별 차이는 모델의 발전이 아니라 그 해의 난이도다`,
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
    spark,
    target: key
  };
}

/** open-api 가 찾는 댐 이름은 접미사 없는 짧은 이름이다 — "합천댐"으로 물으면 E404. */
export const HYDROPOWER_DAMS = [
  { queryName: "합천", label: "합천댐" },
  { queryName: "소양강", label: "소양강댐" },
  { queryName: "충주", label: "충주댐" },
  { queryName: "대청", label: "대청댐" }
] as const;

export type HydropowerDamName = (typeof HYDROPOWER_DAMS)[number]["queryName"];

export const DEFAULT_HYDROPOWER_DAM: HydropowerDamName =
  (HYDROPOWER_DAMS.find((dam) => dam.queryName === process.env.NEXT_PUBLIC_HYDROPOWER_DAM_NAME)?.queryName) ?? "합천";

/**
 * 댐 하나의 전체 예측 이력(monthly-predict-history)과, 그 이력이 걸친 연도만큼의 실측
 * (monthly-generation·monthly-reservoir, 둘 다 연 단위 조회라 연도 수만큼 병렬로 부른다)을
 * 합쳐 발전량·저수량 두 vintage 시계열을 만든다. 예측 쪽은 이미 한 응답에 두 지표가 같이
 * 온다(predictedPowerGenerationDto/predictedWaterStorageDto 성격의 필드).
 */
export async function fetchHydropowerVintage({ signal, damName }: FetchHydropowerVintageOptions = {}) {
  const dam = damName ?? DEFAULT_HYDROPOWER_DAM;
  const history = await getOpenApiData<OpenHydropowerPredictionHistoryResponse>(
    "/api/v1/hydropower/monthly-predict-history",
    new URLSearchParams({ damName: dam }),
    signal
  );

  const generationPredictions: HydropowerPredictionEntry[] = history.entries.map((entry) => ({
    year: entry.year,
    month: entry.month,
    lowerBound: entry.predictedPowerGenerationLowerBound,
    upperBound: entry.predictedPowerGenerationUpperBound
  }));
  const storagePredictions: HydropowerPredictionEntry[] = history.entries.map((entry) => ({
    year: entry.year,
    month: entry.month,
    lowerBound: entry.predictedWaterStorageLowerBound,
    upperBound: entry.predictedWaterStorageUpperBound
  }));

  const predictionYears = history.entries.map((entry) => Number(entry.year));
  const minYear = predictionYears.length > 0 ? Math.min(...predictionYears) : OPEN_API_DEFAULT_PERIOD.year;
  const maxYear = predictionYears.length > 0 ? Math.max(...predictionYears) : OPEN_API_DEFAULT_PERIOD.year;

  const actualsByYear = await Promise.all(
    Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index).map(async (year) => {
      const yearSearch = new URLSearchParams({ year: String(year), damName: dam });
      const [generation, reservoir] = await Promise.all([
        getOpenApiData<OpenHydropowerGenerationResponse>("/api/v1/hydropower/monthly-generation", yearSearch, signal).catch((error) => {
          // 이력이 걸친 연도 중 실측이 아직 없는 해(예: 미래 예측만 있는 연도)는 404가 정상이다 —
          // 한 해가 없다고 나머지 연도까지 안 보여주면 안 된다.
          if (signal?.aborted) throw error;
          return null;
        }),
        getOpenApiData<OpenHydropowerReservoirResponse>("/api/v1/hydropower/monthly-reservoir", yearSearch, signal).catch((error) => {
          if (signal?.aborted) throw error;
          return null;
        })
      ]);
      return {
        generation: generation?.monthlyGenerationDto ?? [],
        reservoir: reservoir?.monthlyReservoirStatusDto ?? []
      };
    })
  );

  const generationActuals: HydropowerActualEntry[] = actualsByYear
    .flatMap((year) => year.generation)
    .map((entry) => ({ year: entry.year, month: entry.month, value: entry.actualMwh }));
  const storageActuals: HydropowerActualEntry[] = actualsByYear
    .flatMap((year) => year.reservoir)
    .map((entry) => ({ year: entry.year, month: entry.month, value: entry.waterStorageMcm }));

  return {
    damName: history.damName,
    generation: buildHydropowerVintageSeries(generationPredictions, generationActuals),
    storage: buildHydropowerVintageSeries(storagePredictions, storageActuals)
  };
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

export async function fetchDroughtReports(
  { signal, page = 0, size = 20 }: FetchDroughtReportsOptions = {}
): Promise<DroughtReportListPage> {
  const search = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "reportYm,desc"
  });
  return getOpenApiData<DroughtReportListPage>("/api/v1/drought/reports", search, signal);
}

export async function fetchDroughtReportDetail(
  reportYm: string,
  { signal }: FetchDroughtReportDetailOptions = {}
): Promise<DroughtReportDetail> {
  return getOpenApiData<DroughtReportDetail>(`/api/v1/drought/reports/${encodeURIComponent(reportYm)}`, null, signal);
}

/**
 * 1월은 K-water 발전량이 연간 누계에서 0으로 리셋되는 달이라, 예측 구간도 이 시점에
 * 유난히 불안정해져 오차가 수백%로 치솟는다(2026-01 합천댐 기준 실측 대비 580%).
 * 나머지 달은 대개 한 자릿수~30%대라, 1월 하나를 같이 평균 내면 그 왜곡이 정확도
 * 전체를 뒤덮는다 — 그래서 정확도 계산에서만 뺀다.
 */
function excludeJanuaryReset(points: HydropowerVintagePoint[]): HydropowerVintagePoint[] {
  return points.filter((point) => point.date.slice(5, 7) !== "01");
}

export function toHydropowerForecastView(
  damLabel: string,
  generation: HydropowerVintageSeries,
  storage: HydropowerVintageSeries | null
): HydropowerForecastView {
  const dated = generation.latestActualDate ?? generation.boundaryDate;
  const change = generation.delta === null ? "" : ` · 전월대비 ${formatSignedPercent(generation.delta)}`;
  const years = yearlyAccuracy(excludeJanuaryReset(generation.points));
  const latestYear = years.at(-1) ?? null;

  return {
    label: "수력발전량",
    current: generation.current === null ? "–" : formatWholeNumber(generation.current),
    unit: "MWh / 월",
    // 전체 평균은 유난히 어려웠던 해가 끌어올린다. 최근 연도가 "지금 이 예측선을 믿어도
    // 되나" 에 더 맞는 답이라 큰 숫자는 마지막 연도를 쓴다(양파와 동일 규칙).
    error: latestYear === null ? "N/A" : `${latestYear.mape.toFixed(1)}%`,
    errorNote: latestYear === null
      ? "실측과 겹치는 구간 없음"
      : `${latestYear.year}년 평균 오차율 · 표본 ${latestYear.sampleDays}개월`,
    source: "open-api /api/v1/hydropower/monthly-generation · monthly-reservoir · monthly-predict-history",
    sub: `${damLabel} · ${dated}${change}`,
    // 2022-01~2024-10 은 2026-08-30 walk-forward 재구성 예측이라, 그 구간이 낀 연도의
    // 오차율 차이는 모델의 발전이 아니라 그 해의 난이도다 — 적어 두지 않으면 정확도를
    // 실제보다 후하게 읽게 된다(양파와 동일 취지).
    note: [
      "예측값은 모델이 낸 상·하한의 중점 근사치입니다",
      "1월은 K-water 발전량이 연간 누계에서 0으로 리셋돼 오차가 일시적으로 치솟는 달이라 정확도 계산에서 제외했습니다",
      "2022-01~2024-10 구간은 2026-08-30 walk-forward 재구성 예측이라, 연도별 오차율 차이는 모델의 발전이 아니라 그 해의 난이도입니다"
    ].join(" · "),
    years,
    points: generation.points,
    boundaryDate: generation.boundaryDate,
    latestActualDate: generation.latestActualDate,
    storage: storage === null ? null : {
      current: storage.current === null ? "–" : formatWholeNumber(storage.current),
      unit: "백만㎥ / 월",
      sub: `${damLabel} · ${storage.latestActualDate ?? storage.boundaryDate}`,
      points: storage.points,
      boundaryDate: storage.boundaryDate
    }
  };
}

export function toHydropowerKpiView(damLabel: string, series: HydropowerVintageSeries): PriceKpiView | null {
  if (series.current === null) {
    return null;
  }

  const delta = series.delta ?? 0;
  const spark = series.points
    .filter((point) => point.actual !== null)
    .slice(-7)
    .map((point) => point.actual as number);
  const latestYearMape = yearlyAccuracy(excludeJanuaryReset(series.points)).at(-1)?.mape ?? null;

  return {
    tag: "예측 · 에너지",
    region: damLabel,
    name: "수력발전량",
    value: formatWholeNumber(series.current),
    unit: "MWh/월",
    delta: formatSignedPercent(delta),
    direction: delta >= 0 ? "up" : "down",
    error: latestYearMape === null ? "N/A" : `${latestYearMape.toFixed(1)}%`,
    spark,
    target: "hydro"
  };
}

export function toDroughtReportListViews(page: DroughtReportListPage): DroughtReportDetailView[] {
  return page.content.map((item) => ({
    reportYm: item.reportYm,
    headlineGrade: item.headlineGrade,
    generatedAt: null,
    articleCount: item.articleCount,
    detectedSidoCount: item.detectedSidoCount,
    detectedSidoNames: item.detectedSidoNames,
    nationwide: [],
    regions: [],
    detailLoaded: false
  }));
}

export function toDroughtReportDetailView(detail: DroughtReportDetail): DroughtReportDetailView {
  const headlineGrade = detail.nationwide
    .map((status) => status.maxGrade)
    .filter((grade): grade is DroughtGrade => grade !== null)
    .reduce<DroughtGrade | null>(
      (highest, grade) => (highest === null || DROUGHT_GRADE_ORDER[grade] > DROUGHT_GRADE_ORDER[highest] ? grade : highest),
      null
    );

  return {
    reportYm: detail.reportYm,
    headlineGrade,
    generatedAt: detail.generatedAt,
    articleCount: detail.articleCount,
    detectedSidoCount: detail.detectedSidoCount,
    detectedSidoNames: detail.nationwide.filter((status) => status.detected).map((status) => status.sido),
    nationwide: detail.nationwide,
    regions: detail.regions,
    detailLoaded: true
  };
}

const DROUGHT_GRADE_ORDER: Record<DroughtGrade, number> = { 관심: 0, 주의: 1, 경계: 2, 심각: 3 };

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
    (value.source === "live" || value.source === "reconstructed_forecast" || value.source === "reconstructed_nowcast_walkforward" || value.source === "reconstructed_walkforward") &&
    (value.modelType === null || typeof value.modelType === "string") &&
    (value.modelTrainEndDate === null || typeof value.modelTrainEndDate === "string") &&
    typeof value.pred === "number" &&
    (value.actual === null || typeof value.actual === "number") &&
    (value.arrivalTon === null || typeof value.arrivalTon === "number")
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

function splitArticleBody(description: string) {
  const paragraphs = description
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return paragraphs.length > 0 ? paragraphs : ["상세 설명이 등록되지 않았습니다."];
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
