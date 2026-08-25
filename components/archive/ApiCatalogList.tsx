"use client";
import { apiCatalog } from "@/lib/mock-data";

export function ApiCatalogList({ query }: { query: string }) {
  const q = query.trim().toLowerCase();
  const items = q
    ? apiCatalog.filter((a) =>
        a.name.toLowerCase().includes(q) ||
        a.path.toLowerCase().includes(q) ||
        a.group.toLowerCase().includes(q))
    : apiCatalog;

  if (items.length === 0) return <p className="notice">조건에 맞는 API가 없습니다.</p>;

  return (
    <>
      <p className="data-note">총 {items.length}건</p>
      <ul className="report-list">
        {items.map((a) => (
          <li key={`${a.method}-${a.path}`} className="report-card">
            <h3>{a.name}</h3>
            <div className="article-meta">
              <span className="chip">{a.group}</span>
              <span className="path"><b>{a.method}</b> {a.path}</span>
            </div>
            <p>{a.description}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
