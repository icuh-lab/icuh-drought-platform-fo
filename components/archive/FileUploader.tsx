"use client";

import { useRef, useState } from "react";

type Props = {
  files: File[];
  progress: Record<string, number>;
  disabled: boolean;
  onChange: (files: File[]) => void;
};

export function FileUploader({ files, progress, disabled, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function addFiles(next: File[]) {
    const pdfs = next.filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
    onChange([...files, ...pdfs]);
  }

  return (
    <div>
      <label>첨부파일</label>
      <div
        className={`dropzone${dragging ? " active" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(Array.from(e.dataTransfer.files ?? []));
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf,.pdf"
          disabled={disabled}
          onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
        />
        <button type="button" className="nav-btn" disabled={disabled} onClick={() => inputRef.current?.click()}>
          PDF 파일 선택
        </button>
        <span>파일을 끌어오거나 선택하세요. PDF만 등록됩니다.</span>
      </div>
      {files.map((f) => (
        <div key={f.name} className="file-row">
          <span>{f.name}</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(files.filter((file) => file !== f))}
          >
            제거
          </button>
          <span style={{ minWidth: 120 }}>
            <span className="progress-track">
              <span className="progress-bar" style={{ width: `${progress[f.name] ?? 0}%` }} />
            </span>
            <span className="data-note">{progress[f.name] ?? 0}%</span>
          </span>
        </div>
      ))}
    </div>
  );
}
