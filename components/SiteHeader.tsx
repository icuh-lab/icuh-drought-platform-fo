"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Sprout } from "lucide-react";
import { parseView, viewHref } from "@/lib/dashboard-view";
import type { ViewKey } from "@/lib/mock-data";

/**
 * 전 페이지 공용 헤더.
 *
 * 대시보드 뷰가 URL(?view=)로 결정되므로 메뉴는 전부 Link 다. 덕분에 대시보드에서 누르든
 * 자료실에서 누르든 같은 경로로 동작하고, 호출부에 넘길 props 도 없다.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onDashboard = pathname === "/";
  const view = onDashboard ? parseView(searchParams.get("view")) : null;
  const onArchive = pathname.startsWith("/archive");

  // 리포트 상세(detail)는 리포트 목록의 하위 화면이므로 같은 메뉴를 활성으로 표시한다.
  const isActive = (target: ViewKey) =>
    view === target || (target === "reports" && view === "detail");

  const navLink = (target: ViewKey, label: string) => (
    <Link className="nav-btn" href={viewHref(target)} aria-current={isActive(target) ? "page" : undefined}>
      {label}
    </Link>
  );

  return (
    <header className="hdr">
      <div className="hdr-in">
        <Link className="brand" href="/" aria-label="홈으로">
          <span className="brand-mark">
            <Sprout size={18} />
          </span>
          <span className="brand-tx">
            가뭄영향정보플랫폼
            <small>DROUGHT IMPACT PLATFORM</small>
          </span>
        </Link>
        <nav className="nav" aria-label="주요 메뉴">
          <div className="nav-grp">
            <div className="nav-eyebrow">정형 데이터</div>
            <div className="nav-row">
              {navLink("home", "종합 현황")}
              {navLink("forecast", "예측·지수")}
            </div>
          </div>
          <div className="nav-grp">
            <div className="nav-eyebrow">비정형 데이터</div>
            <div className="nav-row">
              {navLink("reports", "가뭄영향 리포트")}
              <Link className="nav-btn" href="/archive" aria-current={onArchive ? "page" : undefined}>가뭄 자료실</Link>
            </div>
          </div>
          <div className="nav-grp">
            <div className="nav-eyebrow">개발자</div>
            <div className="nav-row">
              {navLink("api", "API 센터")}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
