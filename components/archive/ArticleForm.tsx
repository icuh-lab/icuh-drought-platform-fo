"use client";

import { useEffect, useState } from "react";
import { fetchArticleCategories } from "@/lib/api-client";
import { uploadFiles } from "@/lib/archive-upload";
import type { ArticleCategories, ArticleFormValues, CompletedFileUpload } from "@/lib/archive-types";
import { fallbackArticleCategories } from "@/lib/archive-fallback";
import { FileUploader } from "./FileUploader";

const EMPTY: ArticleFormValues = {
  title: "", description: "", author: "", authorOrganization: "", department: "",
  tempPassword: "", documentTypeCode: "", subjectDomainCode: "", source: "",
};

type Props = {
  mode: "create" | "edit";
  initialValues?: Partial<ArticleFormValues>;
  submitLabel: string;
  onSubmit: (values: ArticleFormValues, completedFiles: CompletedFileUpload[]) => Promise<void>;
};

export function ArticleForm({ mode, initialValues, submitLabel, onSubmit }: Props) {
  const [values, setValues] = useState<ArticleFormValues>({ ...EMPTY, ...initialValues });
  const [categories, setCategories] = useState<ArticleCategories | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  // 이번 세션에서 이미 업로드를 마친 파일의 결과. File 객체 참조를 키로 써서, 제출 실패 후
  // 같은 파일 선택으로 재시도할 때 완료된 업로드를 재사용하고 나머지만 업로드한다.
  // (실패는 보통 비밀번호 오류처럼 업로드가 전부 끝난 *뒤*에 나므로, 재시도마다 프로덕션 S3에
  // 다시 업로드해 객체를 남기는 것을 막는다.)
  const [uploadedResults, setUploadedResults] = useState<Map<File, CompletedFileUpload>>(new Map());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setValues((v) => ({ ...v, ...initialValues })); }, [initialValues]);

  useEffect(() => {
    const ac = new AbortController();
    fetchArticleCategories({ signal: ac.signal })
      .then(setCategories)
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setCategories(fallbackArticleCategories);
        setError("분류 API 연결 전입니다. 로컬 분류 기준을 표시합니다.");
      });
    return () => ac.abort();
  }, []);

  function set<K extends keyof ArticleFormValues>(key: K, value: ArticleFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleFilesChange(next: File[]) {
    setFiles(next);
    // 파일 선택이 바뀌면 이전 업로드 결과는 더 이상 유효하지 않으므로 비운다.
    setUploadedResults(new Map());
    setProgress({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "create" && files.length === 0) {
      setError("최소 1개 이상의 첨부파일을 선택해주세요.");
      return;
    }
    setBusy(true);
    try {
      const pending = files.filter((f) => !uploadedResults.has(f));
      let results = uploadedResults;
      if (pending.length > 0) {
        const newlyUploaded = await uploadFiles(pending, (name, pct) => setProgress((p) => ({ ...p, [name]: pct })));
        results = new Map(uploadedResults);
        pending.forEach((f, i) => results.set(f, newlyUploaded[i]));
        setUploadedResults(results);
      }
      const completed = files.map((f) => results.get(f)!);
      await onSubmit(values, completed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청을 처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="archive-form" onSubmit={handleSubmit}>
      <label>제목<input required value={values.title} onChange={(e) => set("title", e.target.value)} /></label>
      <label>설명<textarea required value={values.description} onChange={(e) => set("description", e.target.value)} /></label>
      <label>작성자<input required value={values.author} onChange={(e) => set("author", e.target.value)} /></label>
      <label>소속기관<input required value={values.authorOrganization} onChange={(e) => set("authorOrganization", e.target.value)} /></label>
      <label>부서<input required value={values.department} onChange={(e) => set("department", e.target.value)} /></label>
      <label>출처
        <select required value={values.source} onChange={(e) => set("source", e.target.value)}>
          <option value="">선택하세요</option>
          <option value="domestic">국내</option>
          <option value="foreign">해외</option>
        </select>
      </label>

      <label>문서성격
        <select required value={values.documentTypeCode} onChange={(e) => set("documentTypeCode", e.target.value)}>
          <option value="">선택하세요</option>
          {(categories?.documentTypesResponse ?? []).map((d) => (
            <option key={d.code} value={d.code}>{d.name}</option>
          ))}
        </select>
      </label>
      <label>주제영역
        <select required value={values.subjectDomainCode} onChange={(e) => set("subjectDomainCode", e.target.value)}>
          <option value="">선택하세요</option>
          {(categories?.subjectDomainsResponses ?? []).map((s) => (
            <option key={s.code} value={s.code}>{s.name}</option>
          ))}
        </select>
      </label>

      <label>
        {mode === "create" ? "비밀번호 (수정·삭제 시 필요)" : "등록 시 사용한 비밀번호"}
        <input type="password" required value={values.tempPassword}
               onChange={(e) => set("tempPassword", e.target.value)} />
      </label>

      <FileUploader files={files} progress={progress} disabled={busy} onChange={handleFilesChange} />

      {error ? <p className="alert">{error}</p> : null}
      <div className="archive-actions">
        <button type="submit" className="nav-btn" disabled={busy}>
          {busy ? "처리 중…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
