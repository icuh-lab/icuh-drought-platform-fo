"use client";
import Link from "next/link";
import type { ArticleListItem } from "@/lib/archive-types";

type Props = {
  items: ArticleListItem[];
  /** 코드(DT005 등) → 한글명 조회. 목록 API는 documentType/subjectDomain을 코드로 내려준다. */
  categoryNames: Record<string, string>;
};

export function ArticleList({ items, categoryNames }: Props) {
  if (items.length === 0) {
    return <p className="notice">조건에 맞는 자료가 없습니다.</p>;
  }
  return (
    <ul className="report-list">
      {items.map((a) => (
        <li key={a.id} className="report-card">
          <Link href={`/archive/${a.id}`}>
            <h3>{a.title}</h3>
          </Link>
          <div className="article-meta">
            <span>{a.authorOrganization}</span>
            <span>수정일: {a.updatedAt.slice(0, 10)}</span>
            <span>조회 {a.views}</span>
          </div>
          <div className="tags">
            <span>문서성격: {categoryNames[a.documentType] ?? a.documentType}</span>
            <span>주제영역: {categoryNames[a.subjectDomain] ?? a.subjectDomain}</span>
            {a.source ? <span>출처: {a.source === "domestic" ? "국내" : a.source === "foreign" ? "해외" : a.source}</span> : null}
          </div>
          {a.autoSummaryNotice ? <p>{a.autoSummaryNotice}</p> : null}
        </li>
      ))}
    </ul>
  );
}
