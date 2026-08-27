import { buildFallbackArticleDetail, capturedArchiveArticle, fallbackArticleCategories } from "../lib/archive-fallback";

let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  const ok = a === e;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}\n      got  ${a}\n      want ${e}`);
  if (!ok) failed++;
}

const id = capturedArchiveArticle.id;
const detail = buildFallbackArticleDetail(id);

check("목록에 있는 id 는 상세를 만든다", detail !== null, true);
check("목록에 없는 id 는 null", buildFallbackArticleDetail(99999), null);

// 목록과 상세가 어긋나면 시연 중 바로 드러난다.
check("제목이 목록과 일치", detail?.title, capturedArchiveArticle.title);
check("기관이 목록과 일치", detail?.authorOrganization, capturedArchiveArticle.authorOrganization);
check("조회수가 목록과 일치", detail?.views, capturedArchiveArticle.views);
check("키워드가 목록과 일치", detail?.keywords, capturedArchiveArticle.keywords);
check("수정일이 목록과 일치", detail?.updatedAt, capturedArchiveArticle.updatedAt);

// 코드는 분류 목록을 통해 한글명으로 풀려야 화면에 이름이 뜬다.
const expectedDoc = fallbackArticleCategories.documentTypesResponse
  .find((c) => c.code === capturedArchiveArticle.documentType);
check("문서성격 코드가 분류로 해석됨", detail?.classification?.name, expectedDoc?.name);
const expectedDomain = fallbackArticleCategories.subjectDomainsResponses
  .find((c) => c.code === capturedArchiveArticle.subjectDomain);
check("주제영역 코드가 분류로 해석됨", detail?.serviceType?.name, expectedDomain?.name);

check("첨부파일 UI 시연용 1건", detail?.files.length, 1);
check("본문이 비어있지 않다", (detail?.description.length ?? 0) > 0, true);
check("본문에 시연 데이터임을 밝힌다", detail?.description.includes("로컬 시연 데이터"), true);

process.exit(failed === 0 ? 0 : 1);
