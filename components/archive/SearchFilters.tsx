"use client";
import type { CategoryItem } from "@/lib/archive-types";

type Props = {
  documentTypes: CategoryItem[];
  subjectDomains: CategoryItem[];
  value: { documentType: string; subjectDomain: string; source: string };
  onChange: (next: Props["value"]) => void;
  onReset: () => void;
};

export function SearchFilters({ documentTypes, subjectDomains, value, onChange, onReset }: Props) {
  return (
    <div className="filter-group">
      <label>문서성격
        <select value={value.documentType} onChange={(e) => onChange({ ...value, documentType: e.target.value })}>
          <option value="">전체</option>
          {documentTypes.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
        </select>
      </label>
      <label>주제영역
        <select value={value.subjectDomain} onChange={(e) => onChange({ ...value, subjectDomain: e.target.value })}>
          <option value="">전체</option>
          {subjectDomains.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
      </label>
      <label>출처
        <select value={value.source} onChange={(e) => onChange({ ...value, source: e.target.value })}>
          <option value="">전체</option>
          <option value="domestic">국내</option>
          <option value="foreign">해외</option>
        </select>
      </label>
      <button type="button" className="nav-btn" onClick={onReset}>초기화</button>
    </div>
  );
}
