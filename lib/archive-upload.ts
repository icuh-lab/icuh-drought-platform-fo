import type { CompletedFileUpload } from "./archive-types";

const PUBLIC_API_BASE_URL = (process.env.NEXT_PUBLIC_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081").replace(/\/+$/, "");

/** S3 멀티파트 최소 파트 크기 */
export const PART_SIZE = 5 * 1024 * 1024;

export type Part = { partNumber: number; start: number; end: number };

/** 파일 크기를 파트 경계로 나눈다. 빈 파일도 파트 1개를 만든다. */
export function splitParts(fileSize: number, partSize: number = PART_SIZE): Part[] {
  if (fileSize <= 0) return [{ partNumber: 1, start: 0, end: 0 }];
  const parts: Part[] = [];
  let start = 0, partNumber = 1;
  while (start < fileSize) {
    const end = Math.min(start + partSize, fileSize);
    parts.push({ partNumber, start, end });
    start = end;
    partNumber++;
  }
  return parts;
}

/**
 * 멀티파트 업로드 API는 게시글 API와 달리 {result,data,error} 봉투를 쓰지 않는다.
 * 응답 본문이 곧 DTO다.
 */
async function postRaw<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(new URL(path, PUBLIC_API_BASE_URL), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${path} 실패 (${response.status})`);
  return (await response.json()) as T;
}

async function postText(path: string, body: unknown): Promise<string> {
  const response = await fetch(new URL(path, PUBLIC_API_BASE_URL), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${path} 실패 (${response.status})`);
  return (await response.text()).trim();
}

async function uploadOne(
  file: File,
  onProgress?: (fileName: string, percent: number) => void
): Promise<CompletedFileUpload> {
  // 1) 업로드 개시
  const initiated = await postRaw<{ uploadId: string; fileName: string }>(
    "/api/v1/multipart-upload/generate-upload-id",
    { fileName: file.name, fileType: file.type || "application/octet-stream", fileSize: file.size }
  );

  // 2~3) 파트별 presigned URL 발급 후 S3에 직접 PUT
  const parts = splitParts(file.size);
  let done = 0;
  const results = await Promise.all(
    parts.map(async (p) => {
      const url = await postText("/api/v1/multipart-upload/presigned-url", {
        uploadId: initiated.uploadId, fileName: initiated.fileName, partNumber: p.partNumber,
      });
      const res = await fetch(url, { method: "PUT", body: file.slice(p.start, p.end) });
      if (!res.ok) throw new Error(`파트 ${p.partNumber} 업로드 실패 (${res.status})`);
      const eTag = (res.headers.get("ETag") ?? "").replaceAll('"', "");
      if (!eTag) throw new Error(`파트 ${p.partNumber}의 ETag를 받지 못했습니다. S3 CORS의 ExposeHeaders에 ETag가 필요합니다.`);
      done++;
      onProgress?.(file.name, Math.round((done / parts.length) * 100));
      return { partNumber: p.partNumber, eTag };
    })
  );
  results.sort((a, b) => a.partNumber - b.partNumber);

  // 4) 조합 완료
  return postRaw<CompletedFileUpload>("/api/v1/multipart-upload/complete-upload", {
    uploadId: initiated.uploadId,
    fileName: initiated.fileName,
    parts: results,
    fileSize: file.size,
    originFileName: file.name,
  });
}

/** 파일들을 순차 업로드하고 게시글 저장에 넘길 메타데이터를 돌려준다. */
export async function uploadFiles(
  files: File[],
  onProgress?: (fileName: string, percent: number) => void
): Promise<CompletedFileUpload[]> {
  const completed: CompletedFileUpload[] = [];
  for (const file of files) {
    completed.push(await uploadOne(file, onProgress));
  }
  return completed;
}
