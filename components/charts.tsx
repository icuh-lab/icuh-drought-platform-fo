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

export function ForecastChart({ actual, predicted, band }: { actual: number[]; predicted: number[]; band: number[] }) {
  const width = 900;
  const height = 260;
  const all = [...actual, ...predicted.map((value, index) => value + band[index]), ...predicted.map((value, index) => value - band[index])];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;
  const padding = 28;
  const total = actual.length + predicted.length;
  const xy = (value: number, index: number) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(total - 1, 1);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return [x, y] as const;
  };
  const actualPts = actual.map((value, index) => xy(value, index));
  const predictedPts = predicted.map((value, index) => xy(value, actual.length + index));
  const upper = predicted.map((value, index) => xy(value + band[index], actual.length + index));
  const lower = predicted.map((value, index) => xy(value - band[index], actual.length + index)).reverse();
  const toLine = (pts: readonly (readonly [number, number])[]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  return (
    <svg className="forecast-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="실측치와 예측치 비교 시계열 그래프">
      {[0.25, 0.5, 0.75].map((ratio) => (
        <line key={ratio} x1={padding} x2={width - padding} y1={padding + (height - padding * 2) * ratio} y2={padding + (height - padding * 2) * ratio} stroke="var(--line)" />
      ))}
      <polygon points={toLine([...upper, ...lower])} fill="var(--brand)" opacity="0.12" />
      <polyline points={toLine(actualPts)} fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={toLine(predictedPts)} fill="none" stroke="var(--up)" strokeWidth="3" strokeDasharray="7 7" strokeLinecap="round" strokeLinejoin="round" />
      <line x1={actualPts[actualPts.length - 1][0]} x2={actualPts[actualPts.length - 1][0]} y1={padding} y2={height - padding} stroke="var(--line-2)" strokeDasharray="4 5" />
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
