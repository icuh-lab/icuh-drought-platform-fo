import { toApiPage } from "../lib/api-client";

let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got ${actual}, want ${expected})`);
  if (!ok) failed++;
}

check("UI 1페이지 → API 0", toApiPage(1), 0);
check("UI 2페이지 → API 1", toApiPage(2), 1);
check("UI 17페이지 → API 16", toApiPage(17), 16);
check("undefined → 0", toApiPage(undefined), 0);
check("0 이하는 0으로 보정", toApiPage(0), 0);
check("음수도 0으로 보정", toApiPage(-3), 0);

process.exit(failed === 0 ? 0 : 1);
