import { parseView, viewHref } from "../lib/dashboard-view";

let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got ${actual}, want ${expected})`);
  if (!ok) failed++;
}

check("알려진 뷰는 그대로", parseView("forecast"), "forecast");
// 관리 화면은 별도 어드민 서비스로 분리되어 제거됐다. 기존 링크는 종합 현황으로 떨어진다.
check("제거된 관리 뷰는 종합 현황으로", parseView("admin"), "home");
check("리포트 상세 뷰도 인식", parseView("detail"), "detail");
check("쿼리 없으면 종합 현황", parseView(null), "home");
check("빈 문자열도 종합 현황", parseView(""), "home");
check("모르는 값은 종합 현황", parseView("zzz"), "home");
check("대소문자는 구분한다", parseView("Forecast"), "home");

check("종합 현황은 쿼리 없는 루트", viewHref("home"), "/");
check("나머지는 view 쿼리", viewHref("api"), "/?view=api");
check("왕복 변환이 일치", parseView(new URL(`http://x${viewHref("reports")}`).searchParams.get("view")), "reports");

process.exit(failed === 0 ? 0 : 1);
