import { OPEN_API_DEFAULT_PERIOD } from "../lib/api-client";
import { PERIOD_YEARS, availableMonths, clampPeriod, isPeriodAtEnd, isPeriodAtStart, shiftPeriod } from "../lib/period";

let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  const ok = a === e;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}\n      got  ${a}\n      want ${e}`);
  if (!ok) failed++;
}

const { year: maxYear, month: maxMonth } = OPEN_API_DEFAULT_PERIOD;
const minYear = PERIOD_YEARS[0];
const pastYear = maxYear - 1;

check("선택 연도는 기본 연도까지 3개", PERIOD_YEARS, [maxYear - 2, maxYear - 1, maxYear]);
check("지난 연도는 12개월 모두 선택 가능", availableMonths(pastYear).length, 12);
check("기준 연도는 산출된 달까지만", availableMonths(maxYear), Array.from({ length: maxMonth }, (_, i) => i + 1));

check("1월에서 뒤로 가면 전년 12월", shiftPeriod({ year: maxYear, month: 1 }, -1), { year: pastYear, month: 12 });
check("12월에서 앞으로 가면 다음해 1월", shiftPeriod({ year: pastYear, month: 12 }, 1), { year: maxYear, month: 1 });
check("12개월 이동은 연도만 바뀐다", shiftPeriod({ year: pastYear, month: 5 }, -12), { year: pastYear - 1, month: 5 });

check("미래로는 기준 연월을 넘지 않는다", shiftPeriod({ year: maxYear, month: maxMonth }, 1), { year: maxYear, month: maxMonth });
check("과거로는 최소 연도 1월을 넘지 않는다", shiftPeriod({ year: minYear, month: 1 }, -1), { year: minYear, month: 1 });

check("기준 연도로 바꾸면 미산출 월은 보정", clampPeriod({ year: maxYear, month: 12 }), { year: maxYear, month: maxMonth });
check("범위 밖 과거 연도는 최소 연도 1월", clampPeriod({ year: minYear - 5, month: 7 }), { year: minYear, month: 1 });
check("0월 이하는 1월로 보정", clampPeriod({ year: pastYear, month: 0 }), { year: pastYear, month: 1 });

check("최신 시점이면 다음 버튼 비활성", isPeriodAtEnd({ year: maxYear, month: maxMonth }), true);
check("최초 시점이면 이전 버튼 비활성", isPeriodAtStart({ year: minYear, month: 1 }), true);
check("중간 시점은 양쪽 모두 활성", [isPeriodAtStart({ year: pastYear, month: 6 }), isPeriodAtEnd({ year: pastYear, month: 6 })], [false, false]);

process.exit(failed === 0 ? 0 : 1);
