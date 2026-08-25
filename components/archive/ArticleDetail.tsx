"use client";
import { buildFileDownloadUrl } from "@/lib/api-client";
import type { ArticleDetail as Detail } from "@/lib/archive-types";

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
        {data.classification ? <span className="chip">{data.classification.name}</span> : null}
        {data.serviceType ? <span className="chip">{data.serviceType.name}</span> : null}
        <span>조회 {data.views}</span>
        <span>{data.updatedAt.slice(0, 10)}</span>
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
