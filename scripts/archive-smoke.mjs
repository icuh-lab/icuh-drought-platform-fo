const BASE = process.env.NEXT_PUBLIC_PUBLIC_API_BASE_URL ?? "http://localhost:8081";
const list = await (await fetch(`${BASE}/api/v1/articles?page=0&size=5`)).json();
console.log("목록 totalElements:", list.data.totalElements, "(기대 81)");
// 주의: 이 엔드포인트는 다른 article API와 달리 { result, data, error } 로 감싸지 않고
// CategoryResponse DTO를 그대로 반환한다(실제 호출로 확인됨). 그래서 cat.data가 아니라 cat을 바로 읽는다.
const cat = await (await fetch(`${BASE}/api/v1/article-categories`)).json();
console.log("문서유형:", cat.documentTypesResponse.length, "주제영역:", cat.subjectDomainsResponses.length, "(기대 9 / 10)");
const detail = await (await fetch(`${BASE}/api/v1/articles/124`)).json();
console.log("상세 첨부:", detail.data.files.length, "건");
