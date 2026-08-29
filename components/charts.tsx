import { daysBetween, type OnionPricePoint } from "@/lib/onion-price";

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

export function ForecastChart({ actual, predicted, band, unit = "" }: { actual: number[]; predicted: number[]; band: number[]; unit?: string }) {
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
    xLabels.push({ text: `최근 ${actual.length}일 실측`, x: PAD.left, align: "start" });
    xLabels.push({ text: "오늘", x: todayX, align: "middle" });
    if (predicted.length > 0) {
      xLabels.push({ text: `향후 ${predicted.length}일 예측`, x: CHART_WIDTH - PAD.right, align: "end" });
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

/**
 * 실측과 예측을 같은 날짜축 위에 겹쳐 그린다. ForecastChart 는 실측 구간 뒤에 예측
 * 구간을 이어붙이는 모양(미래 전망용)이라, "그 날짜에 실측과 예측이 둘 다 있다"는
 * vintage 정확도 검증에는 안 맞는다 — 여긴 같은 index 의 실측·예측이 같은 x 좌표를 쓴다.
 */
export function VintageAccuracyChart({ actual, predicted, dates }: { actual: number[]; predicted: number[]; dates: string[] }) {
  const all = [...actual, ...predicted];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;
  const valueToY = (value: number) => PAD.top + PLOT_HEIGHT - ((value - min) / range) * PLOT_HEIGHT;
  const xAt = (index: number) => PAD.left + (index * PLOT_WIDTH) / Math.max(actual.length - 1, 1);
  const xy = (value: number, index: number) => [xAt(index), valueToY(value)] as const;
  const actualPts = actual.map((value, index) => xy(value, index));
  const predictedPts = predicted.map((value, index) => xy(value, index));
  const yTicks = [min, (min + max) / 2, max];

  const tickCount = Math.min(5, dates.length);
  const tickIndices = Array.from(
    new Set(
      tickCount <= 1
        ? [0]
        : Array.from({ length: tickCount }, (_, i) => Math.round((i * (dates.length - 1)) / (tickCount - 1)))
    )
  );

  return (
    <ChartFrame
      caption="X축: 대상 날짜 · Y축: 가격(원/kg)"
      yLabels={yTicks.map((value) => ({ text: formatAxisValue(value), y: valueToY(value) }))}
      xLabels={tickIndices.map((i) => ({
        text: formatShortDate(dates[i]),
        x: xAt(i),
        align: i === 0 ? "start" : i === dates.length - 1 ? "end" : "middle"
      }))}
    >
      <svg className="forecast-chart" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none" role="img" aria-label="리드타임별 실측치와 예측치 비교 시계열 그래프">
        {yTicks.map((value, index) => (
          <line key={index} x1={PAD.left} x2={CHART_WIDTH - PAD.right} y1={valueToY(value)} y2={valueToY(value)} stroke="var(--line)" />
        ))}
        {tickIndices.map((i) => (
          <line key={i} x1={xAt(i)} x2={xAt(i)} y1={PAD.top} y2={CHART_HEIGHT - PAD.bottom} stroke="var(--line)" strokeDasharray="2 4" />
        ))}
        <polyline points={toLine(actualPts)} fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={toLine(predictedPts)} fill="none" stroke="var(--up)" strokeWidth="3" strokeDasharray="7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </ChartFrame>
  );
}

/**
 * 실측과 예측을 실제 날짜축 위에 겹쳐 그린다.
 *
 * ForecastChart 는 실측 뒤에 예측을 이어 붙이는 모양이고 VintageAccuracyChart 는 과거만
 * 겹치는 모양이라, "기준일 앞은 겹치고 뒤는 예측만" 인 이 화면에는 둘 다 안 맞는다.
 * 인덱스가 아니라 날짜로 x 를 잡기 때문에 실측만·예측만 있는 날이 섞여도 선이 안 밀린다.
 */
export function OverlayForecastChart({
  points,
  boundaryDate,
  horizonSwitchDate = null
}: {
  points: OnionPricePoint[];
  boundaryDate: string;
  /** 미래선의 리드타임이 더 긴 모델로 넘어가는 날. 화면의 오차율이 못 미치는 구간의 시작. */
  horizonSwitchDate?: string | null;
}) {
  const values = points.flatMap((point) => [point.actual, point.predicted]).filter((value): value is number => value !== null);
  if (points.length === 0 || values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const start = points[0].date;
  const end = points[points.length - 1].date;
  const span = Math.max(daysBetween(start, end), 1);
  const valueToY = (value: number) => PAD.top + PLOT_HEIGHT - ((value - min) / range) * PLOT_HEIGHT;
  const xAt = (date: string) => PAD.left + (daysBetween(start, date) * PLOT_WIDTH) / span;
  const xy = (value: number, date: string) => [xAt(date), valueToY(value)] as const;

  // 휴장일(주말·공휴일)은 이어 긋되, 한 주 넘게 실측이 비면 끊는다. 없는 구간을 직선으로
  // 메우면 데이터가 있는 것처럼 보인다.
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
  const yTicks = [min, (min + max) / 2, max];
  const switchX = horizonSwitchDate !== null && horizonSwitchDate > start && horizonSwitchDate <= end ? xAt(horizonSwitchDate) : null;

  const xLabels: XLabel[] = [
    { text: formatShortDate(start), x: PAD.left, align: "start" },
    { text: formatShortDate(boundaryDate), x: boundaryX, align: "middle" },
    { text: formatShortDate(end), x: CHART_WIDTH - PAD.right, align: "end" }
  ];
  if (switchX !== null) {
    xLabels.splice(2, 0, { text: `${formatShortDate(horizonSwitchDate as string)} 리드타임 전환`, x: switchX, align: "middle" });
  }

  return (
    <ChartFrame
      caption="X축: 날짜 · Y축: 가격(원/kg) · 첫 세로 점선까지가 실측"
      yLabels={yTicks.map((value) => ({ text: formatAxisValue(value), y: valueToY(value) }))}
      xLabels={xLabels}
    >
      <svg
        className="forecast-chart"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`실측치와 예측치 비교 시계열 그래프. ${boundaryDate} 까지는 실측과 예측이 함께, 그 뒤는 예측만 표시`}
      >
        {yTicks.map((value, index) => (
          <line key={index} x1={PAD.left} x2={CHART_WIDTH - PAD.right} y1={valueToY(value)} y2={valueToY(value)} stroke="var(--line)" />
        ))}
        <polyline points={toLine(predictedPts)} fill="none" stroke="var(--up)" strokeWidth="3" strokeDasharray="7 7" strokeLinecap="round" strokeLinejoin="round" />
        {actualSegments.map((pts, index) => (
          <polyline key={index} points={toLine(pts)} fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        <line x1={boundaryX} x2={boundaryX} y1={PAD.top} y2={CHART_HEIGHT - PAD.bottom} stroke="var(--line-2)" strokeDasharray="4 5" />
        {switchX !== null && (
          <line x1={switchX} x2={switchX} y1={PAD.top} y2={CHART_HEIGHT - PAD.bottom} stroke="var(--line)" strokeDasharray="2 6" />
        )}
      </svg>
    </ChartFrame>
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
