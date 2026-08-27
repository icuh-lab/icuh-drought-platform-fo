"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchArticles, fetchArticleCategories, clampUiPage } from "@/lib/api-client";
import type { ArticlePage, ArticleCategories } from "@/lib/archive-types";
import { buildFallbackArticlePage, fallbackArticleCategories, prependCapturedArchiveArticle } from "@/lib/archive-fallback";
import { SearchBar } from "@/components/archive/SearchBar";
import { SearchFilters } from "@/components/archive/SearchFilters";
import { ArticleList } from "@/components/archive/ArticleList";
import { Pagination } from "@/components/archive/Pagination";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function ArchiveInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const query = sp.get("query") ?? "";
  const documentType = sp.get("documentType") ?? "";
  const subjectDomain = sp.get("subjectDomain") ?? "";
  const source = sp.get("source") ?? "";
  const page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
  const pageSizeParam = Number(sp.get("size") ?? String(DEFAULT_PAGE_SIZE)) || DEFAULT_PAGE_SIZE;
  const pageSize = PAGE_SIZE_OPTIONS.includes(pageSizeParam) ? pageSizeParam : DEFAULT_PAGE_SIZE;

  const [data, setData] = useState<ArticlePage | null>(null);
  const [categories, setCategories] = useState<ArticleCategories | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 목록 API는 documentType/subjectDomain을 코드(DT005 등)로 내려주므로, 이미 불러온
  // categories로 코드→한글명 조회 테이블을 만들어 ArticleList에 전달한다(재조회하지 않음).
  const categoryNames = useMemo(() => {
    const map: Record<string, string> = {};
    fallbackArticleCategories.documentTypesResponse.forEach((c) => { map[c.code] = c.name; });
    fallbackArticleCategories.subjectDomainsResponses.forEach((c) => { map[c.code] = c.name; });
    (categories?.documentTypesResponse ?? []).forEach((c) => { map[c.code] = c.name; });
    (categories?.subjectDomainsResponses ?? []).forEach((c) => { map[c.code] = c.name; });
    return map;
  }, [categories]);

  function push(next: Record<string, string | number>) {
    const params = new URLSearchParams(sp.toString());
    Object.entries(next).forEach(([k, v]) => {
      const s = String(v);
      if (s === "" ) params.delete(k); else params.set(k, s);
    });
    router.push(`/archive?${params.toString()}`);
  }

  useEffect(() => {
    const ac = new AbortController();
    fetchArticleCategories({ signal: ac.signal }).then(setCategories).catch(() => {});
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetchArticles(
      { query, documentType, subjectDomain, source, page, size: pageSize },
      { signal: ac.signal }
    )
      .then((nextData) => {
        setData(prependCapturedArchiveArticle(nextData, { query, documentType, subjectDomain, source, page, size: pageSize }));
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setError("자료 API 연결 전입니다. 로컬 시연 데이터를 표시합니다.");
        setData(buildFallbackArticlePage({ query, documentType, subjectDomain, source, page, size: pageSize }));
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [query, documentType, subjectDomain, source, page, pageSize]);

  const activeCategories = categories ?? fallbackArticleCategories;

  // 서버는 범위를 벗어난 page 를 그대로 되돌려주므로(200 + 빈 목록) 화면이 직접 접어야 한다.
  const effectivePage = data ? clampUiPage(page, data.totalPages) : page;

  // 표기만 접으면 목록이 빈 채로 남는다. URL 도 되돌려 실제 내용을 다시 불러온다.
  const searchString = sp.toString();
  useEffect(() => {
    if (!data || effectivePage === page) return;
    const params = new URLSearchParams(searchString);
    params.set("page", String(effectivePage));
    router.replace(`/archive?${params.toString()}`);
  }, [data, effectivePage, page, searchString, router]);

  return (
    <main className="wrap">
      <div className="sec-hd">
        <h1>가뭄 자료실</h1>
        <Link href="/archive/new" className="nav-btn">자료 등록</Link>
      </div>

      <div className="archive-toolbar">
        <SearchBar key={query} initialValue={query} onSearch={(q) => push({ query: q, page: 1 })} />
        <label className="page-size">페이지당 표시
          <select value={pageSize} onChange={(e) => push({ size: e.target.value, page: 1 })}>
            {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          건
        </label>
      </div>

      <SearchFilters
        documentTypes={activeCategories.documentTypesResponse}
        subjectDomains={activeCategories.subjectDomainsResponses}
        value={{ documentType, subjectDomain, source }}
        onChange={(v) => push({ ...v, page: 1 })}
        onReset={() => router.push("/archive")}
      />
      {error ? <p className="alert">{error}</p> : null}
      {loading ? <p className="notice">불러오는 중…</p> : null}
      {data ? (
        <>
          <p className="data-note">총 {data.totalElements}건 · {effectivePage} / {data.totalPages} 페이지</p>
          <ArticleList items={data.content} categoryNames={categoryNames} />
          <Pagination page={effectivePage} totalPages={data.totalPages} onChange={(p) => push({ page: p })} />
        </>
      ) : null}
    </main>
  );
}

export default function ArchivePage() {
  return (
    <Suspense fallback={<main className="wrap"><p className="notice">불러오는 중…</p></main>}>
      <ArchiveInner />
    </Suspense>
  );
}
