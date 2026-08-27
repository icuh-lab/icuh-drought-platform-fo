"use client";
import Link from "next/link";
import type { ArticleListItem } from "@/lib/archive-types";

type Props = {
  items: ArticleListItem[];
  /** 코드(DT005 등) → 한글명 조회. 목록 API는 documentType/subjectDomain을 코드로 내려준다. */
  categoryNames: Record<string, string>;
};

const SOURCE_NAMES: Record<string, string> = { domestic: "국내", foreign: "해외" };

/** 기존 자료실 기준과 동일한 표기: 2026. 8. 21. */
function formatDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value.slice(0, 10) : parsed.toLocaleDateString("ko-KR");
}

function Tag({ variant, label, value }: { variant: "doc" | "domain" | "source"; label: string; value: string }) {
  return (
    <span className={`tag tag-${variant}`}>
      <em>{label}:</em>
      <b>{value}</b>
    </span>
  );
}

export function ArticleList({ items, categoryNames }: Props) {
  if (items.length === 0) {
    return <p className="notice">조건에 맞는 자료가 없습니다.</p>;
  }
  return (
    <ul className="report-list">
      {items.map((a) => {
        // 확장자는 중복을 걷어내고 대문자로 통일한다.
        const extensions = Array.from(new Set((a.extensions ?? []).map((e) => e.toUpperCase())));
        return (
          <li key={a.id} className="report-card">
            <Link href={`/archive/${a.id}`}>
              <h3>{a.title}</h3>
            </Link>
            <div className="article-meta">
              <span>{a.authorOrganization}</span>
              <span>수정일: {formatDate(a.updatedAt)}</span>
              <span>조회수: {a.views}</span>
            </div>
            <div className="tags">
              {extensions.map((extension) => (
                <span key={extension} className="tag tag-ext">{extension}</span>
              ))}
              <Tag variant="doc" label="문서성격" value={categoryNames[a.documentType] ?? a.documentType} />
              <Tag variant="domain" label="주제영역" value={categoryNames[a.subjectDomain] ?? a.subjectDomain} />
              {a.source ? (
                <Tag variant="source" label="출처" value={SOURCE_NAMES[a.source] ?? a.source} />
              ) : null}
            </div>
            {a.autoSummaryNotice ? <p>{a.autoSummaryNotice}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}
