"use client";
import { buildFileDownloadUrl } from "@/lib/api-client";
import type { ArticleDetail as Detail } from "@/lib/archive-types";

const SOURCE_NAMES: Record<string, string> = { domestic: "국내", foreign: "해외" };

/** 목록과 같은 표기: 2026. 8. 21. */
function formatDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value.slice(0, 10) : parsed.toLocaleDateString("ko-KR");
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let v = bytes / 1024, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}

export function ArticleDetail({ data, actions }: { data: Detail; actions?: React.ReactNode }) {
  return (
    <article className="article">
      <h1>{data.title}</h1>
      <div className="article-meta">
        <span>{data.author}</span>
        <span>{data.authorOrganization}</span>
        <span>{data.department}</span>
        {data.classification ? (
          <span className="tag tag-doc"><em>문서성격:</em><b>{data.classification.name}</b></span>
        ) : null}
        {data.serviceType ? (
          <span className="tag tag-domain"><em>주제영역:</em><b>{data.serviceType.name}</b></span>
        ) : null}
        {data.source ? (
          <span className="tag tag-source"><em>출처:</em><b>{SOURCE_NAMES[data.source] ?? data.source}</b></span>
        ) : null}
        <span>조회수: {data.views}</span>
        <span>수정일: {formatDate(data.updatedAt)}</span>
      </div>

      <p style={{ whiteSpace: "pre-wrap" }}>{data.description}</p>

      <h2>첨부파일</h2>
      {data.files.length === 0 ? (
        <p className="notice">첨부파일이 없습니다.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {data.files.map((f) => (
            <li key={f.id} className="file-row">
              <span>{f.originalFilename}</span>
              <span>
                <span className="data-note">{formatSize(f.fileSize)}</span>{" "}
                <a className="nav-btn" href={buildFileDownloadUrl(f.id)} download aria-label={`${f.originalFilename} 다운로드`}>다운로드</a>
              </span>
            </li>
          ))}
        </ul>
      )}

      {actions}
    </article>
  );
}
