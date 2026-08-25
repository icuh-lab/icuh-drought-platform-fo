"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createArticleWithFiles } from "@/lib/api-client";
import { ArticleForm } from "@/components/archive/ArticleForm";

export default function NewArticlePage() {
  const router = useRouter();
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <main className="wrap">
        <p className="notice">
          자료가 등록되었습니다. <b>관리자 승인 후 목록에 공개됩니다.</b>
        </p>
        <Link href="/archive" className="nav-btn">목록으로</Link>
      </main>
    );
  }

  return (
    <main className="wrap">
      <Link href="/archive" className="back">← 목록으로</Link>
      <div className="sec-hd"><h1>자료 등록</h1></div>
      <ArticleForm
        mode="create"
        submitLabel="등록"
        onSubmit={async (values, completedFiles) => {
          await createArticleWithFiles({ ...values, completedFiles });
          setDone(true);
          router.refresh();
        }}
      />
    </main>
  );
}
