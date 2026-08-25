"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Braces, ChevronLeft, ChevronRight, Copy, Flame, KeyRound, Send, Sprout } from "lucide-react";
import { ForecastChart, Sparkline } from "@/components/charts";
import {
  API_BASE_URLS,
  OPEN_API_DEFAULT_PERIOD,
  approveAdminArticle,
  fetchFireRiskIndex,
  fetchDroughtReportDetail,
  fetchDroughtReports,
  fetchAdminArticles,
  fetchFreshFoodIndex,
  fetchHydropowerForecast,
  fetchPriceForecast,
  fetchSummary,
  rejectAdminArticle,
  latestFireRiskObservedAt,
  latestHydropowerForecastDate,
  latestPriceForecastDate,
  toFireRiskView,
  toDroughtReportDetailView,
  toDroughtReportViews,
  toFreshFoodGaugeView,
  toFreshFoodKpiView,
  toHydropowerForecastView,
  toHydropowerKpiView,
  toPriceForecastView,
  toPriceKpiView,
  type AdminArticle,
  type AdminArticleStatus,
  type FireRiskView,
  type DroughtReportView,
  type FreshFoodGaugeView,
  type FreshFoodKpiView,
  type HydropowerForecastView,
  type HydropowerKpiView,
  type OpenApiPeriod,
  type PriceForecastKey,
  type PriceForecastView,
  type PriceKpiView,
  type SummaryAlert
} from "@/lib/api-client";
import { PERIOD_YEARS, availableMonths, clampPeriod, isPeriodAtEnd, isPeriodAtStart, shiftPeriod } from "@/lib/period";
import { apiCatalog, cpiSeries, fireRisk, forecasts, kpis, reports, type ApiCatalogItem, type ForecastKey, type ViewKey } from "@/lib/mock-data";

type PriceApiState = {
  status: "loading" | "success" | "empty" | "error";
  forecast: PriceForecastView | null;
  kpi: PriceKpiView | null;
  latestDate: string | null;
};

type PriceApiStates = Record<PriceForecastKey, PriceApiState>;

type HydropowerApiState = {
  status: "loading" | "success" | "empty" | "error";
  forecast: HydropowerForecastView | null;
  kpi: HydropowerKpiView | null;
  latestDate: string | null;
};

type FireRiskApiState = {
  status: "loading" | "success" | "empty" | "error";
  items: FireRiskView | null;
  latestDate: string | null;
};

type FreshFoodApiState = {
  status: "loading" | "success" | "empty" | "error";
  kpi: FreshFoodKpiView | null;
  gauge: FreshFoodGaugeView | null;
  latestDate: string | null;
};

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

