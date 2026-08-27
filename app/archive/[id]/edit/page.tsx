"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchArticleDetail, updateArticle, ArchiveApiError } from "@/lib/api-client";
import { buildFallbackArticleDetail } from "@/lib/archive-fallback";
import type { ArticleDetail, ArticleFormValues } from "@/lib/archive-types";
import { ArticleForm } from "@/components/archive/ArticleForm";

export default function EditArticlePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  // 폼에 없는 5개 필드(sourceUrl/sourceArticleCount/regionMentions/keywords/autoSummaryNotice)를
  // 원본 그대로 되돌려 보내기 위해 조회한 상세 전체를 들고 있는다. ArticleFormValues에는 넣지 않는다.
  const [detail, setDetail] = useState<ArticleDetail | null>(null);
  const [initial, setInitial] = useState<Partial<ArticleFormValues> | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // 조회 성공과 fallback 이 같은 방식으로 폼을 채우도록 공통화한다.
  function applyDetail(d: ArticleDetail) {
    setDetail(d);
    setInitial({
      title: d.title,
      description: d.description,
      author: d.author,
      authorOrganization: d.authorOrganization,
      department: d.department,
      source: d.source ?? "",
      documentTypeCode: d.classification?.code ?? "",
      subjectDomainCode: d.serviceType?.code ?? "",
    });
  }

  useEffect(() => {
    const ac = new AbortController();
    fetchArticleDetail(id, { signal: ac.signal })
      .then(applyDetail)
      .catch((e) => {
        if (e?.name === "AbortError") return;
        if (e instanceof ArchiveApiError && e.status === 404) {
          setError("게시글을 찾을 수 없습니다.");
          return;
        }
        const fallback = buildFallbackArticleDetail(id);
        if (!fallback) {
          setError("게시글을 찾을 수 없습니다.");
          return;
        }
        applyDetail(fallback);
        setNotice("자료 API 연결 전입니다. 로컬 시연 데이터를 표시합니다. 수정 요청 제출은 백엔드 연결 후 가능합니다.");
      });
    return () => ac.abort();
  }, [id]);

  if (done) {
    return (
      <main className="wrap">
        <p className="notice">
          수정 요청이 접수되어 관리자 승인을 기다리고 있으며, 승인되기 전까지는 가뭄 자료실 목록에서 보이지 않습니다.
          이 상세 페이지 주소로는 계속 확인할 수 있습니다.
        </p>
        <Link href={`/archive/${id}`} className="nav-btn">상세로</Link>
      </main>
    );
  }

  return (
    <main className="wrap">
      <Link href={`/archive/${id}`} className="back">← 상세로</Link>
      <div className="sec-hd"><h1>자료 수정 요청</h1></div>
      {error ? <p className="alert">{error}</p> : null}
      {notice ? <p className="alert">{notice}</p> : null}
      {!initial && !error ? <p className="notice">불러오는 중…</p> : null}
      {initial && detail ? (
        <ArticleForm
          mode="edit"
          initialValues={initial}
          submitLabel="수정 요청"
          onSubmit={async (values, completedFiles) => {
            // 수정 API의 파일 필드명은 newFiles (등록의 completedFiles 와 다름).
            // sourceUrl/sourceArticleCount/regionMentions/keywords/autoSummaryNotice는 폼에 없는
            // 필드지만, 승인 시 backend(Article.approveUpdate)가 이 값들을 무조건 덮어쓰므로
            // 조회했던 원본 값을 그대로 실어 보내 유실을 막는다.
            await updateArticle(id, {
              ...values,
              sourceUrl: detail.sourceUrl,
              sourceArticleCount: detail.sourceArticleCount,
              regionMentions: detail.regionMentions,
              keywords: detail.keywords,
              autoSummaryNotice: detail.autoSummaryNotice,
              newFiles: completedFiles,
            });
            setDone(true);
          }}
        />
      ) : null}
    </main>
  );
}
