import type { ForecastKey, fireRisk, forecasts, kpis, reports } from "@/lib/mock-data";
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

export type FreshFoodIndexPoint = {
  baseMonth: string;
  value: number;
};

export type FreshFoodIndexResponse = {
  indexCode: "fresh-food-index";
  unit: "index_2020_100";
  baseMonth: string;
  value: number;
  monthOverMonthRate: number | null;
  yearOverYearRate: number | null;
  points: FreshFoodIndexPoint[];
};

export type FreshFoodGaugeView = {
  value: string;
  baseMonth: string;
  monthOverMonthRate: string;
  yearOverYearRate: string;
  series: number[];
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

type OpenFreshVegetableIndexResponse = {
  baseDate: string;
  provinceData: {
    code: number;
    province: string;
    freshVegetableIndex: number | null;
    grade: string;
  }[];
  summary: Record<string, number>;
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

type PublicArticleListItemResponse = Omit<ArticleListItem, "sourceUrl" | "sourceArticleCount" | "regionMentions" | "keywords" | "autoSummaryNotice"> &
  Partial<Pick<ArticleListItem, "sourceUrl" | "sourceArticleCount" | "regionMentions" | "keywords" | "autoSummaryNotice">>;

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
  const points = data.calendarData
    .filter((point) => typeof point.predictedPrice === "number")
    .map((point) => ({
      baseDate: point.predictionDate,
      value: point.predictedPrice as number,
      dataType: "observed" as const
    }));

  return {
    item: config.item,
    regionCode: config.region,
    unit: "KRW/kg",
    errorRate: null,
    points
  } satisfies PriceForecastResponse;
}

export async function fetchHydropowerForecast({ signal, year, month }: FetchHydropowerForecastOptions = {}) {
  const damName = process.env.NEXT_PUBLIC_HYDROPOWER_DAM_NAME ?? "합천댐";
  const search = new URLSearchParams({
    year: String(year ?? OPEN_API_DEFAULT_PERIOD.year),
    month: String(month ?? OPEN_API_DEFAULT_PERIOD.month),
    damName
  });
  const data = await getOpenApiData<OpenHydropowerGenerationResponse>("/api/v1/hydropower/monthly-generation", search, signal);
  const points = data.monthlyGenerationDto
    .filter((point) => typeof point.actualMwh === "number" || typeof point.plannedMwh === "number")
    .map((point) => ({
      baseDate: `${point.year}-${point.month.padStart(2, "0")}-01`,
      value: (point.actualMwh ?? point.plannedMwh) as number,
      dataType: "observed" as const,
      lowerBound: point.plannedMwh ?? null,
      upperBound: point.plannedMwh ?? null
    }));

  return {
    plant: "hapcheon-dam",
    regionCode: "48890",
    unit: "MWh/month",
    errorRate: null,
    points
  } satisfies HydropowerForecastResponse;
}

export async function fetchFireRiskIndex({ signal }: FetchFireRiskIndexOptions = {}) {
  const forecasts = await getOpenApiData<OpenWildFireForecastResponse>("/api/v1/wild-fire-risk/forecast", null, signal);
  const latest = forecasts.at(-1);
  const regions = latest?.regionData
    .filter((region) => typeof region.indexValue === "number")
    .map((region) => {
      const matchingPoints = forecasts
        .map((forecast) => forecast.regionData.find((candidate) => candidate.regionCode === region.regionCode))
        .filter((point): point is OpenWildFireRegion => Boolean(point) && typeof point?.indexValue === "number")
        .map((point, index) => ({
          baseDate: forecasts[index]?.targetDate ?? latest.targetDate,
          observedAt: `${forecasts[index]?.targetDate ?? latest.targetDate} ${forecasts[index]?.targetTime ?? latest.targetTime}`,
          value: point.indexValue as number,
          gradeCode: normalizeFireRiskGrade(point.riskLevel)
        }));

      return {
        regionCode: region.regionCode,
        regionName: region.regionCode,
        value: region.indexValue as number,
        gradeCode: normalizeFireRiskGrade(region.riskLevel),
        change: 0,
        observedAt: `${latest.targetDate} ${latest.targetTime}`,
        points: matchingPoints
      };
    }) ?? [];

  return {
    unit: "score_0_100",
    regions
  } satisfies FireRiskIndexResponse;
}

export async function fetchFreshFoodIndex({ signal, year, month }: FetchFreshFoodIndexOptions = {}) {
  const search = new URLSearchParams({
    year: String(year ?? OPEN_API_DEFAULT_PERIOD.year),
    month: String(month ?? OPEN_API_DEFAULT_PERIOD.month)
  });
  const data = await getOpenApiData<OpenFreshVegetableIndexResponse>("/api/v1/freshfood/fresh-vegetable", search, signal);
  const values = data.provinceData
    .map((province) => province.freshVegetableIndex)
    .filter((value): value is number => typeof value === "number");
  const average = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

  return {
    indexCode: "fresh-food-index",
    unit: "index_2020_100",
    baseMonth: data.baseDate.slice(0, 7),
    value: average,
    monthOverMonthRate: null,
    yearOverYearRate: null,
    points: data.provinceData
      .filter((province) => typeof province.freshVegetableIndex === "number")
      .map((province) => ({
        baseMonth: `${data.baseDate.slice(0, 7)} ${province.province}`,
        value: province.freshVegetableIndex as number
      }))
  } satisfies FreshFoodIndexResponse;
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
  return response.points.at(-1)?.baseDate ?? null;
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
    sido: FIRE_RISK_SIDO[region.regionCode] ?? "",
    value: Math.round(region.value),
    delta: formatSignedWholeNumber(region.change),
    series: region.points.slice(-7).map((point) => Math.round(point.value))
  }));
}

