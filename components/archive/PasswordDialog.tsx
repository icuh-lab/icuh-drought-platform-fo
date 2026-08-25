"use client";
import { useState } from "react";

type Props = {
  title: string;
  description: string;
  withReason: boolean;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (input: { password: string; reason: string }) => Promise<void>;
};

export function PasswordDialog({ title, description, withReason, submitLabel, onCancel, onSubmit }: Props) {
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) { setError("비밀번호를 입력해주세요."); return; }
    setBusy(true); setError(null);
    try {
      await onSubmit({ password, reason });
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청을 처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true">
      <form className="dialog" onSubmit={handle}>
        <h3>{title}</h3>
        <p className="data-note">{description}</p>
        <label>비밀번호
          <input type="password" value={password} placeholder="등록 시 사용한 비밀번호"
                 onChange={(e) => setPassword(e.target.value)} />
        </label>
        {withReason ? (
          <label>사유<input value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        ) : null}
        {error ? <p className="alert">{error}</p> : null}
        <div className="archive-actions">
          <button type="submit" className="nav-btn" disabled={busy}>{busy ? "처리 중…" : submitLabel}</button>
          <button type="button" onClick={onCancel} disabled={busy}>취소</button>
        </div>
      </form>
    </div>
  );
}
