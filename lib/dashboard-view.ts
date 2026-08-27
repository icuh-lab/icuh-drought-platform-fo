import type { ViewKey } from "@/lib/mock-data";

/** 대시보드 뷰는 URL 쿼리(?view=)로 결정된다. 값이 없거나 모르는 값이면 종합 현황이다. */
const VIEW_KEYS: ViewKey[] = ["home", "forecast", "reports", "detail", "api"];

export function parseView(value: string | null | undefined): ViewKey {
  return VIEW_KEYS.includes(value as ViewKey) ? (value as ViewKey) : "home";
}

/** 종합 현황은 기본값이므로 쿼리를 붙이지 않는다. */
export function viewHref(view: ViewKey): string {
  return view === "home" ? "/" : `/?view=${view}`;
}