export function latestFireRiskObservedAt(response: FireRiskIndexResponse) {
  return response.regions
    .map((region) => region.observedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
}

export function toFreshFoodKpiView(response: FreshFoodIndexResponse): FreshFoodKpiView | null {
  if (response.points.length === 0) {
    return null;
  }

  const delta = response.monthOverMonthRate ?? 0;

  return {
    tag: "지수 · 물가",
    region: "전국",
    name: "신선식품물가지수",
    value: formatDecimalNumber(response.value),
    unit: displayFreshFoodUnit(response.unit),
    delta: formatSignedPercent(delta),
    direction: delta >= 0 ? "up" : "down",
    error: null,
    spark: response.points.slice(-7).map((point) => point.value),
    target: "cabbage"
  };
}

export function toFreshFoodGaugeView(response: FreshFoodIndexResponse): FreshFoodGaugeView | null {
  if (response.points.length === 0) {
    return null;
  }

  return {
    value: formatDecimalNumber(response.value),
    baseMonth: response.baseMonth,
    monthOverMonthRate: formatNullableSignedPercent(response.monthOverMonthRate),
    yearOverYearRate: formatNullableSignedPercent(response.yearOverYearRate),
    series: response.points.map((point) => point.value)
  };
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

function isApiFreshFoodIndexResponse(value: unknown): value is ApiResponse<FreshFoodIndexResponse> {
  if (!isRecord(value)) return false;
  return (
    (value.result === "SUCCESS" || value.result === "ERROR") &&
    (value.data === null || isFreshFoodIndexResponse(value.data)) &&
    "error" in value
  );
}

function isFreshFoodIndexResponse(value: unknown): value is FreshFoodIndexResponse {
  if (!isRecord(value)) return false;
  return (
    value.indexCode === "fresh-food-index" &&
    value.unit === "index_2020_100" &&
    typeof value.baseMonth === "string" &&
    typeof value.value === "number" &&
    (value.monthOverMonthRate === null || typeof value.monthOverMonthRate === "number") &&
    (value.yearOverYearRate === null || typeof value.yearOverYearRate === "number") &&
    Array.isArray(value.points) &&
    value.points.every(isFreshFoodIndexPoint)
  );
}

function isFreshFoodIndexPoint(value: unknown): value is FreshFoodIndexPoint {
  if (!isRecord(value)) return false;
  return typeof value.baseMonth === "string" && typeof value.value === "number";
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
  const normalizedPage = Math.min(Math.max(1, uiPage), totalPages);

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

const FIRE_RISK_SIDO: Record<string, string> = {
  "42150": "강원",
  "48890": "경남",
  "46770": "전남"
};

// ===== 가뭄 자료실 (archive) =====

/** UI는 1-base, 백엔드는 0-base. 변환은 여기 한 곳에서만 한다. */
export function toApiPage(uiPage: number | undefined): number {
  if (!uiPage || uiPage < 1) return 0;
  return uiPage - 1;
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
