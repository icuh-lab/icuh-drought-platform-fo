import { readFileSync } from "node:fs";
import {
  buildOnionPriceSeries,
  monthsInWindow,
  nearestHorizon,
  shiftDate,
  vintageBoundaryDate,
  type RawMarketTrendPoint,
  type RawVintageEntry
} from "../lib/onion-price";

let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got ${actual}, want ${expected})`);
  if (!ok) failed++;
}
function checkJson(name: string, actual: unknown, expected: unknown) {
  check(name, JSON.stringify(actual), JSON.stringify(expected));
}
function close(name: string, actual: number | null, expected: number, tolerance = 0.0001) {
  const ok = actual !== null && Math.abs(actual - expected) < tolerance;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got ${actual}, want ~${expected})`);
  if (!ok) failed++;
}

function fixture<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8")) as T;
}

const vintage = fixture<{ entries: RawVintageEntry[] }>("onion-vintage-slice.json");
const market = fixture<{ monthlyTrend: RawMarketTrendPoint[] }>("onion-market-2026-08.json");

// --- 날짜 계산 ---
check("하루 뒤", shiftDate("2026-08-25", 1), "2026-08-26");
check("하루 앞", shiftDate("2026-08-01", -1), "2026-07-31");
check("월 경계를 넘는다", shiftDate("2026-08-25", 7), "2026-09-01");
check("연 경계를 넘는다", shiftDate("2025-12-31", 1), "2026-01-01");
check("윤년 2월", shiftDate("2024-02-28", 1), "2024-02-29");
check("창 시작은 기준일에서 뒤로", shiftDate("2026-08-25", -24), "2026-08-01");

// --- 창이 걸친 달 ---
checkJson("한 달 안에 든 창", monthsInWindow("2026-08-01", "2026-08-25"), [{ year: 2026, month: 8 }]);
checkJson("월 경계를 넘는 창", monthsInWindow("2026-08-20", "2026-09-10"), [
  { year: 2026, month: 8 },
  { year: 2026, month: 9 }
]);
checkJson("연 경계를 넘는 창", monthsInWindow("2025-12-20", "2026-02-03"), [
  { year: 2025, month: 12 },
  { year: 2026, month: 1 },
  { year: 2026, month: 2 }
]);
check("6개월 창은 7개 달에 걸친다", monthsInWindow("2026-02-23", "2026-08-25").length, 7);

// --- 기준점: 모델 학습 종료일 ---
// 하드코딩하지 않고 live 행에서 뽑는다. 모델이 다시 돌면 이 값만 따라 움직인다.
check("live 행의 modelTrainEndDate 가 기준점", vintageBoundaryDate(vintage.entries), "2026-08-25");
check(
  "live 가 없으면 재구성 예측의 마지막 날로 떨어진다",
  vintageBoundaryDate(vintage.entries.filter((entry) => entry.source !== "live")),
  "2026-08-25"
);
check("행이 없으면 null", vintageBoundaryDate([]), null);

// --- 리드타임: 미래 구간의 가장 짧은 것을 과거 겹침에도 쓴다 ---
check("live 의 최소 리드타임", nearestHorizon(vintage.entries), 180);
check("live 가 없으면 null", nearestHorizon(vintage.entries.filter((entry) => entry.source !== "live")), null);

// --- 시리즈 조립 ---
const series = buildOnionPriceSeries({
  entries: vintage.entries,
  market: market.monthlyTrend,
  pastDays: 24,
  futureDays: 16
});

if (series === null) {
  console.log("FAIL  시리즈가 만들어져야 한다");
  failed++;
} else {
  check("기준점", series.boundaryDate, "2026-08-25");
  check("창 시작", series.points[0].date, "2026-08-01");
  check("창 끝", series.points[series.points.length - 1].date, "2026-09-10");
  check("날짜 합집합 포인트 수", series.points.length, 41);
  check("실측이 있는 날", series.points.filter((point) => point.actual !== null).length, 20);
  check("예측이 있는 날", series.points.filter((point) => point.predicted !== null).length, 41);

  // daily-market 은 실측이 끊긴 뒤를 예측으로 이어 채운다. 그 꼬리를 실측선으로 그리면
  // 지금 고치려는 문제가 그대로 재발한다 — 기준일 이후 행은 버려야 한다.
  const tail = series.points.find((point) => point.date === "2026-08-26");
  check("기준일 다음날은 실측이 없다", tail?.actual, null);
  close("기준일 다음날 예측은 live 값", tail?.predicted ?? null, 1128.19);
  check(
    "기준일 이후 실측은 하나도 없다",
    series.points.filter((point) => point.date > "2026-08-25" && point.actual !== null).length,
    0
  );

  // 리드타임이 섞이면 선이 한 줄로 안 읽힌다. 과거 겹침도 live 와 같은 180 일만 쓴다.
  const boundary = series.points.find((point) => point.date === "2026-08-25");
  close("과거 예측은 180일 리드타임 값", boundary?.predicted ?? null, 1125.75);
  check("과거 예측은 실측과 같은 날에 있다", boundary?.actual, 1122);

  // 예측만 있는 날 5일 · 실측만 있는 날 0일. 인덱스로 짝지으면 선이 밀린다.
  checkJson(
    "예측만 있는 날",
    series.points.filter((point) => point.actual === null && point.date <= "2026-08-25").map((point) => point.date),
    ["2026-08-01", "2026-08-02", "2026-08-09", "2026-08-16", "2026-08-23"]
  );

  check("현재값은 마지막 실측", series.current, 1122);
  check("현재값 날짜", series.latestActualDate, "2026-08-25");
  close("전일대비는 실측끼리 비교", series.delta, -0.708);
  close("겹침 구간 MAPE", series.errorRate, 2.0718);
}

// --- 데이터가 없을 때 ---
check("vintage 가 비면 null", buildOnionPriceSeries({ entries: [], market: market.monthlyTrend, pastDays: 24, futureDays: 16 }), null);

const noActual = buildOnionPriceSeries({ entries: vintage.entries, market: [], pastDays: 24, futureDays: 16 });
if (noActual === null) {
  console.log("FAIL  실측이 없어도 예측선은 그려야 한다");
  failed++;
} else {
  check("실측이 없어도 예측은 남는다", noActual.points.filter((point) => point.predicted !== null).length, 41);
  check("실측이 없으면 현재값 없음", noActual.current, null);
  check("실측이 없으면 오차율 없음", noActual.errorRate, null);
}

// 값이 null 인 행은 실측이 아니다.
const nullPrices: RawMarketTrendPoint[] = [
  { trendDate: "2026-08-20", marketVolume: 500, avgWholesalePrice: null },
  { trendDate: "2026-08-21", marketVolume: null, avgWholesalePrice: 1164 }
];
const sparse = buildOnionPriceSeries({ entries: vintage.entries, market: nullPrices, pastDays: 24, futureDays: 16 });
check("가격이 null 인 행은 버린다", sparse?.points.filter((point) => point.actual !== null).length, 1);
check("물량이 null 이어도 가격이 있으면 실측", sparse?.points.find((point) => point.date === "2026-08-21")?.actual, 1164);

console.log(failed === 0 ? "\n모든 검증 통과" : `\n${failed}건 실패`);
process.exit(failed === 0 ? 0 : 1);
