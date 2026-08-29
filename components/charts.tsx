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

export function ForecastChart({ actual, predicted, band, unit = "" }: { actual: number[]; predicted: number[]; band: number[]; unit?: string }) {
  const width = 900;
  const height = 260;
  const all = [...actual, ...predicted.map((value, index) => value + band[index]), ...predicted.map((value, index) => value - band[index])];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;
  const padTop = 14;
  const padBottom = 30;
  const padLeft = 56;
  const padRight = 14;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const total = actual.length + predicted.length;
  const valueToY = (value: number) => padTop + plotHeight - ((value - min) / range) * plotHeight;
  const xy = (value: number, index: number) => [padLeft + (index * plotWidth) / Math.max(total - 1, 1), valueToY(value)] as const;
  const actualPts = actual.map((value, index) => xy(value, index));
  const predictedPts = predicted.map((value, index) => xy(value, actual.length + index));
  const upper = predicted.map((value, index) => xy(value + band[index], actual.length + index));
  const lower = predicted.map((value, index) => xy(value - band[index], actual.length + index)).reverse();
  const toLine = (pts: readonly (readonly [number, number])[]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const yTicks = [min, (min + max) / 2, max];
  const fmtY = (value: number) => Math.round(value).toLocaleString("ko-KR");
  const todayX = actualPts.length > 0 ? actualPts[actualPts.length - 1][0] : padLeft;

  return (
    <svg className="forecast-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="실측치와 예측치 비교 시계열 그래프">
      {yTicks.map((value, index) => {
        const y = valueToY(value);
        return (
          <g key={index}>
            <line x1={padLeft} x2={width - padRight} y1={y} y2={y} stroke="var(--line)" />
            <text x={padLeft - 8} y={y} fontSize="10" textAnchor="end" dominantBaseline="middle" fill="var(--ink-3)">{fmtY(value)}</text>
          </g>
        );
      })}
      <polygon points={toLine([...upper, ...lower])} fill="var(--brand)" opacity="0.12" />
      <polyline points={toLine(actualPts)} fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={toLine(predictedPts)} fill="none" stroke="var(--up)" strokeWidth="3" strokeDasharray="7 7" strokeLinecap="round" strokeLinejoin="round" />
      {actualPts.length > 0 && (
        <line x1={todayX} x2={todayX} y1={padTop} y2={height - padBottom} stroke="var(--line-2)" strokeDasharray="4 5" />
      )}
      {actualPts.length > 0 && (
        <>
          <text x={padLeft} y={height - padBottom + 16} fontSize="10" textAnchor="start" fill="var(--ink-3)">최근 {actual.length}일 실측</text>
          <text x={todayX} y={height - padBottom + 16} fontSize="10" textAnchor="middle" fill="var(--ink-3)">오늘</text>
          {predicted.length > 0 && (
            <text x={width - padRight} y={height - padBottom + 16} fontSize="10" textAnchor="end" fill="var(--ink-3)">향후 {predicted.length}일 예측</text>
          )}
        </>
      )}
      <text x={padLeft} y={12} fontSize="10" textAnchor="start" fill="var(--ink-3)">{unit ? `Y축: 가격(${unit})` : "Y축: 가격"}</text>
    </svg>
  );
}

/**
 * 실측과 예측을 같은 날짜축 위에 겹쳐 그린다. ForecastChart 는 실측 구간 뒤에 예측
 * 구간을 이어붙이는 모양(미래 전망용)이라, "그 날짜에 실측과 예측이 둘 다 있다"는
 * vintage 정확도 검증에는 안 맞는다 — 여기선 같은 index 의 실측·예측이 같은 x 좌표를 쓴다.
 */
function formatShortDate(iso: string): string {
  // "2026-08-26" -> "26-08-26" — 연도가 여러 해에 걸쳐 있어 앞 두 자리는 남긴다.
  return iso.length === 10 ? iso.slice(2) : iso;
}

export function VintageAccuracyChart({ actual, predicted, dates }: { actual: number[]; predicted: number[]; dates: string[] }) {
  const width = 900;
  const height = 260;
  const all = [...actual, ...predicted];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;
  const padTop = 14;
  const padBottom = 30;
  const padLeft = 56;
  const padRight = 14;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const valueToY = (value: number) => padTop + plotHeight - ((value - min) / range) * plotHeight;
  const xAt = (index: number) => padLeft + (index * plotWidth) / Math.max(actual.length - 1, 1);
  const xy = (value: number, index: number) => [xAt(index), valueToY(value)] as const;
  const actualPts = actual.map((value, index) => xy(value, index));
  const predictedPts = predicted.map((value, index) => xy(value, index));
  const toLine = (pts: readonly (readonly [number, number])[]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const yTicks = [min, (min + max) / 2, max];
  const fmtY = (value: number) => Math.round(value).toLocaleString("ko-KR");

  const tickCount = Math.min(5, dates.length);
  const tickIndices = Array.from(
    new Set(
      tickCount <= 1
        ? [0]
        : Array.from({ length: tickCount }, (_, i) => Math.round((i * (dates.length - 1)) / (tickCount - 1)))
    )
  );

  return (
    <svg className="forecast-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="리드타임별 실측치와 예측치 비교 시계열 그래프">
      {yTicks.map((value, index) => {
        const y = valueToY(value);
        return (
          <g key={index}>
            <line x1={padLeft} x2={width - padRight} y1={y} y2={y} stroke="var(--line)" />
            <text x={padLeft - 8} y={y} fontSize="10" textAnchor="end" dominantBaseline="middle" fill="var(--ink-3)">{fmtY(value)}</text>
          </g>
        );
      })}
      {tickIndices.map((i) => (
        <g key={i}>
          <line x1={xAt(i)} x2={xAt(i)} y1={padTop} y2={height - padBottom} stroke="var(--line)" strokeDasharray="2 4" />
          <text
            x={xAt(i)}
            y={height - padBottom + 16}
            fontSize="10"
            textAnchor={i === 0 ? "start" : i === dates.length - 1 ? "end" : "middle"}
            fill="var(--ink-3)"
          >
            {formatShortDate(dates[i])}
          </text>
        </g>
      ))}
      <polyline points={toLine(actualPts)} fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={toLine(predictedPts)} fill="none" stroke="var(--up)" strokeWidth="3" strokeDasharray="7 7" strokeLinecap="round" strokeLinejoin="round" />
      <text x={padLeft} y={12} fontSize="10" textAnchor="start" fill="var(--ink-3)">X축: 대상 날짜 · Y축: 가격(원/kg)</text>
    </svg>
  );
}

/**
 * 실측과 예측을 실제 날짜축 위에 겹쳐 그린다.
 *
 * ForecastChart 는 실측 뒤에 예측을 이어 붙이는 모양이고 VintageAccuracyChart 는 과거만
 * 겹치는 모양이라, "기준일 앞은 겹치고 뒤는 예측만" 인 이 화면에는 둘 다 안 맞는다.
 * 인덱스가 아니라 날짜로 x 를 잡기 때문에 실측만·예측만 있는 날이 섞여도 선이 안 밀린다.
 */
export function OverlayForecastChart({ points, boundaryDate }: { points: OnionPricePoint[]; boundaryDate: string }) {
  const width = 900;
  const height = 260;
  const padding = 28;
  const values = points.flatMap((point) => [point.actual, point.predicted]).filter((value): value is number => value !== null);
  if (points.length === 0 || values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const start = points[0].date;
  const span = Math.max(daysBetween(start, points[points.length - 1].date), 1);
  const xy = (value: number, date: string) => {
    const x = padding + (daysBetween(start, date) * (width - padding * 2)) / span;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return [x, y] as const;
  };
  const toLine = (pts: readonly (readonly [number, number])[]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

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
  const boundaryX = padding + (daysBetween(start, boundaryDate) * (width - padding * 2)) / span;

  return (
    <svg className="forecast-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`실측치와 예측치 비교 시계열 그래프. ${boundaryDate} 까지는 실측과 예측이 함께, 그 뒤는 예측만 표시`}>
      {[0.25, 0.5, 0.75].map((ratio) => (
        <line key={ratio} x1={padding} x2={width - padding} y1={padding + (height - padding * 2) * ratio} y2={padding + (height - padding * 2) * ratio} stroke="var(--line)" />
      ))}
      <polyline points={toLine(predictedPts)} fill="none" stroke="var(--up)" strokeWidth="3" strokeDasharray="7 7" strokeLinecap="round" strokeLinejoin="round" />
      {actualSegments.map((pts, index) => (
        <polyline key={index} points={toLine(pts)} fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      <line x1={boundaryX} x2={boundaryX} y1={padding} y2={height - padding} stroke="var(--line-2)" strokeDasharray="4 5" />
    </svg>
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
