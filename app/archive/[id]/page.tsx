"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchArticleDetail, deleteArticle, ArchiveApiError } from "@/lib/api-client";
import type { ArticleDetail as Detail } from "@/lib/archive-types";
import { ArticleDetail } from "@/components/archive/ArticleDetail";
import { PasswordDialog } from "@/components/archive/PasswordDialog";

export default function ArticleDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"none" | "delete">("none");
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    fetchArticleDetail(id, { signal: ac.signal })
      .then(setData)
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setError(e instanceof ArchiveApiError && e.status === 404
          ? "게시글을 찾을 수 없습니다."
          : "게시글을 불러오지 못했습니다.");
      });
    return () => ac.abort();
  }, [id]);

  return (
    <main className="wrap">
      <Link href="/archive" className="back">← 목록으로</Link>
      {error ? <p className="alert">{error}</p> : null}
      {!data && !error ? <p className="notice">불러오는 중…</p> : null}
      {deleted ? (
        <p className="notice">삭제 요청이 접수되었습니다. <b>관리자 승인 후 반영됩니다.</b></p>
      ) : null}
      {data ? (
        <ArticleDetail
          data={data}
          actions={
            <div className="archive-actions">
              <Link className="nav-btn" href={`/archive/${id}/edit`}>수정 요청</Link>
              <button type="button" onClick={() => setDialog("delete")}>삭제 요청</button>
            </div>
          }
        />
      ) : null}
      {dialog === "delete" ? (
        <PasswordDialog
          title="자료 삭제 요청"
          description="삭제는 즉시 반영되지 않으며 관리자 승인 후 처리됩니다."
          withReason
          submitLabel="삭제 요청"
          onCancel={() => setDialog("none")}
          onSubmit={async ({ password, reason }) => {
            await deleteArticle(id, { password, reason });
            setDialog("none");
            setDeleted(true);
          }}
        />
      ) : null}
    </main>
  );
}
