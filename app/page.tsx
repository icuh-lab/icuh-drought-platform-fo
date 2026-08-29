"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Braces, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Copy, Flame, KeyRound, Send } from "lucide-react";
import { Blocks, ForecastChart, OverlayForecastChart, Sparkline, VintageAccuracyChart } from "@/components/charts";
import { FireRiskMap } from "@/components/FireRiskMap";
import {
  API_BASE_URLS,
  OPEN_API_DEFAULT_PERIOD,
  fetchFireRiskIndex,
  fetchDroughtReportDetail,
  fetchDroughtReports,
  fetchFreshFoodIndex,
  fetchHydropowerForecast,
  fetchOnionPriceSeries,
  fetchPriceForecast,
  fetchPredictionVintage,
  fetchSummary,
  latestFireRiskObservedAt,
  latestHydropowerForecastDate,
  latestPriceForecastDate,
  priceForecastLocation,
  toFireRiskView,
  toFireRiskMapView,
  toDroughtReportDetailView,
  toDroughtReportViews,
  toFreshFoodGaugeView,
  toFreshFoodKpiView,
  toHydropowerForecastView,
  toHydropowerKpiView,
  toOnionForecastView,
  toOnionKpiView,
  toPriceForecastView,
  toPriceKpiView,
  toVintageAccuracyView,
  type FireRiskView,
  type FireRiskMapView,
  type DroughtReportView,
  type FreshFoodGaugeView,
  type FreshFoodProvinceRow,
  type FreshFoodKpiView,
  type HydropowerForecastView,
  type HydropowerKpiView,
  type OnionForecastView,
  type OpenApiPeriod,
  type PriceForecastKey,
  type PriceForecastView,
  type PriceKpiView,
  type SummaryAlert,
  type VintageAccuracyView
} from "@/lib/api-client";
import { parseView, viewHref } from "@/lib/dashboard-view";
import { PERIOD_YEARS, availableMonths, clampPeriod, isPeriodAtEnd, isPeriodAtStart, shiftPeriod } from "@/lib/period";
import { apiCatalog, fireRisk, forecasts, kpis, reports, type ApiCatalogItem, type ForecastKey, type ViewKey } from "@/lib/mock-data";
import { freshFoodStatusText, type FreshFoodKind } from "@/lib/fresh-food";

type PriceApiState = {
  status: "loading" | "success" | "empty" | "error";
  forecast: PriceForecastView | null;
  kpi: PriceKpiView | null;
  latestDate: string | null;
};

/** 양파는 prediction-vintage + daily-market 경로를 쓴다. 여기 남는 건 배추뿐이다. */
type PriceApiStates = Record<"cabbage", PriceApiState>;

type HydropowerApiState = {
  status: "loading" | "success" | "empty" | "error";
  forecast: HydropowerForecastView | null;
  kpi: HydropowerKpiView | null;
  latestDate: string | null;
};

type OnionApiState = {
  status: "loading" | "success" | "empty" | "error";
  forecast: OnionForecastView | null;
  kpi: PriceKpiView | null;
  latestDate: string | null;
};

type VintageApiState = {
  status: "loading" | "success" | "empty" | "error";
  view: VintageAccuracyView | null;
  latestDate: string | null;
};

type FireRiskApiState = {
  status: "loading" | "success" | "empty" | "error";
  items: FireRiskView | null;
  /** 지도는 날짜축이 필요해 목록과 다른 모양을 쓴다. 목업으로는 채울 수 없어 API 성공 때만 들어온다. */
  map: FireRiskMapView | null;
  latestDate: string | null;
};

type FreshFoodApiState = {
  status: "loading" | "success" | "empty" | "error";
  kpi: FreshFoodKpiView | null;
  gauge: FreshFoodGaugeView | null;
  latestDate: string | null;
};

const FRESH_FOOD_TABS: { key: FreshFoodKind; label: string }[] = [
  { key: "vegetable", label: "채소" },
  { key: "fruit", label: "과일" }
];

type SummaryApiState = {
  status: "loading" | "success" | "empty" | "error";
  alerts: SummaryAlert[];
  generatedAt: string | null;
};

type ReportApiState = {
  status: "loading" | "success" | "empty" | "error";
  reports: DroughtReportView[] | null;
  details: Record<string, DroughtReportView>;
};

function levelClass(level: number) {
  if (level >= 3) return "lv4";
  if (level === 2) return "lv3";
  return "lv1";
}

function fireLevel(value: number) {
  if (value >= 80) return ["매우높음", "lv4"] as const;
  if (value >= 65) return ["높음", "lv3"] as const;
  if (value >= 40) return ["보통", "lv2"] as const;
  return ["낮음", "lv1"] as const;
}

function fireBlockCount(levelClassName: string) {
  if (levelClassName === "lv4") return 4;
  if (levelClassName === "lv3") return 3;
  if (levelClassName === "lv2") return 2;
  return 1;
}

function priceStatusText(state: PriceApiState) {
  if (state.status === "success") return `API 갱신 ${state.latestDate ?? "최신"}`;
  if (state.status === "loading") return "API 확인 중 · 목업 표시";
  if (state.status === "empty") return "API 데이터 없음 · 목업 표시";
  return "API 오류 · 목업 표시";
}

function apiStatusText(state: Pick<PriceApiState, "status" | "latestDate">) {
  if (state.status === "success") return `API 갱신 ${state.latestDate ?? "최신"}`;
  if (state.status === "loading") return "API 확인 중 · 목업 표시";
  if (state.status === "empty") return "API 데이터 없음 · 목업 표시";
  return "API 오류 · 목업 표시";
}

function summaryStatusText(state: SummaryApiState) {
  if (state.status === "success") return `집계 API 갱신 ${state.generatedAt ?? "최신"}`;
  if (state.status === "loading") return "집계 API 확인 중 · 목업 표시";
  if (state.status === "empty") return "집계 알림 없음 · 목업 표시";
  return "집계 API 오류 · 목업 표시";
}

