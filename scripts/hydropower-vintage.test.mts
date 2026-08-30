import { buildHydropowerVintageSeries, niceAxisStep, niceAxisTicks } from "../lib/hydropower-vintage";

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

process.exit(failed === 0 ? 0 : 1);
