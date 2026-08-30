"use client";

import { useEffect, useRef, useState } from "react";
import {
  VINTAGE_VIEW_FUTURE_DAYS,
  VINTAGE_VIEW_PAST_DAYS,
  daysBetween,
  monthTicks,
  nearestPoint,
  priceAxisTicks,
  shiftDate,
  type VintagePricePoint
} from "@/lib/vintage-price-series";
import { niceAxisTicks, type HydropowerVintagePoint } from "@/lib/hydropower-vintage";

type SparkProps = {
  data: number[];
  color?: string;
  className?: string;
};

function points(data: number[], width: number, height: number, padding = 4) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return data.map((value, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(data.length - 1, 1);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return [x, y] as const;
  });
}

export function Sparkline({ data, color = "var(--brand)", className = "" }: SparkProps) {
  const width = 150;
  const height = 36;
  const pts = points(data, width, height);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} ${width - 4},${height} 4,${height}`;
  const last = pts[pts.length - 1];

  return (
    <svg className={`spark ${className}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <polygon points={area} fill={color} opacity="0.08" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
    </svg>
  );
}

// 세 차트가 같은 좌표계를 쓴다. 왼쪽 여백은 Y축 값 자리, 아래 여백은 날짜 자리다.
const CHART_WIDTH = 900;
const CHART_HEIGHT = 260;
const PAD = { top: 14, bottom: 30, left: 56, right: 14 };
const PLOT_WIDTH = CHART_WIDTH - PAD.left - PAD.right;
const PLOT_HEIGHT = CHART_HEIGHT - PAD.top - PAD.bottom;

type XLabel = { text: string; x: number; align: "start" | "middle" | "end" };
type YLabel = { text: string; y: number };

