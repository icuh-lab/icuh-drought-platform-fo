import { actualAtPeriod, buildHydropowerVintageSeries, niceAxisStep, niceAxisTicks } from "../lib/hydropower-vintage";

let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  const ok = a === e;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}\n      got  ${a}\n      want ${e}`);
  if (!ok) failed++;
}

// --- buildHydropowerVintageSeries ---

check(
  "실측과 예측을 날짜로 합친다",
  buildHydropowerVintageSeries(
    [{ year: "2026", month: "9", lowerBound: 100, upperBound: 200 }],
    [{ year: "2026", month: "8", value: 500 }]
  ),
  {
    points: [
      { date: "2026-08-01", actual: 500, predicted: null },
      { date: "2026-09-01", actual: null, predicted: 150 }
    ],
    boundaryDate: "2026-08-01",
    latestActualDate: "2026-08-01",
    delta: null,
    current: 500
  }
);

check(
  "실측과 예측이 같은 달에 겹치면 한 포인트에 둘 다 채운다",
  buildHydropowerVintageSeries(
    [{ year: "2026", month: "8", lowerBound: 400, upperBound: 600 }],
    [{ year: "2026", month: "8", value: 500 }]
  ),
  {
    points: [{ date: "2026-08-01", actual: 500, predicted: 500 }],
    boundaryDate: "2026-08-01",
    latestActualDate: "2026-08-01",
    delta: null,
    current: 500
  }
);

check(
  "직전 실측월 대비 변동률을 계산한다",
  buildHydropowerVintageSeries(
    [],
    [
      { year: "2026", month: "7", value: 100 },
      { year: "2026", month: "8", value: 150 }
    ]
  )?.delta,
  50
);

check("실측·예측이 둘 다 없으면 null", buildHydropowerVintageSeries([], []), null);

check(
  "하한/상한이 null인 예측 행은 건너뛴다",
  buildHydropowerVintageSeries([{ year: "2026", month: "9", lowerBound: null, upperBound: null }], [])?.points ?? null,
  null
);

// --- niceAxisStep / niceAxisTicks ---

check("월 발전량 규모(10만 단위)에 적당한 간격을 고른다", niceAxisStep(117206), 50000);
check("작은 값(댐 저수량)에도 적당한 간격을 고른다", niceAxisStep(589), 200);
check("0 이하 최댓값은 1을 돌려준다", niceAxisStep(0), 1);

check("눈금이 최댓값을 덮을 때까지 0부터 간격대로 나온다", niceAxisTicks(117206), [
  0, 50000, 100000, 150000
]);

// --- 기간 선택기: 선택한 연/월의 실측(monthly-generation 은 기간 파라미터가 없어 전체 이력에서 골라낸다) ---
const hydroPeriodPoints = [
  { date: "2026-06-01", actual: 9000, predicted: 8800 },
  { date: "2026-07-01", actual: 9500, predicted: 9300 },
  { date: "2026-08-01", actual: 10000, predicted: 9800 },
  { date: "2026-09-01", actual: null, predicted: 10200 }
];
check("선택한 연/월의 실측값", actualAtPeriod(hydroPeriodPoints, 2026, 8).current, 10000);
check("고른 실측의 날짜도 돌려준다", actualAtPeriod(hydroPeriodPoints, 2026, 8).currentDate, "2026-08-01");
check("직전 실측월 대비 변동률", actualAtPeriod(hydroPeriodPoints, 2026, 8).delta, ((10000 - 9500) / 9500) * 100);
check("그 달에 실측이 없으면 전부 null", actualAtPeriod(hydroPeriodPoints, 2026, 9), {
  current: null,
  currentDate: null,
  delta: null
});
check("가장 이른 달은 직전 실측이 없어 delta null", actualAtPeriod(hydroPeriodPoints, 2026, 6).delta, null);

process.exit(failed === 0 ? 0 : 1);
