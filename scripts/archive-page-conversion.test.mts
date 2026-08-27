import { toApiPage, clampUiPage } from "../lib/api-client";

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

// 서버가 범위 밖 page 를 그대로 되돌려주므로(page=999 → 999, content:[]) 화면이 직접 접는다.
check("범위 안이면 그대로", clampUiPage(3, 9), 3);
check("마지막 페이지는 그대로", clampUiPage(9, 9), 9);
check("범위를 넘으면 마지막으로 접는다", clampUiPage(999, 9), 9);
check("자료 0건(totalPages 0)이면 1", clampUiPage(999, 0), 1);
check("undefined → 1", clampUiPage(undefined, 9), 1);
check("0 이하는 1로 보정", clampUiPage(0, 9), 1);
check("음수도 1로 보정", clampUiPage(-3, 9), 1);

process.exit(failed === 0 ? 0 : 1);
