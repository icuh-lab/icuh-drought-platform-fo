import { readFileSync } from "node:fs";
import {
  ONION_VIEW_FUTURE_DAYS,
  ONION_VIEW_PAST_DAYS,
  buildOnionPriceSeries,
  monthTicks,
  monthsInWindow,
  monthsMissingActual,
  nearestHorizon,
  nearestPoint,
  priceAxisTicks,
  shiftDate,
  yearlyAccuracy,
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

// --- 기본 창이 실제로 창 경계까지 흘러가는가 ---
// 상수가 리터럴과 같은지 묻는 대신(그건 결함을 못 잡는다) 기본값을 안 넘겼을 때
// 실제로 만들어지는 창을 본다. 기본 파라미터가 빠지거나 상수 배선이 끊기면 여기서 걸린다.
const B = "2026-08-25";
function liveRow(horizonDays: number, targetDate: string): RawVintageEntry {
  return { targetDate, horizonDays, source: "live", modelType: "random_forest", modelTrainEndDate: B, pred: 1000, actual: null, arrivalTon: null };
}
function reconstructedRow(horizonDays: number, targetDate: string): RawVintageEntry {
  return { ...liveRow(horizonDays, targetDate), source: "reconstructed_forecast" };
}
const wideEntries: RawVintageEntry[] = [];
for (let offset = -400; offset <= 400; offset++) {
  const date = shiftDate(B, offset);
  if (offset <= 0) {
    wideEntries.push(reconstructedRow(180, date), reconstructedRow(365, date));
  } else {
    // 백엔드는 T+205 까지 짧은 모델을, 그 뒤를 긴 모델로 이어 붙인다.
    wideEntries.push(liveRow(offset <= 205 ? 180 : 365, date));
  }
}
const wideMarket: RawMarketTrendPoint[] = wideEntries
  .filter((entry) => entry.source === "reconstructed_forecast" && entry.horizonDays === 180)
  .map((entry) => ({ trendDate: entry.targetDate, marketVolume: 500, avgWholesalePrice: 1000 }));

// 창을 명시하면 그 경계가 그대로 적용된다.
const windowed = buildOnionPriceSeries({ entries: wideEntries, market: wideMarket, pastDays: ONION_VIEW_PAST_DAYS, futureDays: ONION_VIEW_FUTURE_DAYS });
if (windowed === null) {
  console.log("FAIL  창을 명시해도 시리즈가 만들어져야 한다");
  failed++;
} else {
  check("명시한 창 시작", windowed.points[0].date, shiftDate(B, -ONION_VIEW_PAST_DAYS));
  check("명시한 창 끝", windowed.points[windowed.points.length - 1].date, shiftDate(B, ONION_VIEW_FUTURE_DAYS));
}
// 초기 스크롤 위치를 정하는 값이라 화면이 바뀌면 같이 바뀐다. 스펙이 정한 값이라 고정해 둔다.
check("초기 뷰 과거는 90일", ONION_VIEW_PAST_DAYS, 90);
check("초기 뷰 미래는 365일", ONION_VIEW_FUTURE_DAYS, 365);

// --- 리드타임이 바뀌는 지점 ---
// 미래 창이 짧으면 미래선이 단일 리드타임이지만, 길어지면 중간에 더 긴 모델로 넘어간다.
// 화면의 "예측 정확도" 는 짧은 쪽 리드타임으로 계산한 값이라, 넘어가는 자리를 표시하지
// 않으면 그 숫자가 선 전체를 설명하는 것처럼 읽힌다.
const shortWindow = buildOnionPriceSeries({ entries: wideEntries, market: wideMarket, pastDays: 90, futureDays: 183 });
check("미래 창이 짧으면 리드타임이 안 바뀐다", shortWindow?.horizonSwitchDate, null);

const longWindow = buildOnionPriceSeries({ entries: wideEntries, market: wideMarket, pastDays: 90, futureDays: 365 });
check("미래 창이 길면 T+206 에서 바뀐다", longWindow?.horizonSwitchDate, shiftDate(B, 206));
check("겹침 계산은 짧은 리드타임 기준", longWindow?.horizonDays, 180);

// 창 안에 실제로 존재하는 리드타임만 센다 — 없는 전환을 그리면 안 된다.
check("live 가 단일 리드타임이면 전환 없음", series?.horizonSwitchDate, null);

// --- 실측은 두 곳에서 온다 ---
// vintage 의 actual 이 2022~2025 를 덮는다. 그걸 안 쓰면 daily-market 을 56 개월치
// 불러야 하는데, 운영 서버는 동시 요청을 몰아치면 넘어간 전력이 있다.
const vintageActual: RawVintageEntry[] = [
  { targetDate: "2024-03-04", horizonDays: 180, source: "reconstructed_forecast", modelType: "rf", modelTrainEndDate: B, pred: 900, actual: 880, arrivalTon: null },
  { targetDate: "2024-03-05", horizonDays: 180, source: "reconstructed_forecast", modelType: "rf", modelTrainEndDate: B, pred: 910, actual: 905, arrivalTon: null },
  { targetDate: "2024-03-06", horizonDays: 180, source: "reconstructed_forecast", modelType: "rf", modelTrainEndDate: B, pred: 920, actual: null, arrivalTon: null },
  liveRow(180, "2026-08-26")
];
const merged = buildOnionPriceSeries({ entries: vintageActual, market: [] });
check("vintage 의 actual 만으로도 실측선이 생긴다", merged?.points.filter((p) => p.actual !== null).length, 2);
check("vintage actual 값이 그대로 실린다", merged?.points.find((p) => p.date === "2024-03-05")?.actual, 905);
check("actual 이 null 인 행은 실측이 아니다", merged?.points.find((p) => p.date === "2024-03-06")?.actual, null);

// 같은 날짜가 양쪽에 있으면 daily-market 이 이긴다 — 실측이 갱신되는 쪽이라서.
const overridden = buildOnionPriceSeries({
  entries: vintageActual,
  market: [{ trendDate: "2024-03-06", marketVolume: 100, avgWholesalePrice: 931 }]
});
check("daily-market 이 vintage 공백을 메운다", overridden?.points.find((p) => p.date === "2024-03-06")?.actual, 931);

// --- 창을 안 주면 데이터가 있는 만큼 전부 ---
const full = buildOnionPriceSeries({ entries: wideEntries, market: wideMarket });
check("창 미지정이면 가장 이른 날부터", full?.points[0].date, shiftDate(B, -400));
check("창 미지정이면 가장 늦은 날까지", full?.points[full.points.length - 1].date, shiftDate(B, 400));

// --- daily-market 으로 채워야 할 달 ---
// vintage 에 실측이 한 건도 없는 달만 고른다. 전 구간을 부르면 56 회가 된다.
checkJson("실측이 없는 달만 고른다", monthsMissingActual(vintageActual, "2024-02-01", "2024-04-30"), [
  { year: 2024, month: 2 },
  { year: 2024, month: 4 }
]);
checkJson("기준일 이후 달은 안 부른다", monthsMissingActual(vintageActual, "2024-03-01", "2024-03-31"), []);
checkJson("실측이 하나도 없으면 전부", monthsMissingActual([], "2026-01-01", "2026-03-31"), [
  { year: 2026, month: 1 },
  { year: 2026, month: 2 },
  { year: 2026, month: 3 }
]);

// --- Y축 눈금: 0원부터 500원 단위 ---
checkJson("0 부터 500 단위로 올림", priceAxisTicks(2116), [0, 500, 1000, 1500, 2000, 2500]);
checkJson("눈금에 딱 맞으면 그 위를 더 만들지 않는다", priceAxisTicks(2000), [0, 500, 1000, 1500, 2000]);
checkJson("값이 작아도 0 과 한 칸은 있다", priceAxisTicks(120), [0, 500]);
checkJson("단위를 바꿀 수 있다", priceAxisTicks(2116, 1000), [0, 1000, 2000, 3000]);

// --- X축 눈금: 월 단위 ---
checkJson("범위 안 매월 1일", monthTicks("2026-01-15", "2026-04-02"), ["2026-02-01", "2026-03-01", "2026-04-01"]);
checkJson("시작이 1일이면 그날도 포함", monthTicks("2026-02-01", "2026-03-05"), ["2026-02-01", "2026-03-01"]);
checkJson("연 경계를 넘는다", monthTicks("2025-11-20", "2026-02-10"), ["2025-12-01", "2026-01-01", "2026-02-01"]);
checkJson("한 달도 안 되면 빈 배열", monthTicks("2026-02-02", "2026-02-20"), []);

// --- 툴팁 히트테스트 ---
const hitPoints = [
  { date: "2026-08-03", actual: 1165, predicted: 1100 },
  { date: "2026-08-10", actual: 1186, predicted: 1120 },
  { date: "2026-08-20", actual: null, predicted: 1130 }
];
check("정확히 일치하는 날", nearestPoint(hitPoints, "2026-08-10")?.date, "2026-08-10");
check("가까운 날로 붙는다", nearestPoint(hitPoints, "2026-08-12")?.date, "2026-08-10");
check("휴장일 건너 오른쪽이 더 가까우면 그쪽", nearestPoint(hitPoints, "2026-08-18")?.date, "2026-08-20");
check("너무 멀면 null", nearestPoint(hitPoints, "2026-09-30"), null);
check("빈 배열이면 null", nearestPoint([], "2026-08-10"), null);

// --- 연도별 정확도 ---
// 리드타임별 패널을 없애고 이 값이 헤더의 정확도 자리를 대신한다.
const yearPoints = [
  { date: "2024-01-10", actual: 1000, predicted: 1100 },  // 오차 10%
  { date: "2024-06-20", actual: 1000, predicted: 900 },   // 오차 10%
  { date: "2025-03-02", actual: 500, predicted: 510 },    // 오차 2%
  { date: "2025-09-09", actual: 500, predicted: 480 },    // 오차 4%
  { date: "2025-11-11", actual: 800, predicted: 800 },    // 오차 0%
  { date: "2026-04-04", actual: 1000, predicted: 1050 },  // 오차 5%
  // 한쪽만 있는 날은 겹침이 아니라 표본에서 빠진다.
  { date: "2026-05-05", actual: null, predicted: 1200 },
  { date: "2026-06-06", actual: 1200, predicted: null }
];
checkJson("연도별 MAPE 와 표본", yearlyAccuracy(yearPoints), [
  { year: 2024, mape: 10, sampleDays: 2 },
  { year: 2025, mape: 2, sampleDays: 3 },
  { year: 2026, mape: 5, sampleDays: 1 }
]);
checkJson("연도순으로 정렬된다", yearlyAccuracy([...yearPoints].reverse()).map((row) => row.year), [2024, 2025, 2026]);
checkJson("겹침이 없으면 빈 배열", yearlyAccuracy([{ date: "2026-01-01", actual: null, predicted: 100 }]), []);
checkJson("빈 입력", yearlyAccuracy([]), []);
// 실측이 0 원인 날은 나눗셈이 깨진다. 그런 날은 표본에서 뺀다.
checkJson("실측 0 원인 날은 뺀다", yearlyAccuracy([
  { date: "2026-01-01", actual: 0, predicted: 100 },
  { date: "2026-01-02", actual: 1000, predicted: 900 }
]), [{ year: 2026, mape: 10, sampleDays: 1 }]);

console.log(failed === 0 ? "\n모든 검증 통과" : `\n${failed}건 실패`);
process.exit(failed === 0 ? 0 : 1);
