import type { ArticleCategories, ArticleListItem, ArticlePage } from "@/lib/archive-types";

export const fallbackArticleCategories: ArticleCategories = {
  documentTypesResponse: [
    { id: 1, code: "DROUGHT_REPORT", name: "가뭄영향 리포트", enName: "drought_report" },
    { id: 2, code: "API_SPEC", name: "API 명세서", enName: "api_spec" },
    { id: 3, code: "STATISTICAL_DATA", name: "통계/분석 자료", enName: "statistical_data" },
    { id: 4, code: "PLAN_DOC", name: "기획/계획 문서", enName: "plan_doc" },
    { id: 5, code: "POLICY_STANDARD", name: "정책/기준 문서", enName: "policy_standard" }
  ],
  subjectDomainsResponses: [
    { id: 1, code: "AGRICULTURE", name: "농업", enName: "agriculture" },
    { id: 2, code: "ENERGY", name: "에너지", enName: "energy" },
    { id: 3, code: "DROUGHT_MONITORING", name: "가뭄 모니터링", enName: "drought_monitoring" },
    { id: 4, code: "CLIMATE_CHANGE", name: "기후변화", enName: "climate_change" },
    { id: 5, code: "WILDFIRE", name: "산불", enName: "wildfire" },
    { id: 6, code: "SOCIO_ECONOMIC_IMPACT", name: "사회/경제적 영향", enName: "socio_economic_impact" }
  ]
};

export const capturedArchiveArticle: ArticleListItem = {
  id: 9001,
  title: "충청남도 기후변화 시나리오에 따른 가뭄분석",
  authorOrganization: "충남연구원",
  updatedAt: "2026-08-21T00:00:00Z",
  views: 9,
  documentType: "POLICY_STANDARD",
  subjectDomain: "SOCIO_ECONOMIC_IMPACT",
  source: "domestic",
  sourceUrl: null,
  sourceArticleCount: 0,
  regionMentions: ["충청남도"],
  keywords: ["충청남도", "기후변화", "가뭄분석"],
  autoSummaryNotice: null
};

const fallbackArticles: ArticleListItem[] = [
  capturedArchiveArticle,
  {
    id: 101,
    title: "가뭄반응정보 생산 기술 개발 API 명세서",
    authorOrganization: "(재)인프라재난관리진흥원",
    updatedAt: "2026-08-20T08:30:00Z",
    views: 25,
    documentType: "API_SPEC",
    subjectDomain: "DROUGHT_MONITORING",
    source: "domestic",
    sourceUrl: null,
    sourceArticleCount: 0,
    regionMentions: ["강릉", "합천", "고흥"],
    keywords: ["농산물", "수력발전량", "산불예보", "신선물가"],
    autoSummaryNotice: "가뭄반응정보 생산 기술 API 명세서 샘플 자료"
  },
  {
    id: 102,
    title: "2025년 강릉 가뭄 물 공급 영향 점검",
    authorOrganization: "운영 DB 연결 전 로컬 시연",
    updatedAt: "2026-08-19T11:00:00Z",
    views: 14,
    documentType: "DROUGHT_REPORT",
    subjectDomain: "DROUGHT_MONITORING",
    source: "domestic",
    sourceUrl: "https://example.com/drought-report",
    sourceArticleCount: 4,
    regionMentions: ["강릉"],
    keywords: ["물 공급", "생활용수", "제한급수"],
    autoSummaryNotice: "원문 기사와 지역 mention 기반 가뭄 영향 리포트 샘플"
  },
  {
    id: 103,
    title: "합천댐 수력발전량 월간 비교 데이터",
    authorOrganization: "한국수자원공사",
    updatedAt: "2026-08-18T15:10:00Z",
    views: 9,
    documentType: "STATISTICAL_DATA",
    subjectDomain: "ENERGY",
    source: "domestic",
    sourceUrl: null,
    sourceArticleCount: 0,
    regionMentions: ["합천"],
    keywords: ["발전량", "저수량", "월간비교"],
    autoSummaryNotice: null
  }
];

export function buildFallbackArticlePage(params: {
  query: string;
  documentType: string;
  subjectDomain: string;
  source: string;
  page: number;
  size: number;
}): ArticlePage {
  const q = params.query.trim().toLowerCase();
  const filtered = fallbackArticles.filter((item) => {
    const matchesQuery = !q ||
      item.title.toLowerCase().includes(q) ||
      item.authorOrganization.toLowerCase().includes(q) ||
      item.keywords.some((keyword) => keyword.toLowerCase().includes(q));
    const matchesDocumentType = !params.documentType || item.documentType === params.documentType;
    const matchesSubjectDomain = !params.subjectDomain || item.subjectDomain === params.subjectDomain;
    const matchesSource = !params.source || item.source === params.source ||
      (params.source === "domestic" && item.source === "국내") ||
      (params.source === "foreign" && item.source === "해외");
    return matchesQuery && matchesDocumentType && matchesSubjectDomain && matchesSource;
  });

  const size = Math.max(1, params.size);
  const totalPages = Math.max(1, Math.ceil(filtered.length / size));
  const page = Math.min(Math.max(1, params.page), totalPages);
  const start = (page - 1) * size;

  return {
    content: filtered.slice(start, start + size),
    page,
    size,
    totalElements: filtered.length,
    totalPages,
    first: page === 1,
    last: page === totalPages
  };
}

export function prependCapturedArchiveArticle(
  pageData: ArticlePage,
  params: {
    query: string;
    documentType: string;
    subjectDomain: string;
    source: string;
    page: number;
    size: number;
  }
): ArticlePage {
  if (!matchesArticle(capturedArchiveArticle, params) || pageData.content.some((item) => item.id === capturedArchiveArticle.id)) {
    return pageData;
  }

  const size = Math.max(1, params.size);
  const totalElements = pageData.totalElements + 1;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));

  if (params.page !== 1) {
    return {
      ...pageData,
      totalElements,
      totalPages,
      last: params.page >= totalPages
    };
  }

  return {
    ...pageData,
    content: [capturedArchiveArticle, ...pageData.content].slice(0, size),
    totalElements,
    totalPages,
    first: true,
    last: totalPages === 1
  };
}

function matchesArticle(
  item: ArticleListItem,
  params: {
    query: string;
    documentType: string;
    subjectDomain: string;
    source: string;
  }
) {
  const q = params.query.trim().toLowerCase();
  const matchesQuery = !q ||
    item.title.toLowerCase().includes(q) ||
    item.authorOrganization.toLowerCase().includes(q) ||
    item.keywords.some((keyword) => keyword.toLowerCase().includes(q));
  const matchesDocumentType = !params.documentType || item.documentType === params.documentType;
  const matchesSubjectDomain = !params.subjectDomain || item.subjectDomain === params.subjectDomain;
  const matchesSource = !params.source || item.source === params.source ||
    (params.source === "domestic" && item.source === "국내") ||
    (params.source === "foreign" && item.source === "해외");
  return matchesQuery && matchesDocumentType && matchesSubjectDomain && matchesSource;
}
