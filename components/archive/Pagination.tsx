"use client";

type Props = { page: number; totalPages: number; onChange: (page: number) => void };

export function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;
  const windowSize = 5;
  const start = Math.max(1, Math.min(page - Math.floor(windowSize / 2), totalPages - windowSize + 1));
  const pages = Array.from({ length: Math.min(windowSize, totalPages) }, (_, i) => start + i);

  return (
    <nav className="tabs" aria-label="페이지">
      <button onClick={() => onChange(page - 1)} disabled={page <= 1}>이전</button>
      {pages.map((p) => (
        <button key={p} aria-current={p === page ? "page" : undefined} onClick={() => onChange(p)}>{p}</button>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page >= totalPages}>다음</button>
    </nav>
  );
}