function reportStatusText(state: ReportApiState) {
  if (state.status === "success") return "리포트 API 갱신";
  if (state.status === "loading") return "리포트 API 확인 중 · 목업 표시";
  if (state.status === "empty") return "리포트 API 데이터 없음 · 목업 표시";
  return "리포트 API 오류 · 목업 표시";
}

function alertAction(alert: SummaryAlert): { label: string; target?: ForecastKey } {
  if (alert.category === "price" && alert.dataset === "napa-cabbage") return { label: "예측 상세보기", target: "cabbage" as ForecastKey };
  if (alert.category === "price" && alert.dataset === "onion") return { label: "예측 상세보기", target: "onion" as ForecastKey };
  if (alert.category === "hydropower") return { label: "예측 상세보기", target: "hydro" as ForecastKey };
  if (alert.category === "fire-risk" || alert.category === "fresh-food") return { label: "지수 상세보기" };
  return { label: "상세보기" };
}

function alertIcon(category: string) {
  if (category === "fire-risk") return <Flame size={21} />;
  return <AlertTriangle size={21} />;
}

function apiExampleBody(body?: string) {
  if (!body) return "";

  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch (error) {
    return body;
  }
}

function apiExamplePath(api: ApiCatalogItem) {
  let path = api.path;
  api.params
    .filter((param) => param.in === "path")
    .forEach((param) => {
      path = path.replace(`{${param.name}}`, encodeURIComponent(param.example));
    });

  const query = api.params
    .filter((param) => param.in === "query")
    .map((param) => `${encodeURIComponent(param.name)}=${encodeURIComponent(param.example)}`);

  return query.length > 0 ? `${path}?${query.join("&")}` : path;
}

function apiCurlExample(api: ApiCatalogItem) {
  const parts = ["curl"];
  if (api.method !== "GET") {
    parts.push(`-X ${api.method}`);
  }

  api.params
    .filter((param) => param.in === "header")
    .forEach((param) => {
      parts.push(`-H '${param.name}: ${param.example}'`);
    });

  if (api.body) {
    parts.push("-H 'Content-Type: application/json'");
    parts.push(`-d '${apiExampleBody(api.body)}'`);
  }

  const baseUrl = api.group === "자료공유" || api.group === "파일"
    ? API_BASE_URLS.public
    : API_BASE_URLS.open;
  parts.push(`"${baseUrl}${apiExamplePath(api)}"`);
  return parts.join(" \\\n  ");
}

const initialPriceApiState: PriceApiState = {
  status: "loading",
  forecast: null,
  kpi: null,
  latestDate: null
};

const initialOnionApiState: OnionApiState = {
  status: "loading",
  forecast: null,
  kpi: null,
  latestDate: null
};

const initialVintageApiState: VintageApiState = {
  status: "loading",
  view: null,
  latestDate: null
};

const initialHydropowerApiState: HydropowerApiState = {
  status: "loading",
  forecast: null,
  kpi: null,
  latestDate: null
};

const initialFireRiskApiState: FireRiskApiState = {
  status: "loading",
  items: null,
  map: null,
  latestDate: null
};

const initialFreshFoodApiState: FreshFoodApiState = {
  status: "loading",
  kpi: null,
  gauge: null,
  latestDate: null
};

const initialSummaryApiState: SummaryApiState = {
  status: "loading",
  alerts: [],
  generatedAt: null
};

const initialReportApiState: ReportApiState = {
  status: "loading",
  reports: null,
  details: {}
};