type AdminApiState = {
  status: "idle" | "loading" | "success" | "error";
  articles: AdminArticle[];
  message: string | null;
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

function Blocks({ count, total = 4 }: { count: number; total?: number }) {
  return (
    <span className="steps">
      {Array.from({ length: total }).map((_, index) => (
        <i key={index} className={index < count ? "filled" : ""} />
      ))}
    </span>
  );
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

  const baseUrl = api.group === "관리"
    ? API_BASE_URLS.admin
    : api.group === "자료공유" || api.group === "파일"
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

const initialHydropowerApiState: HydropowerApiState = {
  status: "loading",
  forecast: null,
  kpi: null,
  latestDate: null
};

const initialFireRiskApiState: FireRiskApiState = {
  status: "loading",
  items: null,
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

const initialAdminApiState: AdminApiState = {
  status: "idle",
  articles: [],
  message: null
};

export default function Page() {
  const [view, setView] = useState<ViewKey>("home");
  const [forecast, setForecast] = useState<ForecastKey>("cabbage");
  const [selectedReportId, setSelectedReportId] = useState("r1");
  const [selectedApiPath, setSelectedApiPath] = useState(apiCatalog[0].path);
  const [priceApis, setPriceApis] = useState<PriceApiStates>({
    cabbage: initialPriceApiState,
    onion: initialPriceApiState
  });
  const [hydropowerApi, setHydropowerApi] = useState<HydropowerApiState>(initialHydropowerApiState);
  const [fireRiskApi, setFireRiskApi] = useState<FireRiskApiState>(initialFireRiskApiState);
  const [freshFoodApi, setFreshFoodApi] = useState<FreshFoodApiState>(initialFreshFoodApiState);
  const [summaryApi, setSummaryApi] = useState<SummaryApiState>(initialSummaryApiState);
  const [reportApi, setReportApi] = useState<ReportApiState>(initialReportApiState);
  const [adminToken, setAdminToken] = useState("");
  const [adminStatusFilter, setAdminStatusFilter] = useState<AdminArticleStatus | "ALL">("PENDING");
  const [adminApi, setAdminApi] = useState<AdminApiState>(initialAdminApiState);
  const [period, setPeriod] = useState<OpenApiPeriod>(() => ({ ...OPEN_API_DEFAULT_PERIOD }));
  const activeForecasts = useMemo(
    () => ({
      ...forecasts,
      cabbage: priceApis.cabbage.forecast ?? forecasts.cabbage,
      onion: priceApis.onion.forecast ?? forecasts.onion,
      hydro: hydropowerApi.forecast ?? forecasts.hydro
    }),
    [priceApis, hydropowerApi]
  );
  const activeKpis = useMemo(
    () => kpis.map((kpi) => {
      if (kpi.name === "고랭지배추 도매가격") return priceApis.cabbage.kpi ?? kpi;
      if (kpi.name === "양파 도매가격") return priceApis.onion.kpi ?? kpi;
      if (kpi.name === "수력발전량") return hydropowerApi.kpi ?? kpi;
      if (kpi.name === "신선식품물가지수") return freshFoodApi.kpi ?? kpi;
      return kpi;
    }),
    [priceApis, hydropowerApi, freshFoodApi]
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
  const activeFreshFoodGauge = freshFoodApi.gauge ?? {
    value: "121.7",
    baseMonth: "2026-08",
    monthOverMonthRate: "+1.8%",
    yearOverYearRate: "+9.2%",
    series: cpiSeries
  };
  const highestFireRisk = activeFireRisk.reduce((highest, current) => current.value > highest.value ? current : highest, activeFireRisk[0]);
  const priceStatuses = {
    cabbage: priceStatusText(priceApis.cabbage),
    onion: priceStatusText(priceApis.onion)
  };
  const hydropowerStatus = apiStatusText(hydropowerApi);
  const fireRiskStatus = apiStatusText(fireRiskApi);
  const freshFoodStatus = apiStatusText(freshFoodApi);
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
      regionName: highestFireRisk.name,
      title: `${highestFireRisk.name} 산불위험지수 ${highestFireRisk.value} — ‘${fireLevel(highestFireRisk.value)[0]}’ 단계`,
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
  const selectedApiRequiresAuth = selectedApi.params.some((param) => param.in === "header");

  useEffect(() => {
    const controller = new AbortController();

    async function loadPriceForecast(key: PriceForecastKey) {
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


    async function loadFreshFoodIndex() {
      try {
        const response = await fetchFreshFoodIndex({ signal: controller.signal, year: period.year, month: period.month });
        const nextKpi = toFreshFoodKpiView(response);
        const nextGauge = toFreshFoodGaugeView(response);

        if (!nextKpi || !nextGauge) {
          setFreshFoodApi({ status: "empty", kpi: null, gauge: null, latestDate: null });
          return;
        }

        setFreshFoodApi({
          status: "success",
          kpi: nextKpi,
          gauge: nextGauge,
          latestDate: response.baseMonth
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setFreshFoodApi({ status: "error", kpi: null, gauge: null, latestDate: null });
      }
    }



    loadPriceForecast("cabbage");
    loadPriceForecast("onion");
    loadHydropowerForecast();
    loadFreshFoodIndex();

    return () => controller.abort();
  }, [period]);

  // 산불위험지수는 일 단위, 종합 현황과 리포트는 조회 연월과 무관하므로 최초 1회만 불러온다.
  useEffect(() => {
    const controller = new AbortController();

    async function loadFireRiskIndex() {
      try {
        const response = await fetchFireRiskIndex({ signal: controller.signal });
        const nextItems = toFireRiskView(response);

        if (!nextItems) {
          setFireRiskApi({ status: "empty", items: null, latestDate: null });
          return;
        }

        setFireRiskApi({
          status: "success",
          items: nextItems,
          latestDate: latestFireRiskObservedAt(response)
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setFireRiskApi({ status: "error", items: null, latestDate: null });
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
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadAdminArticles = async () => {
    setAdminApi((current) => ({ ...current, status: "loading", message: null }));
    try {
      const response = await fetchAdminArticles(adminToken.trim(), {
        status: adminStatusFilter === "ALL" ? undefined : adminStatusFilter
      });
      setAdminApi({
        status: "success",
        articles: response.content,
        message: `총 ${response.totalElements}건`
      });
    } catch (error) {
      setAdminApi({ status: "error", articles: [], message: "관리자 API 호출에 실패했습니다." });
    }
  };

  const decideAdminArticle = async (id: number, action: "approve" | "reject") => {
    try {
      if (action === "approve") {
        await approveAdminArticle(adminToken.trim(), id);
      } else {
        await rejectAdminArticle(adminToken.trim(), id);
      }
      await loadAdminArticles();
    } catch (error) {
      setAdminApi((current) => ({ ...current, status: "error", message: "상태 변경에 실패했습니다." }));
    }
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
      <header className="hdr">
        <div className="hdr-in">
          <button className="brand" onClick={() => go("home")} aria-label="홈으로">
            <span className="brand-mark">
              <Sprout size={18} />
            </span>
            <span className="brand-tx">
              가뭄영향정보플랫폼
              <small>DROUGHT IMPACT PLATFORM</small>
            </span>
          </button>
          <nav className="nav" aria-label="주요 메뉴">
            <div className="nav-grp">
              <div className="nav-eyebrow">정형 데이터</div>
              <div className="nav-row">
                <button className="nav-btn" aria-current={view === "home" ? "page" : undefined} onClick={() => go("home")}>종합 현황</button>
                <button className="nav-btn" aria-current={view === "forecast" ? "page" : undefined} onClick={() => go("forecast")}>예측·지수</button>
              </div>
            </div>
            <div className="nav-grp">
              <div className="nav-eyebrow">비정형 데이터</div>
              <div className="nav-row">
                <button className="nav-btn" aria-current={view === "reports" || view === "detail" ? "page" : undefined} onClick={() => go("reports")}>가뭄영향 리포트</button>
                <Link href="/archive" className="nav-btn">가뭄 자료실</Link>
              </div>
            </div>
            <div className="nav-grp">
              <div className="nav-eyebrow">개발자</div>
              <div className="nav-row">
                <button className="nav-btn" aria-current={view === "api" ? "page" : undefined} onClick={() => go("api")}>API 센터</button>
                <button className="nav-btn" aria-current={view === "admin" ? "page" : undefined} onClick={() => go("admin")}>관리</button>
              </div>
            </div>
          </nav>
        </div>
      </header>

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
                  <div className="chart-val">{fc.current}<u>{fc.unit}</u></div>
                  <div className="chart-sub">{fc.sub}</div>
                </div>
                <div className="accuracy">
                  <span>예측 정확도</span>
                  <b>{fc.error}</b>
                  <small>최근 30일 평균 오차율</small>
                </div>
              </div>
              {(forecast === "cabbage" || forecast === "onion") && priceApis[forecast].status !== "success" && <div className="data-note">{priceStatuses[forecast]}</div>}
              {forecast === "hydro" && hydropowerApi.status !== "success" && <div className="data-note">{hydropowerStatus}</div>}
              <ForecastChart actual={fc.actual} predicted={fc.predicted} band={fc.band} />
              <div className="legend">
                <span><i className="solid" />실측치</span>
                <span><i className="dash" />예측치</span>
                <span><i className="band" />신뢰구간 95%</span>
              </div>
              <div className="source-line"><b>출처</b> {fc.source}<span>|</span><b>갱신</b> {forecast === "cabbage" || forecast === "onion" ? priceApis[forecast].latestDate ?? priceStatuses[forecast] : hydropowerApi.latestDate ?? hydropowerStatus}</div>
            </div>

            <SectionHead title="지수형 지표" note="가뭄이 누적될수록 함께 상승하는 지표들을 표시합니다" />
            <div className="split">
              <div className="card">
                <div className="panel-hd">
                  <div>
                    <h3>산불위험지수 — 관측지역 비교</h3>
                    <p>3시간 주기 갱신 · 스파크라인은 최근 7일 추이</p>
                  </div>
                  <div className="mini-stat"><span>최고 위험</span><b>{highestFireRisk.value}</b><small>{highestFireRisk.name} · {fireLevel(highestFireRisk.value)[0]}</small></div>
                </div>
                {fireRiskApi.status !== "success" && <div className="data-note">{fireRiskStatus}</div>}
                {activeFireRisk.map((fire) => {
                  const [label, cls] = fireLevel(fire.value);
                  return (
                    <div className="fire-row" key={fire.name}>
                      <span className="fire-name"><b>{fire.name}</b><small>{fire.sido}</small></span>
                      <Sparkline data={fire.series} className="fire-spark" color={cls === "lv3" ? "var(--r3-dot)" : "var(--brand)"} />
                      <b className="fire-value">{fire.value}</b>
                      <span className={fire.delta.startsWith("+") ? "up" : "down"}>{fire.delta}</span>
                      <span className={`badge ${cls}`}><Blocks count={fireBlockCount(cls)} />{label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="card gauge">
                <h3>신선식품물가지수</h3>
                <p>전국 단위 지표 · 지역별 세분은 제공되지 않습니다</p>
                {freshFoodApi.status !== "success" && <div className="data-note">{freshFoodStatus}</div>}
                <div className="gauge-value">{activeFreshFoodGauge.value}<span>2020년 = 100 · {activeFreshFoodGauge.baseMonth}</span></div>
                <div className="gauge-deltas"><span>전월대비 <b>{activeFreshFoodGauge.monthOverMonthRate}</b></span><span>전년동월대비 <b>{activeFreshFoodGauge.yearOverYearRate}</b></span></div>
                <Sparkline data={activeFreshFoodGauge.series} className="cpi" />
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
                <div className="response">{selectedApiRequiresAuth ? "보호 API · 헤더 필요" : "공개 API · 로컬 서버 기준"}</div>
                <h3><KeyRound size={16} />인증 상태</h3>
                <div className="key"><span>{selectedApiRequiresAuth ? "X-Admin-Token 필요" : "공개 조회 API"}</span></div>
              </div>
            </div>
          </section>
        )}

        {view === "admin" && (
          <section className="view">
            <SectionHead title="게시글 관리" note={adminApi.message ?? "승인 대기와 변경 요청을 검토합니다"} />
            <div className="card api-doc">
              <div className="admin-controls">
                <label>관리자 토큰<input type="password" value={adminToken} onChange={(event) => setAdminToken(event.target.value)} placeholder="선택 입력" /></label>
                <label>상태
                  <select value={adminStatusFilter} onChange={(event) => setAdminStatusFilter(event.target.value as AdminArticleStatus | "ALL")}>
                    <option value="PENDING">PENDING</option>
                    <option value="UPDATED_PENDING">UPDATED_PENDING</option>
                    <option value="DELETED_PENDING">DELETED_PENDING</option>
                    <option value="ALL">ALL</option>
                  </select>
                </label>
                <button onClick={loadAdminArticles}><Send size={15} />조회</button>
              </div>
              <table>
                <thead>
                  <tr><th>ID</th><th>제목</th><th>기관</th><th>상태</th><th>분류</th><th>출처/분석</th><th>처리</th></tr>
                </thead>
                <tbody>
                  {adminApi.articles.map((article) => (
                    <tr key={article.id}>
                      <td>{article.id}</td>
                      <td>{article.title}</td>
                      <td>{article.authorOrganization}</td>
                      <td>{article.status}</td>
                      <td>{article.documentType} · {article.subjectDomain}</td>
                      <td>
                        <div className="admin-meta">
                          <span>{article.source ?? "출처 미입력"} · 기사 {article.sourceArticleCount}건</span>
                          {article.sourceUrl && <a href={article.sourceUrl} target="_blank" rel="noreferrer">원문</a>}
                          <small>{article.regionMentions.join(", ") || "지역 언급 없음"}</small>
                          <small>{article.keywords.map((keyword) => `#${keyword}`).join(" ") || "키워드 없음"}</small>
                          <small>{article.autoSummaryNotice ?? "자동 요약 고지 없음"}</small>
                        </div>
                      </td>
                      <td>
                        <button onClick={() => decideAdminArticle(article.id, "approve")}>승인</button>
                        <button onClick={() => decideAdminArticle(article.id, "reject")}>반려</button>
                      </td>
                    </tr>
                  ))}
                  {adminApi.articles.length === 0 && (
                    <tr><td colSpan={7}>{adminApi.status === "loading" ? "조회 중" : "표시할 게시글이 없습니다"}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </>
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