const toLine = (pts: readonly (readonly [number, number])[]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
const formatAxisValue = (value: number) => Math.round(value).toLocaleString("ko-KR");

/** "2026-08-26" → "26-08-26". 창이 여러 해에 걸쳐 있어 연도 두 자리는 남긴다. */
function formatShortDate(iso: string) {
  return iso.length === 10 ? iso.slice(2) : iso;
}

/**
 * 축 라벨을 SVG 밖 HTML 로 겹쳐 그린다.
 *
 * 차트 SVG 는 `preserveAspectRatio="none"` 이다 — 카드 폭이 얼마든 선이 폭을 꽉 채우게
 * 하려고 일부러 그렇게 뒀다. 그런데 그 안에 `<text>` 를 넣으면 글자까지 함께 늘어난다.
 * 1240px 레이아웃에서 viewBox 900 대비 가로만 1.29 배라 글자가 눈에 띄게 눌린다.
 * 라벨을 HTML 로 빼면 어떤 폭에서도 글자 비율이 유지된다.
 *
 * 세로는 높이가 260px 로 고정이라 px 를 그대로 쓰고, 가로만 viewBox 기준 비율(%)로 바꾼다.
 */
function ChartFrame({
  children,
  caption,
  yLabels = [],
  xLabels = []
}: {
  children: React.ReactNode;
  caption?: string;
  yLabels?: YLabel[];
  xLabels?: XLabel[];
}) {
  const ratio = (x: number) => `${((x / CHART_WIDTH) * 100).toFixed(3)}%`;

  return (
    <div className="chart-frame">
      {children}
      <div className="chart-labels" aria-hidden="true">
        {caption && <span className="lbl-caption" style={{ left: ratio(PAD.left) }}>{caption}</span>}
        {yLabels.map((label) => (
          <span key={`y-${label.text}-${label.y}`} className="lbl-y" style={{ top: `${label.y}px`, left: ratio(PAD.left - 8) }}>
            {label.text}
          </span>
        ))}
        {xLabels.map((label) => (
          <span
            key={`x-${label.text}-${label.x}`}
            className={`lbl-x lbl-${label.align}`}
            style={{ top: `${CHART_HEIGHT - PAD.bottom + 9}px`, left: ratio(label.x) }}
          >
            {label.text}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ForecastChart({ actual, predicted, band, unit = "", periodLabel = "일" }: { actual: number[]; predicted: number[]; band: number[]; unit?: string; periodLabel?: string }) {
  const all = [...actual, ...predicted.map((value, index) => value + band[index]), ...predicted.map((value, index) => value - band[index])];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;
  const total = actual.length + predicted.length;
  const valueToY = (value: number) => PAD.top + PLOT_HEIGHT - ((value - min) / range) * PLOT_HEIGHT;
  const xy = (value: number, index: number) => [PAD.left + (index * PLOT_WIDTH) / Math.max(total - 1, 1), valueToY(value)] as const;
  const actualPts = actual.map((value, index) => xy(value, index));
  const predictedPts = predicted.map((value, index) => xy(value, actual.length + index));
  const upper = predicted.map((value, index) => xy(value + band[index], actual.length + index));
  const lower = predicted.map((value, index) => xy(value - band[index], actual.length + index)).reverse();
  const yTicks = [min, (min + max) / 2, max];
  const todayX = actualPts.length > 0 ? actualPts[actualPts.length - 1][0] : PAD.left;

  const xLabels: XLabel[] = [];
  if (actualPts.length > 0) {
    xLabels.push({ text: `최근 ${actual.length}${periodLabel} 실측`, x: PAD.left, align: "start" });
    xLabels.push({ text: "오늘", x: todayX, align: "middle" });
    if (predicted.length > 0) {
      xLabels.push({ text: `향후 ${predicted.length}${periodLabel} 예측`, x: CHART_WIDTH - PAD.right, align: "end" });
    }
  }

  return (
    <ChartFrame
      caption={unit ? `Y축: 가격(${unit})` : "Y축: 가격"}
      yLabels={yTicks.map((value) => ({ text: formatAxisValue(value), y: valueToY(value) }))}
      xLabels={xLabels}
    >
      <svg className="forecast-chart" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none" role="img" aria-label="실측치와 예측치 비교 시계열 그래프">
        {yTicks.map((value, index) => (
          <line key={index} x1={PAD.left} x2={CHART_WIDTH - PAD.right} y1={valueToY(value)} y2={valueToY(value)} stroke="var(--line)" />
        ))}
        <polygon points={toLine([...upper, ...lower])} fill="var(--brand)" opacity="0.12" />
        <polyline points={toLine(actualPts)} fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={toLine(predictedPts)} fill="none" stroke="var(--up)" strokeWidth="3" strokeDasharray="7 7" strokeLinecap="round" strokeLinejoin="round" />
        {actualPts.length > 0 && (
          <line x1={todayX} x2={todayX} y1={PAD.top} y2={CHART_HEIGHT - PAD.bottom} stroke="var(--line-2)" strokeDasharray="4 5" />
        )}
      </svg>
    </ChartFrame>
  );
}

// 과거 몇 일 / 미래 몇 일을 초기 화면에 보여줄지. 양파(90/365, 일 단위 데이터)와 달리
// 수력발전량은 월 단위라 과거 1년 + 예측이 뻗어나가는 근 미래를 기본값으로 삼는다.
const HYDRO_VIEW_PAST_DAYS = 365;
const HYDRO_VIEW_FUTURE_DAYS = 120;

/**
 * 댐 발전량 실측·예측을 양파(OverlayForecastChart)와 같은 방식 — 실제 날짜축 위에 겹쳐
 * 그리고, 2022년부터의 전체 이력이라 가로로 스크롤한다 — 으로 그린다. 날짜로 x를 잡으므로
 * 실측만·예측만 있는 달이 섞여도 선이 안 밀린다.
 */
export function MonthlyOverlayChart({
  points,
  boundaryDate,
  unit = "MWh",
  metricLabel = "발전량"
}: {
  points: HydropowerVintagePoint[];
  boundaryDate: string;
  unit?: string;
  metricLabel?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ point: HydropowerVintagePoint; x: number } | null>(null);

  const values = points.flatMap((point) => [point.actual, point.predicted]).filter((value): value is number => value !== null);
  const start = points[0]?.date ?? boundaryDate;
  const end = points[points.length - 1]?.date ?? boundaryDate;
  const span = Math.max(daysBetween(start, end), 1);
  const plotWidth = Math.max(span * PX_PER_DAY, 600);

  // 열자마자 기준월 근처가 보이게 스크롤을 옮긴다.
  useEffect(() => {
    const node = scrollRef.current;
    if (node === null) return;
    const viewStart = daysBetween(start, shiftDate(boundaryDate, -HYDRO_VIEW_PAST_DAYS)) * PX_PER_DAY;
    const viewWidth = (HYDRO_VIEW_PAST_DAYS + HYDRO_VIEW_FUTURE_DAYS) * PX_PER_DAY;
    node.scrollLeft = Math.max(0, viewStart - Math.max(0, (node.clientWidth - viewWidth) / 2));
  }, [start, boundaryDate, plotWidth]);

  if (points.length === 0 || values.length === 0) return null;

  const ticks = niceAxisTicks(Math.max(...values));
  const axisTop = ticks[ticks.length - 1];
  const valueToY = (value: number) => OVERLAY_PAD.top + OVERLAY_PLOT_HEIGHT - (value / axisTop) * OVERLAY_PLOT_HEIGHT;
  const xAt = (date: string) => daysBetween(start, date) * PX_PER_DAY;
  const xy = (value: number, date: string) => [xAt(date), valueToY(value)] as const;

  // 월 하나가 비어도(28~31일) 이어 긋되, 그 두 배(45일)를 넘게 비면 끊는다 — 없는 달을
  // 직선으로 메우면 데이터가 있는 것처럼 보인다.
  const actualSegments: (readonly [number, number])[][] = [];
  let segment: (readonly [number, number])[] = [];
  let previousDate: string | null = null;
  for (const point of points) {
    if (point.actual === null) continue;
    if (previousDate !== null && daysBetween(previousDate, point.date) > 45) {
      actualSegments.push(segment);
      segment = [];
    }
    segment.push(xy(point.actual, point.date));
    previousDate = point.date;
  }
  if (segment.length > 0) actualSegments.push(segment);

  const predictedPts = points.filter((point) => point.predicted !== null).map((point) => xy(point.predicted as number, point.date));
  const boundaryX = xAt(boundaryDate);
  const months = monthTicks(start, end);

  function handleMove(event: React.MouseEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - box.left + event.currentTarget.scrollLeft;
    const found = nearestPoint(points, shiftDate(start, Math.round(x / PX_PER_DAY)));
    setHover(found === null ? null : { point: found, x: xAt(found.date) });
  }

  return (
    <div className="overlay-wrap">
      <div className="overlay-caption">X축: 날짜(눈금은 월 단위) · Y축: {metricLabel}({unit}) · 가로로 스크롤하면 {start.slice(0, 4)}년까지 갑니다</div>
      <div className="overlay-chart">
      <div className="overlay-axis" style={{ width: Y_GUTTER, height: OVERLAY_HEIGHT }} aria-hidden="true">
        {ticks.map((value) => (
          <span key={value} className="lbl-y" style={{ top: `${valueToY(value)}px`, left: Y_GUTTER - 8 }}>
            {formatAxisValue(value)}
          </span>
        ))}
      </div>
      <div
        className="overlay-scroll"
        ref={scrollRef}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`댐 ${metricLabel} 실측치와 예측치 비교 시계열 그래프. ${start} 부터 ${end} 까지. ${boundaryDate} 까지는 실측과 예측이 함께, 그 뒤는 예측만 표시`}
      >
        <div className="overlay-canvas" style={{ width: plotWidth, height: OVERLAY_HEIGHT }}>
          <svg width={plotWidth} height={OVERLAY_HEIGHT} viewBox={`0 0 ${plotWidth} ${OVERLAY_HEIGHT}`} aria-hidden="true">
            {ticks.map((value) => (
              <line key={value} x1={0} x2={plotWidth} y1={valueToY(value)} y2={valueToY(value)} stroke="var(--line)" />
            ))}
            {months.map((month) => (
              <line
                key={month}
                x1={xAt(month)}
                x2={xAt(month)}
                y1={OVERLAY_PAD.top}
                y2={OVERLAY_HEIGHT - OVERLAY_PAD.bottom}
                stroke="var(--line)"
                strokeDasharray={month.endsWith("-01-01") ? undefined : "2 6"}
              />
            ))}
            <polyline points={toLine(predictedPts)} fill="none" stroke="var(--up)" strokeWidth="2" strokeDasharray="6 6" strokeLinecap="round" strokeLinejoin="round" />
            {actualSegments.map((pts, index) => (
              <polyline key={index} points={toLine(pts)} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            <line x1={boundaryX} x2={boundaryX} y1={OVERLAY_PAD.top} y2={OVERLAY_HEIGHT - OVERLAY_PAD.bottom} stroke="var(--line-2)" strokeDasharray="4 5" />
            {hover && <line x1={hover.x} x2={hover.x} y1={OVERLAY_PAD.top} y2={OVERLAY_HEIGHT - OVERLAY_PAD.bottom} stroke="var(--ink-3)" />}
          </svg>
          <div className="overlay-months" aria-hidden="true">
            {months.map((month) => (
              <span key={month} className={month.endsWith("-01-01") ? "is-year" : ""} style={{ left: `${xAt(month)}px` }}>
                {month.endsWith("-01-01") ? month.slice(0, 4) : month.slice(5, 7) + "월"}
              </span>
            ))}
          </div>
          <span className="overlay-mark" style={{ left: `${boundaryX}px` }} aria-hidden="true">실측 종료</span>
          {hover && (
            <div className={`overlay-tip ${hover.x > plotWidth - 160 ? "is-left" : ""}`} style={{ left: `${hover.x}px` }}>
              <b>{hover.point.date}</b>
              <span><i className="solid" />실측 {hover.point.actual === null ? "—" : `${formatAxisValue(hover.point.actual)}${unit}`}</span>
              <span><i className="dash" />예측 {hover.point.predicted === null ? "—" : `${formatAxisValue(hover.point.predicted)}${unit}`}</span>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

// 하루당 가로 픽셀. 3px 이면 한 달이 약 91px 라 "22-01" 라벨이 안 겹치고,
// 주 단위 등락도 눈에 보인다.
const PX_PER_DAY = 3;
const OVERLAY_HEIGHT = 300;
const OVERLAY_PAD = { top: 16, bottom: 34 };
const OVERLAY_PLOT_HEIGHT = OVERLAY_HEIGHT - OVERLAY_PAD.top - OVERLAY_PAD.bottom;
const Y_GUTTER = 56;

/**
 * 실측과 예측을 실제 날짜축 위에 겹쳐 그린다. 2022년부터의 전체 이력이라 가로로 스크롤한다.
 *
 * ForecastChart 는 실측 뒤에 예측을 이어 붙이는 모양이라 "기준일 앞은 겹치고 뒤는
 * 예측만" 인 이 화면에 안 맞는다. 인덱스가 아니라 날짜로 x 를 잡기 때문에 실측만·
 * 예측만 있는 날이 섞여도 선이 안 밀린다.
 *
 * Y축은 스크롤을 따라가지 않게 밖으로 뺐다 — 같이 흘러가면 가격 눈금을 잃는다.
 */
export function OverlayForecastChart({
  points,
  boundaryDate,
  horizonSwitchDate = null,
  axisStep = 500
}: {
  points: VintagePricePoint[];
  boundaryDate: string;
  /** 미래선의 리드타임이 더 긴 모델로 넘어가는 날. 화면의 오차율이 못 미치는 구간의 시작. */
  horizonSwitchDate?: string | null;
  /** Y축 눈금 간격(원). 크롭마다 가격대가 달라 기본값(500)이 안 맞을 수 있다. */
  axisStep?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ point: VintagePricePoint; x: number } | null>(null);

  const values = points.flatMap((point) => [point.actual, point.predicted]).filter((value): value is number => value !== null);
  const start = points[0]?.date ?? boundaryDate;
  const end = points[points.length - 1]?.date ?? boundaryDate;
  const span = Math.max(daysBetween(start, end), 1);
  const plotWidth = Math.max(span * PX_PER_DAY, 600);

  // 열자마자 기준일 근처가 보이게 스크롤을 옮긴다. 초기 위치만 스펙의 90일/365일을 따른다.
  useEffect(() => {
    const node = scrollRef.current;
    if (node === null) return;
    const viewStart = daysBetween(start, shiftDate(boundaryDate, -VINTAGE_VIEW_PAST_DAYS)) * PX_PER_DAY;
    const viewWidth = (VINTAGE_VIEW_PAST_DAYS + VINTAGE_VIEW_FUTURE_DAYS) * PX_PER_DAY;
    // 초기 창이 화면보다 넓으면 왼쪽 끝(=최근 과거)에 맞춘다.
    node.scrollLeft = Math.max(0, viewStart - Math.max(0, (node.clientWidth - viewWidth) / 2));
  }, [start, boundaryDate, plotWidth]);

  if (points.length === 0 || values.length === 0) return null;

  const ticks = priceAxisTicks(Math.max(...values), axisStep);
  const axisTop = ticks[ticks.length - 1];
  const valueToY = (value: number) => OVERLAY_PAD.top + OVERLAY_PLOT_HEIGHT - (value / axisTop) * OVERLAY_PLOT_HEIGHT;
  const xAt = (date: string) => daysBetween(start, date) * PX_PER_DAY;
  const xy = (value: number, date: string) => [xAt(date), valueToY(value)] as const;

  // 휴장일(주말·공휴일)은 이어 긋되, 한 주 넘게 실측이 비면 끊는다. 없는 구간을 직선으로
  // 메우면 데이터가 있는 것처럼 보인다. 전체 이력에는 이런 공백이 열한 군데 있다.
  const actualSegments: (readonly [number, number])[][] = [];
  let segment: (readonly [number, number])[] = [];
  let previousDate: string | null = null;
  for (const point of points) {
    if (point.actual === null) continue;
    if (previousDate !== null && daysBetween(previousDate, point.date) > 7) {
      actualSegments.push(segment);
      segment = [];
    }
    segment.push(xy(point.actual, point.date));
    previousDate = point.date;
  }
  if (segment.length > 0) actualSegments.push(segment);

  const predictedPts = points.filter((point) => point.predicted !== null).map((point) => xy(point.predicted as number, point.date));
  const boundaryX = xAt(boundaryDate);
  const switchX = horizonSwitchDate !== null && horizonSwitchDate > start && horizonSwitchDate <= end ? xAt(horizonSwitchDate) : null;
  const months = monthTicks(start, end);

  function handleMove(event: React.MouseEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - box.left + event.currentTarget.scrollLeft;
    const found = nearestPoint(points, shiftDate(start, Math.round(x / PX_PER_DAY)));
    setHover(found === null ? null : { point: found, x: xAt(found.date) });
  }

  return (
    <div className="overlay-wrap">
      <div className="overlay-caption">X축: 날짜(눈금은 월 단위) · Y축: 가격(원/kg) · 가로로 스크롤하면 2022년까지 갑니다</div>
      <div className="overlay-chart">
      <div className="overlay-axis" style={{ width: Y_GUTTER, height: OVERLAY_HEIGHT }} aria-hidden="true">
        {ticks.map((value) => (
          <span key={value} className="lbl-y" style={{ top: `${valueToY(value)}px`, left: Y_GUTTER - 8 }}>
            {formatAxisValue(value)}
          </span>
        ))}
      </div>
      <div
        className="overlay-scroll"
        ref={scrollRef}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`실측치와 예측치 비교 시계열 그래프. ${start} 부터 ${end} 까지. ${boundaryDate} 까지는 실측과 예측이 함께, 그 뒤는 예측만 표시`}
      >
        <div className="overlay-canvas" style={{ width: plotWidth, height: OVERLAY_HEIGHT }}>
          <svg width={plotWidth} height={OVERLAY_HEIGHT} viewBox={`0 0 ${plotWidth} ${OVERLAY_HEIGHT}`} aria-hidden="true">
            {ticks.map((value) => (
              <line key={value} x1={0} x2={plotWidth} y1={valueToY(value)} y2={valueToY(value)} stroke="var(--line)" />
            ))}
            {months.map((month) => (
              <line
                key={month}
                x1={xAt(month)}
                x2={xAt(month)}
                y1={OVERLAY_PAD.top}
                y2={OVERLAY_HEIGHT - OVERLAY_PAD.bottom}
                stroke="var(--line)"
                strokeDasharray={month.endsWith("-01-01") ? undefined : "2 6"}
              />
            ))}
            <polyline points={toLine(predictedPts)} fill="none" stroke="var(--up)" strokeWidth="2" strokeDasharray="6 6" strokeLinecap="round" strokeLinejoin="round" />
            {actualSegments.map((pts, index) => (
              <polyline key={index} points={toLine(pts)} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            <line x1={boundaryX} x2={boundaryX} y1={OVERLAY_PAD.top} y2={OVERLAY_HEIGHT - OVERLAY_PAD.bottom} stroke="var(--line-2)" strokeDasharray="4 5" />
            {switchX !== null && (
              <line x1={switchX} x2={switchX} y1={OVERLAY_PAD.top} y2={OVERLAY_HEIGHT - OVERLAY_PAD.bottom} stroke="var(--line-2)" strokeDasharray="2 8" />
            )}
            {hover && <line x1={hover.x} x2={hover.x} y1={OVERLAY_PAD.top} y2={OVERLAY_HEIGHT - OVERLAY_PAD.bottom} stroke="var(--ink-3)" />}
          </svg>
          <div className="overlay-months" aria-hidden="true">
            {months.map((month) => (
              <span key={month} className={month.endsWith("-01-01") ? "is-year" : ""} style={{ left: `${xAt(month)}px` }}>
                {month.endsWith("-01-01") ? month.slice(0, 4) : month.slice(5, 7) + "월"}
              </span>
            ))}
          </div>
          <span className="overlay-mark" style={{ left: `${boundaryX}px` }} aria-hidden="true">실측 종료</span>
          {switchX !== null && (
            <span className="overlay-mark" style={{ left: `${switchX}px` }} aria-hidden="true">리드타임 전환</span>
          )}
          {hover && (
            <div className={`overlay-tip ${hover.x > plotWidth - 160 ? "is-left" : ""}`} style={{ left: `${hover.x}px` }}>
              <b>{hover.point.date}</b>
              <span><i className="solid" />실측 {hover.point.actual === null ? "—" : `${formatAxisValue(hover.point.actual)}원`}</span>
              <span><i className="dash" />예측 {hover.point.predicted === null ? "—" : `${formatAxisValue(hover.point.predicted)}원`}</span>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

/** 위험 등급을 4칸(리포트는 3칸) 눈금으로 보여준다. 숫자만으로는 등급 폭이 안 읽혀서 함께 쓴다. */
export function Blocks({ count, total = 4 }: { count: number; total?: number }) {
  return (
    <span className="steps">
      {Array.from({ length: total }).map((_, index) => (
        <i key={index} className={index < count ? "filled" : ""} />
      ))}
    </span>
  );
}
