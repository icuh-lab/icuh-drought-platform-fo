import { shiftMonth } from "../lib/api-client";

let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  const ok = a === e;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}\n      got  ${a}\n      want ${e}`);
  if (!ok) failed++;
}

check("같은 해 안에서 이동", shiftMonth("2026-10-01", 1), { year: 2026, month: 11 });
check("연말에서 다음 해로 넘어감", shiftMonth("2026-11-01", 2), { year: 2027, month: 1 });
check("여러 달 이동", shiftMonth("2026-08-01", 3), { year: 2026, month: 11 });

process.exit(failed === 0 ? 0 : 1);
