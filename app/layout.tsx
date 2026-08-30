import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "가뭄영향정보플랫폼",
  description: "가뭄 영향 데이터, 리포트, API, 자료 공유를 통합 제공하는 프론트오피스"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        {/* SiteHeader 는 useSearchParams 를 쓰므로 Suspense 경계가 필요하다. */}
        <Suspense fallback={<header className="hdr" />}>
          <SiteHeader />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