export default function Page() {
  return (
    <Suspense fallback={<main className="wrap"><p className="notice">불러오는 중…</p></main>}>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseView(searchParams.get("view"));
  const [forecast, setForecast] = useState<ForecastKey>("cabbage");
  const [selectedReportId, setSelectedReportId] = useState("r1");
  const [selectedApiPath, setSelectedApiPath] = useState(apiCatalog[0].path);
  const [priceApis, setPriceApis] = useState<PriceApiStates>({ cabbage: initialPriceApiState });
  const [onionApi, setOnionApi] = useState<OnionApiState>(initialOnionApiState);
  const [hydropowerApi, setHydropowerApi] = useState<HydropowerApiState>(initialHydropowerApiState);
  const [vintageApi, setVintageApi] = useState<VintageApiState>(initialVintageApiState);
  const [vintageHorizon, setVintageHorizon] = useState<number | null>(null);
  const [fireRiskApi, setFireRiskApi] = useState<FireRiskApiState>(initialFireRiskApiState);
  const [freshFoodApi, setFreshFoodApi] = useState<FreshFoodApiState>(initialFreshFoodApiState);
  const [freshFoodKind, setFreshFoodKind] = useState<FreshFoodKind>("vegetable");
  const [freshFoodExpanded, setFreshFoodExpanded] = useState(false);
  const [summaryApi, setSummaryApi] = useState<SummaryApiState>(initialSummaryApiState);
  const [reportApi, setReportApi] = useState<ReportApiState>(initialReportApiState);
  const [period, setPeriod] = useState<OpenApiPeriod>(() => ({ ...OPEN_API_DEFAULT_PERIOD }));
  const activeForecasts = useMemo(
    () => ({
      ...forecasts,
      cabbage: priceApis.cabbage.forecast ?? forecasts.cabbage
    }),
    [priceApis]
  );
  const activeKpis = useMemo(
    () => kpis.map((kpi) => {
      if (kpi.name === "고랭지배추 도매가격") return priceApis.cabbage.kpi ?? kpi;
      if (kpi.name === "양파 도매가격") return onionApi.kpi ?? kpi;
      if (kpi.name === "수력발전량") return hydropowerApi.kpi ?? kpi;
      if (kpi.name === "신선식품물가지수") return freshFoodApi.kpi ?? kpi;
      return kpi;
    }),
    [priceApis, onionApi, hydropowerApi, freshFoodApi]
  );
  const fc = activeForecasts[forecast];
  const activeReports = reportApi.reports ?? reports;
  const selectedReport = useMemo(
    () => reportApi.details[selectedReportId] ?? activeReports.find((report) => report.id === selectedReportId) ?? activeReports[0] ?? reports[0],
    [activeReports, reportApi.details, selectedReportId]
  );
  const selectedReportVisualMax = Math.max(1, ...selectedReport.visualSummary.impactFields.map((field) => field.count));
  const selectedReportMentionedRegions = selectedReport.mentionedRegions.length > 0
    ? selectedReport.mentionedRegions
    : selectedReport.pins.map((pin) => ({
      sidoName: "",
      sigunguName: pin.name,
      sigunguCode: null,
      regionCode: null,
      regionName: pin.name,
      impactCode: null,
      impactName: "미분류",
      note: pin.note,
      damageDetail: null
    }));
  const activeFireRisk = fireRiskApi.items ?? fireRisk;
  const activeFreshFoodGauge = freshFoodApi.gauge;
  const highestFireRisk = activeFireRisk.reduce((highest, current) => current.value > highest.value ? current : highest, activeFireRisk[0]);
  // 181 개 시군구를 다 늘어놓는 대신 지도로 전체를 보여주고, 목록은 눈에 띄는 곳만 남긴다.
  const topFireRisk = [...activeFireRisk].sort((left, right) => right.value - left.value).slice(0, 5);
  const priceStatuses = {
    cabbage: priceStatusText(priceApis.cabbage),
    onion: apiStatusText(onionApi)
  };
  // 양파 메인 차트는 목업 폴백을 쓰지 않는다. 실측·예측을 지어내면 정확도까지 지어내는 셈이다.
  const onionForecast = onionApi.forecast;
  // 수력발전량도 동일하게 목업 폴백을 쓰지 않는다 — activeForecasts.hydro 는 탭 라벨 전용으로만 쓴다.
  const hydropowerForecast = hydropowerApi.forecast;
  const hydropowerStatus = apiStatusText(hydropowerApi);
  const vintageStatus = apiStatusText(vintageApi);
  const selectedVintageHorizon = vintageHorizon ?? vintageApi.view?.horizons[0]?.horizonDays ?? null;
  const selectedVintageSeries = selectedVintageHorizon !== null ? vintageApi.view?.seriesByHorizon[selectedVintageHorizon] ?? null : null;
  const selectedVintageAccuracy = selectedVintageHorizon !== null
    ? vintageApi.view?.horizons.find((horizon) => horizon.horizonDays === selectedVintageHorizon) ?? null
    : null;
  const fireRiskStatus = apiStatusText(fireRiskApi);
  const freshFoodStatus = freshFoodStatusText(freshFoodApi.status, freshFoodApi.latestDate);
  const summaryStatus = summaryStatusText(summaryApi);
  const reportStatus = reportStatusText(reportApi);
  const fallbackSummaryAlerts: SummaryAlert[] = [
    {
      id: "mock-drought-goheung",
      category: "drought-report",
      dataset: "drought-report",
      regionCode: "46770",
      regionName: "고흥",
      title: "고흥 가뭄영향 ‘매우높음’ 단계 진입",
      description: "관수 차질 리포트 3건 발행 · 최근 3개월 강수량 평년 대비 48%",
      severity: "danger",
      score: 90,
      value: 48,
      unit: "rainfall_ratio",
      observedAt: "2026-08-05",
      relatedReportCount: 3
    },
    {
      id: "mock-fire-risk",
      category: "fire-risk",
      dataset: "fire-risk",
      regionCode: highestFireRisk.name,
      regionName: `${highestFireRisk.sido} ${highestFireRisk.name}`.trim(),
      title: `${`${highestFireRisk.sido} ${highestFireRisk.name}`.trim()} 산불위험지수 ${highestFireRisk.value} — ‘${fireLevel(highestFireRisk.value)[0]}’ 단계`,
      description: `${fireRiskApi.status === "success" ? `API 갱신 ${fireRiskApi.latestDate}` : "목업 기준 표시"} · 임계값 65 ${highestFireRisk.value >= 65 ? "초과" : "미만"}`,
      severity: highestFireRisk.value >= 80 ? "danger" : "warning",
      score: highestFireRisk.value,
      value: highestFireRisk.value,
      unit: "score_0_100",
      observedAt: fireRiskApi.latestDate,
      relatedReportCount: 0
    }
  ];
  const activeSummaryAlerts = summaryApi.status === "success" && summaryApi.alerts.length > 0
    ? summaryApi.alerts.slice(0, 3)
    : fallbackSummaryAlerts;
  const selectedApi = useMemo(
    () => apiCatalog.find((api) => api.path === selectedApiPath) ?? apiCatalog[0],
    [selectedApiPath]
  );
  const selectedApiCurl = useMemo(() => apiCurlExample(selectedApi), [selectedApi]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPriceForecast(key: "cabbage") {
      try {
        const response = await fetchPriceForecast(key, { signal: controller.signal, year: period.year, month: period.month });
        const nextForecast = toPriceForecastView(key, response);
        const nextKpi = toPriceKpiView(key, response);

        if (!nextForecast || !nextKpi) {
          setPriceApis((current) => ({ ...current, [key]: { status: "empty", forecast: null, kpi: null, latestDate: null } }));
          return;
        }

        setPriceApis((current) => ({
          ...current,
          [key]: {
            status: "success",
            forecast: nextForecast,
            kpi: nextKpi,
            latestDate: latestPriceForecastDate(response)
          }
        }));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setPriceApis((current) => ({ ...current, [key]: { status: "error", forecast: null, kpi: null, latestDate: null } }));
      }
    }

    async function loadHydropowerForecast() {
      try {
        const response = await fetchHydropowerForecast({ signal: controller.signal, year: period.year, month: period.month });
        const nextForecast = toHydropowerForecastView(response);
        const nextKpi = toHydropowerKpiView(response);

        if (!nextForecast || !nextKpi) {
          setHydropowerApi({ status: "empty", forecast: null, kpi: null, latestDate: null });
          return;
        }

        setHydropowerApi({
          status: "success",
          forecast: nextForecast,
          kpi: nextKpi,
          latestDate: latestHydropowerForecastDate(response)
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setHydropowerApi({ status: "error", forecast: null, kpi: null, latestDate: null });
      }
    }



    loadPriceForecast("cabbage");
    loadHydropowerForecast();

    return () => controller.abort();
  }, [period]);

  // vintage 로그는 연/월 필터가 없는 전체 이력이라, period 가 바뀔 때마다 다시 부를 이유가 없다.
  // 메인 차트의 예측선도 같은 응답에서 나오므로 한 번만 부르고 둘이 나눠 쓴다.
  useEffect(() => {
    const controller = new AbortController();

    async function loadOnion() {
      let response;
      try {
        response = await fetchPredictionVintage(priceForecastLocation("onion"), controller.signal);
      } catch (error) {
        if (controller.signal.aborted) return;
        setVintageApi({ status: "error", view: null, latestDate: null });
        setOnionApi({ status: "error", forecast: null, kpi: null, latestDate: null });
        return;
      }

      const nextView = toVintageAccuracyView(response);
      setVintageApi(
        nextView
          ? { status: "success", view: nextView, latestDate: nextView.latestActualDate }
          : { status: "empty", view: null, latestDate: null }
      );

      try {
        // 실측은 daily-market 에서 창이 걸친 달만큼 더 부른다.
        const series = await fetchOnionPriceSeries(response, controller.signal);
        const nextForecast = series && toOnionForecastView(series);

        if (!series || !nextForecast) {
          setOnionApi({ status: "empty", forecast: null, kpi: null, latestDate: null });
          return;
        }

        setOnionApi({
          status: "success",
          forecast: nextForecast,
          kpi: toOnionKpiView(series),
          latestDate: series.latestActualDate
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setOnionApi({ status: "error", forecast: null, kpi: null, latestDate: null });
      }
    }

    loadOnion();

    return () => controller.abort();
  }, []);

  // 채소·과일 탭을 바꾸면 이 지표만 다시 부른다. 위 이펙트에 묶어 두면 탭만 눌러도
  // 배추·양파·수력까지 전부 다시 부르게 된다.
  useEffect(() => {
    const controller = new AbortController();

    async function loadFreshFoodIndex() {
      setFreshFoodApi(initialFreshFoodApiState);

      try {
        const response = await fetchFreshFoodIndex({ signal: controller.signal, year: period.year, month: period.month, kind: freshFoodKind });

        if (!response) {
          setFreshFoodApi({ status: "empty", kpi: null, gauge: null, latestDate: null });
          return;
        }

        const nextKpi = toFreshFoodKpiView(response);
        const nextGauge = toFreshFoodGaugeView(response);

        if (!nextKpi || !nextGauge) {
          setFreshFoodApi({ status: "empty", kpi: null, gauge: null, latestDate: null });
          return;
        }

        setFreshFoodApi({ status: "success", kpi: nextKpi, gauge: nextGauge, latestDate: response.baseMonth });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setFreshFoodApi({ status: "error", kpi: null, gauge: null, latestDate: null });
      }
    }

    loadFreshFoodIndex();

    return () => controller.abort();
  }, [period, freshFoodKind]);

  // 산불위험지수는 일 단위, 종합 현황과 리포트는 조회 연월과 무관하므로 최초 1회만 불러온다.
  useEffect(() => {
    const controller = new AbortController();

    async function loadFireRiskIndex() {
      try {
        const response = await fetchFireRiskIndex({ signal: controller.signal });
        const nextItems = toFireRiskView(response);

        if (!nextItems) {
          setFireRiskApi({ status: "empty", items: null, map: null, latestDate: null });
          return;
        }

        setFireRiskApi({
          status: "success",
          items: nextItems,
          map: toFireRiskMapView(response),
          latestDate: latestFireRiskObservedAt(response)
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setFireRiskApi({ status: "error", items: null, map: null, latestDate: null });
      }
    }

    async function loadSummary() {
      try {
        const response = await fetchSummary({ signal: controller.signal });

        setSummaryApi({
          status: response.alerts.length > 0 ? "success" : "empty",
          alerts: response.alerts,
          generatedAt: response.generatedAt
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setSummaryApi({ status: "error", alerts: [], generatedAt: null });
      }
    }

    async function loadDroughtReports() {
      try {
        const response = await fetchDroughtReports({ signal: controller.signal, size: 20 });
        const nextReports = toDroughtReportViews(response);

        setReportApi((current) => ({
          ...current,
          status: nextReports.length > 0 ? "success" : "empty",
          reports: nextReports.length > 0 ? nextReports : null
        }));
        if (nextReports.length > 0) {
          setSelectedReportId((current) => nextReports.some((report) => report.id === current) ? current : nextReports[0].id);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setReportApi((current) => ({ ...current, status: "error", reports: null }));
      }
    }

    loadFireRiskIndex();
    loadSummary();
    loadDroughtReports();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (reportApi.status !== "success" || reportApi.details[selectedReportId]) {
      return;
    }

    const controller = new AbortController();

    async function loadDroughtReportDetail() {
      try {
        const response = await fetchDroughtReportDetail(selectedReportId, { signal: controller.signal });
        const detail = toDroughtReportDetailView(response);
        setReportApi((current) => ({
          ...current,
          details: {
            ...current.details,
            [selectedReportId]: detail
          }
        }));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
      }
    }

    loadDroughtReportDetail();

    return () => controller.abort();
  }, [reportApi.details, reportApi.status, selectedReportId]);

  const go = (next: ViewKey, target?: ForecastKey) => {
    if (target) setForecast(target);
    router.push(viewHref(next));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const copySelectedApiCurl = async () => {
    try {
      await navigator.clipboard.writeText(selectedApiCurl);
    } catch (error) {
      // Clipboard is unavailable in some local browser contexts.
    }
  };

  return (
    <>

      <div className="fbar">
        <div className="fbar-in">
          <div className="period" role="group" aria-label="조회 기간">
            <span className="period-tag">기간</span>
            <button
              type="button"
              className="period-step"
              onClick={() => setPeriod((current) => shiftPeriod(current, -1))}
              disabled={isPeriodAtStart(period)}
              aria-label="이전 달"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="period-fields">
              <label>
                <select
                  value={period.year}
                  aria-label="조회 연도"
                  onChange={(event) => setPeriod((current) => clampPeriod({ ...current, year: Number(event.target.value) }))}
                >
                  {PERIOD_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
                <span>년</span>
              </label>
              <label>
                <select
                  value={period.month}
                  aria-label="조회 월"
                  onChange={(event) => setPeriod((current) => clampPeriod({ ...current, month: Number(event.target.value) }))}
                >
                  {availableMonths(period.year).map((month) => <option key={month} value={month}>{month}</option>)}
                </select>
                <span>월</span>
              </label>
            </div>
            <button
              type="button"
              className="period-step"
              onClick={() => setPeriod((current) => shiftPeriod(current, 1))}
              disabled={isPeriodAtEnd(period)}
              aria-label="다음 달"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <p className="period-note">예측·지수 데이터는 월 1회 재학습되어 갱신됩니다</p>
        </div>
      </div>
      <div className="rule" />

      <main className="wrap">
        {view === "home" && (
          <section className="view">
            <div className="alerts">
              {summaryApi.status !== "success" && <div className="data-note">{summaryStatus}</div>}
              {activeSummaryAlerts.map((alert) => {
                const action = alertAction(alert);
                return (
                  <div className={alert.severity === "danger" ? "alert" : "alert warn"} key={alert.id}>
                    {alertIcon(alert.category)}
                    <span><b>{alert.title}</b><small>{alert.description} · 관련 리포트 {alert.relatedReportCount}건</small></span>
                    <button onClick={() => alert.category === "drought-report" ? go("reports") : go("forecast", action.target)}>{action.label}</button>
                  </div>
                );
              })}
            </div>

            <SectionHead title="가뭄 영향 지표 요약" note="농업·에너지·물가 부문 정형 데이터" action="예측·지수 대시보드" onAction={() => go("forecast")} />
            <div className="kpis">
              {activeKpis.map((kpi) => {
                const isCabbagePrice = kpi.name === "고랭지배추 도매가격";
                const isOnionPrice = kpi.name === "양파 도매가격";
                const isHydropower = kpi.name === "수력발전량";
                const isFreshFood = kpi.name === "신선식품물가지수";
                return (
                  <button className="kpi" key={kpi.name} onClick={() => go("forecast", kpi.target)}>
                    <span className="kpi-tag">{kpi.tag}</span>
                    <span className="kpi-name">{kpi.name}<b>{kpi.region}</b></span>
                    <span className="kpi-value">{kpi.value}<u>{kpi.unit}</u></span>
                    <span className={`kpi-delta ${kpi.direction}`}>{kpi.direction === "up" ? "▲" : "▼"} {kpi.delta}<em>{isHydropower || isFreshFood ? "전월대비" : "전일대비"}</em></span>
                    <Sparkline data={kpi.spark} color={kpi.direction === "up" ? "var(--up)" : "var(--down)"} />
                    <span className="kpi-source">{isCabbagePrice ? priceStatuses.cabbage : isOnionPrice ? priceStatuses.onion : isHydropower ? hydropowerStatus : isFreshFood ? freshFoodStatus : "갱신 2026-08-05 06:00"}</span>
                  </button>
                );
              })}
            </div>

            <SectionHead title="가뭄영향 리포트" note="뉴스 기사를 자동 분석해 생성된 리포트입니다" action="전체 리포트" onAction={() => go("reports")} />
            <div className="report-grid">
              {activeReports.slice(0, 3).map((report) => (
                <ReportCard key={report.id} report={report} onClick={() => { setSelectedReportId(report.id); go("detail"); }} />
              ))}
            </div>

            <div className="devbar">
              <Braces size={19} />
              <span><b>개발자이신가요?</b> 가뭄 영향 예측·지수·리포트 데이터를 Open API로 제공합니다.</span>
              <button onClick={() => go("api")}>API 센터 가기</button>
            </div>
          </section>
        )}

        {view === "forecast" && (
          <section className="view">
            <SectionHead title="예측형 지표" note="실측치와 예측치를 겹쳐 표시하고 예측 구간에는 신뢰구간을 함께 표기합니다" />
            <div className="card chart-card">
              <div className="tabs" role="tablist" aria-label="예측 지표 선택">
                {(["cabbage", "onion", "hydro"] as ForecastKey[]).map((key) => (
                  <button key={key} role="tab" aria-selected={forecast === key} onClick={() => setForecast(key)}>
                    {activeForecasts[key].label}
                  </button>
                ))}
              </div>
              <div className="chart-hd">
                <div>
                  <div className="chart-val">{forecast === "onion" ? onionForecast?.current ?? "–" : forecast === "hydro" ? hydropowerForecast?.current ?? "–" : fc.current}<u>{forecast === "onion" ? onionForecast?.unit ?? "원 / kg" : forecast === "hydro" ? hydropowerForecast?.unit ?? "MWh / 월" : fc.unit}</u></div>
                  <div className="chart-sub">{forecast === "onion" ? onionForecast?.sub ?? "" : forecast === "hydro" ? hydropowerForecast?.sub ?? "" : fc.sub}</div>
                </div>
                <div className="accuracy">
                  <span>예측 정확도</span>
                  <b>{forecast === "onion" ? onionForecast?.error ?? "N/A" : forecast === "hydro" ? hydropowerForecast?.error ?? "N/A" : fc.error}</b>
                  <small>{forecast === "onion" ? onionForecast?.errorNote ?? "실측 대기" : forecast === "hydro" ? "최근 3개월 평균 오차율" : "최근 30일 평균 오차율"}</small>
                </div>
              </div>
              {forecast === "cabbage" && priceApis.cabbage.status !== "success" && <div className="data-note">{priceStatuses.cabbage}</div>}
              {forecast === "onion" && onionApi.status !== "success" && <div className="data-note">{priceStatuses.onion}</div>}
              {forecast === "hydro" && hydropowerApi.status !== "success" && <div className="data-note">{hydropowerStatus}</div>}
              {forecast === "onion" ? (
                onionForecast && <OverlayForecastChart points={onionForecast.points} boundaryDate={onionForecast.boundaryDate} horizonSwitchDate={onionForecast.horizonSwitchDate} />
              ) : forecast === "hydro" ? (
                hydropowerForecast && <ForecastChart actual={hydropowerForecast.actual} predicted={hydropowerForecast.predicted} band={hydropowerForecast.band} unit={hydropowerForecast.unit} periodLabel="개월" />
              ) : (
                <ForecastChart actual={fc.actual} predicted={fc.predicted} band={fc.band} unit={fc.unit} />
              )}
              <div className="legend">
                <span><i className="solid" />실측치</span>
                {/* 수력발전량은 예측 3개월이 전부 404(모델 미산출)일 수 있다 — 그릴 선이 없으면 범례에도 올리지 않는다. */}
                {(forecast !== "hydro" || (hydropowerForecast?.predicted.length ?? 0) > 0) && <span><i className="dash" />예측치</span>}
                {/* 양파는 일 단위 상·하한을 주는 엔드포인트가 없다. 안 그리는 선을 범례에만 두면 거짓말이 된다. */}
                {forecast !== "onion" && (forecast !== "hydro" || (hydropowerForecast?.band.length ?? 0) > 0) && (
                  <span><i className="band" />{forecast === "hydro" ? "예측구간(q10–q90)" : "신뢰구간 95%"}</span>
                )}
              </div>
              {forecast === "onion" && onionForecast && <div className="data-note">{onionForecast.note}</div>}
              {forecast === "hydro" && hydropowerForecast && hydropowerForecast.predicted.length > 0 && <div className="data-note">예측값은 모델이 낸 상·하한의 중점 근사치입니다.</div>}
              <div className="source-line"><b>출처</b> {forecast === "onion" ? onionForecast?.source ?? "open-api /api/v1/agrimarket (합천)" : forecast === "hydro" ? hydropowerForecast?.source ?? "open-api /api/v1/hydropower/monthly-generation (합천댐)" : fc.source}<span>|</span><b>갱신</b> {forecast === "cabbage" ? priceApis.cabbage.latestDate ?? priceStatuses.cabbage : forecast === "onion" ? onionApi.latestDate ?? priceStatuses.onion : hydropowerApi.latestDate ?? hydropowerStatus}</div>
            </div>

            {forecast === "onion" && (
              <div className="card chart-card">
                <SectionHead title="양파 예측 정확도(리드타임별)" note="재학습해도 안 바뀌는 예측 기록과 실측을 리드타임별로 비교합니다" />
                {vintageApi.view && vintageApi.view.horizons.length > 0 && (
                  <div className="tabs" role="tablist" aria-label="리드타임 선택">
                    {vintageApi.view.horizons.map((horizon) => (
                      <button
                        key={horizon.horizonDays}
                        role="tab"
                        aria-selected={selectedVintageHorizon === horizon.horizonDays}
                        onClick={() => setVintageHorizon(horizon.horizonDays)}
                      >
                        {horizon.horizonDays}일 전 예측
                      </button>
                    ))}
                  </div>
                )}
                {selectedVintageAccuracy && (
                  <div className="chart-hd">
                    <div>
                      <div className="chart-val">{selectedVintageAccuracy.mae !== null ? Math.round(selectedVintageAccuracy.mae) : "–"}<u>원/kg</u></div>
                      <div className="chart-sub">평균절대오차(MAE) · 표본 {selectedVintageAccuracy.sampleCount}일</div>
                    </div>
                  </div>
                )}
                {vintageApi.status !== "success" && <div className="data-note">{vintageStatus}</div>}
                {vintageApi.status === "success" && !selectedVintageSeries && <div className="data-note">실측이 확정된 예측이 아직 없습니다</div>}
                {selectedVintageSeries && selectedVintageSeries.actual.length > 0 && (
                  <>
                    <VintageAccuracyChart actual={selectedVintageSeries.actual} predicted={selectedVintageSeries.predicted} dates={selectedVintageSeries.dates} />
                    <div className="legend">
                      <span><i className="solid" />실측치</span>
                      <span><i className="dash" />예측치</span>
                    </div>
                  </>
                )}
                <div className="source-line"><b>출처</b> open-api /api/v1/agrimarket/prediction-vintage (합천)<span>|</span><b>갱신</b> {vintageApi.latestDate ?? vintageStatus}</div>
              </div>
            )}

            <SectionHead title="지수형 지표" note="가뭄이 누적될수록 함께 상승하는 지표들을 표시합니다" />
            <div className="split">
              <div className="card">
                <div className="panel-hd">
                  <div>
                    <h3>산불위험지수 — 전국 시군구</h3>
                    <p>1일 1회 18:00 발표 · 오늘 포함 3일 예보</p>
                  </div>
                  <div className="mini-stat"><span>오늘 최고</span><b>{highestFireRisk.value}</b><small>{highestFireRisk.sido} {highestFireRisk.name} · {fireLevel(highestFireRisk.value)[0]}</small></div>
                </div>
                {fireRiskApi.status !== "success" && <div className="data-note">{fireRiskStatus}</div>}
                {fireRiskApi.map ? (
                  // 지도와 목록은 같은 날짜를 봐야 하므로 한 컴포넌트 안에서 함께 그린다.
                  <FireRiskMap view={fireRiskApi.map} />
                ) : (
                  <div className="fire-top is-standalone">
                    <div className="fire-top-hd">
                      <h4>위험 상위 지역</h4>
                      <small>증감은 마지막 예보일까지의 변화</small>
                    </div>
                    {topFireRisk.map((fire) => {
                      const [label, cls] = fireLevel(fire.value);
                      return (
                        <div className="fire-row" key={`${fire.sido}-${fire.name}`}>
                          <span className="fire-name"><b>{fire.name}</b><small>{fire.sido}</small></span>
                          <Sparkline data={fire.series} className="fire-spark" color={cls === "lv3" ? "var(--r3-dot)" : "var(--brand)"} />
                          <b className="fire-value">{fire.value}</b>
                          <span className={fire.delta.startsWith("+") ? "up" : "down"}>{fire.delta}</span>
                          <span className={`badge ${cls}`}><Blocks count={fireBlockCount(cls)} />{label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="card gauge">
                <div className="gauge-hd">
                  <h3>신선식품물가지수</h3>
                  <div className="tabs sm">
                    {FRESH_FOOD_TABS.map((tab) => (
                      <button key={tab.key} className={freshFoodKind === tab.key ? "on" : ""} onClick={() => setFreshFoodKind(tab.key)}>{tab.label}</button>
                    ))}
                  </div>
                </div>
                <p>통계청 소비자물가조사 · 시도별 지수</p>
                {activeFreshFoodGauge === null ? (
                  <div className="data-note">{freshFoodStatus}</div>
                ) : (
                  <>
                    <div className="gauge-value">{activeFreshFoodGauge.value}<span>2020년 = 100 · {activeFreshFoodGauge.baseMonth}</span></div>
                    <div className="gauge-deltas">
                      <span>전월대비 <b className={activeFreshFoodGauge.monthOverMonthDirection ?? ""}>{activeFreshFoodGauge.monthOverMonthRate}</b></span>
                      <span>전년동월대비 <b className={activeFreshFoodGauge.yearOverYearDirection ?? ""}>{activeFreshFoodGauge.yearOverYearRate}</b></span>
                    </div>
                    <Sparkline data={activeFreshFoodGauge.series} className="cpi" />
                    <div className="gauge-axis"><span>{activeFreshFoodGauge.rangeStart}</span><span>{activeFreshFoodGauge.rangeEnd}</span></div>

                    <div className="gauge-regions-hd">
                      <b>시도별 {activeFreshFoodGauge.provinceCount}곳</b>
                      <span className="gauge-grades">
                        {activeFreshFoodGauge.grades.map((grade) => (
                          <span key={grade.label} className={`badge ${grade.className}`}>{grade.label} {grade.count}</span>
                        ))}
                      </span>
                    </div>
                    <div className="gauge-regions">
                      {/* 18곳을 다 늘어놓으면 카드가 옆 지도보다 세 배 길어진다. 기본은 양 끝만 보이고 펼쳐서 전부 본다. */}
                      {freshFoodExpanded || activeFreshFoodGauge.omitted === 0 ? (
                        activeFreshFoodGauge.all.map((province) => <ProvinceBar key={province.code} province={province} />)
                      ) : (
                        <>
                          {activeFreshFoodGauge.top.map((province) => <ProvinceBar key={province.code} province={province} />)}
                          <button className="gauge-more" onClick={() => setFreshFoodExpanded(true)}>
                            가운데 {activeFreshFoodGauge.omitted}곳 더 보기<ChevronDown size={14} />
                          </button>
                          {activeFreshFoodGauge.bottom.map((province) => <ProvinceBar key={province.code} province={province} />)}
                        </>
                      )}
                      {freshFoodExpanded && activeFreshFoodGauge.omitted > 0 && (
                        <button className="gauge-more" onClick={() => setFreshFoodExpanded(false)}>
                          접기<ChevronUp size={14} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {view === "reports" && (
          <section className="view">
            <div className="notice">본 리포트는 언론 보도를 자동 수집·분석해 생성한 요약 자료입니다. 원문 링크에서 전문을 확인할 수 있습니다. {reportStatus}</div>
            <div className="cols">
              <aside className="side">
                <h3>필터</h3>
                {["고흥 · 전남", "합천 · 경남", "강릉 · 강원"].map((label) => <label key={label}><input type="checkbox" defaultChecked /> {label}</label>)}
                <hr />
                {["최근 7일", "최근 1개월", "최근 3개월"].map((label, index) => <label key={label}><input type="radio" name="period" defaultChecked={index === 1} /> {label}</label>)}
              </aside>
              <div>
                <SectionHead title={`리포트 ${activeReports.length}건`} note="최신순" />
                <div className="report-list">
                  {activeReports.map((report) => <ReportRow key={report.id} report={report} onClick={() => { setSelectedReportId(report.id); go("detail"); }} />)}
                </div>
              </div>
            </div>
          </section>
        )}

        {view === "detail" && (
          <section className="view">
            <button className="back" onClick={() => go("reports")}><ChevronLeft size={16} />리포트 목록으로</button>
            <article className="article">
              <div className="article-meta"><span className={`badge ${levelClass(selectedReport.level)}`}><Blocks count={selectedReport.level} total={3} />영향도 {selectedReport.levelName}</span><span>발행 {selectedReport.date}</span><span>분석 기사 {selectedReport.count}건</span></div>
              <h1>{selectedReport.title}</h1>
              <div className="tags">{selectedReport.regions.map((tag) => <span key={tag}>#{tag}</span>)}</div>
              <h3>요약</h3>
              {selectedReport.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              <div className="report-visual-grid">
                <div className="report-metric"><span>분석 기사</span><b>{selectedReport.visualSummary.articleCount}</b><small>자동 수집 기사 기준</small></div>
                <div className="report-metric"><span>원문 출처</span><b>{selectedReport.visualSummary.sourceCount}</b><small>상세 링크 제공 건수</small></div>
                <div className="report-metric"><span>언급지역</span><b>{selectedReport.visualSummary.mentionedRegionCount}</b><small>기사 내 지역 mention</small></div>
              </div>
              {selectedReport.visualSummary.impactFields.length > 0 && (
                <div className="impact-bars" aria-label="영향분야 분포">
                  {selectedReport.visualSummary.impactFields.map((field) => (
                    <div className="impact-bar" key={`${field.impactCode}-${field.impactName}`}>
                      <span>{field.impactName}</span>
                      <div className="bar-track"><i style={{ width: `${Math.max(12, (field.count / selectedReportVisualMax) * 100)}%` }} /></div>
                      <b>{field.count}</b>
                    </div>
                  ))}
                </div>
              )}
              <h3>기사에서 언급된 지역</h3>
              <div className="mention-grid">
                {selectedReportMentionedRegions.map((region, index) => {
                  const name = region.sigunguName ?? region.regionName ?? region.sidoName;
                  return (
                    <div className="mention-card" key={`${name}-${region.impactName}-${index}`}>
                      <strong>{name}</strong>
                      <span>{region.sidoName}{region.impactName ? ` · ${region.impactName}` : ""}</span>
                      <p>{region.note ?? "기사 본문에서 지역 언급"}</p>
                      {region.damageDetail && <small>{region.damageDetail}</small>}
                    </div>
                  );
                })}
              </div>
              <h3>키워드</h3>
              <div className="tags">{selectedReport.keywords.map((tag) => <span key={tag}>#{tag}</span>)}</div>
              <h3>분석에 사용된 원문</h3>
              <ul className="source-list">{selectedReport.sources.map((source) => <li key={source}>{source}<small>언론사 · {selectedReport.date}</small></li>)}</ul>
            </article>
          </section>
        )}

        {view === "api" && (
          <section className="view">
            <SectionHead title="Open API 센터" note="농산물 3종 · 신선식품 2종 · 수력발전 4종 · 산불위험 2종 엔드포인트 제공" />
            <div className="api-grid">
              <div className="card catalog">
                {apiCatalog.map((api) => (
                  <button key={`${api.method}-${api.path}`} aria-current={api.path === selectedApi.path ? "page" : undefined} onClick={() => setSelectedApiPath(api.path)}>
                    <span>{api.group}</span>
                    <b>{api.name}</b>
                    <small>{api.method} {api.path}</small>
                  </button>
                ))}
              </div>
              <div className="card api-doc">
                <div className="path"><b>{selectedApi.method}</b><span>{selectedApi.path}</span></div>
                <p>{selectedApi.description}</p>
                <h3>Request Parameters</h3>
                <table>
                  <thead>
                    <tr>
                      <th>이름</th>
                      <th>위치</th>
                      <th>타입</th>
                      <th>필수</th>
                      <th>기본값</th>
                      <th>설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedApi.params.map((param) => (
                      <tr key={`${param.in}-${param.name}`}>
                        <th>{param.name}</th>
                        <td>{param.in}</td>
                        <td>{param.type ?? "-"}</td>
                        <td>{param.required ? "Y" : "N"}</td>
                        <td>{param.defaultValue ?? param.example}</td>
                        <td>{param.description ?? "-"}</td>
                      </tr>
                    ))}
                    {selectedApi.params.length === 0 && (
                      <tr><td colSpan={6}>파라미터 없음</td></tr>
                    )}
                  </tbody>
                </table>
                <h3>Response Data</h3>
                <table>
                  <thead>
                    <tr>
                      <th>필드명</th>
                      <th>타입</th>
                      <th>설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th>result</th>
                      <td>String</td>
                      <td>결과 상태 (SUCCESS 또는 ERROR)</td>
                    </tr>
                    {selectedApi.responseFields?.map((field) => (
                      <tr key={`${selectedApi.path}-${field.name}`}>
                        <th>{field.name}</th>
                        <td>{field.type}</td>
                        <td>{field.description}</td>
                      </tr>
                    ))}
                    <tr>
                      <th>error</th>
                      <td>Object | null</td>
                      <td>오류 발생 시 code, message, data를 포함합니다.</td>
                    </tr>
                  </tbody>
                </table>
                {selectedApi.body && <pre>{apiExampleBody(selectedApi.body)}</pre>}
                <pre>{selectedApiCurl}</pre>
              </div>
              <div className="card console">
                <h3><Send size={16} />요청 예시</h3>
                <label>method<input value={selectedApi.method} readOnly /></label>
                <label>path<input value={apiExamplePath(selectedApi)} readOnly /></label>
                <button onClick={copySelectedApiCurl}><Copy size={15} />curl 복사</button>
                <div className="response">공개 API · 로컬 서버 기준</div>
                <h3><KeyRound size={16} />인증 상태</h3>
                <div className="key"><span>공개 조회 API</span></div>
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}

function ProvinceBar({ province }: { province: FreshFoodProvinceRow }) {
  return (
    <div className="province-row">
      <span className="province-name">{province.name}</span>
      <span className="province-track"><i style={{ width: `${(province.ratio * 100).toFixed(1)}%` }} /></span>
      <b className="province-value">{province.value}</b>
      <span className={`badge ${province.gradeClass}`}>{province.gradeLabel}</span>
    </div>
  );
}

function SectionHead({ title, note, action, onAction }: { title: string; note?: string; action?: string; onAction?: () => void }) {
  return (
    <div className="sec-hd">
      <h2>{title}</h2>
      {note && <span>{note}</span>}
      {action && <button onClick={onAction}>{action} →</button>}
    </div>
  );
}

function ReportCard({ report, onClick }: { report: typeof reports[number]; onClick: () => void }) {
  return (
    <button className="report-card" onClick={onClick}>
      <span className={`badge ${levelClass(report.level)}`}><Blocks count={report.level} total={3} />{report.levelName}</span>
      <small>{report.date}</small>
      <b>{report.title}</b>
      <p>{report.summary}</p>
      <span className="tags">{report.regions.map((tag) => <i key={tag}>#{tag}</i>)}</span>
    </button>
  );
}

function ReportRow({ report, onClick }: { report: typeof reports[number]; onClick: () => void }) {
  return (
    <button className="report-row" onClick={onClick}>
      <span className={`badge ${levelClass(report.level)}`}><Blocks count={report.level} total={3} />{report.levelName}</span>
      <b>{report.title}</b>
      <p>{report.summary}</p>
      <small>{report.date} · 분석 기사 {report.count}건 · 뉴스 기반 자동 생성</small>
    </button>
  );
}
