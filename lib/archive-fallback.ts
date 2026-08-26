import type { ArticleCategories, ArticleDetail, ArticleListItem, ArticlePage } from "@/lib/archive-types";

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
  extensions: ["pdf"],
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
    extensions: ["pdf"],
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
    extensions: ["pdf"],
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
    extensions: ["pdf"],
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

/**
 * 백엔드 미실행 시 상세 화면에 쓸 시연용 상세 데이터.
 *
 * 목록 fallback(fallbackArticles)을 그대로 재료로 써서 목록과 상세의 내용이 어긋나지 않게 한다.
 * 목록에 없는 id 는 null 을 돌려주고, 호출부는 이를 '찾을 수 없음'으로 처리한다.
 * 백엔드가 살아있는데 404 를 준 경우는 호출부에서 먼저 걸러지므로 여기까지 오지 않는다.
 */
export function buildFallbackArticleDetail(id: number): ArticleDetail | null {
  const article = fallbackArticles.find((item) => item.id === id);
  if (!article) return null;

  return {
    id: article.id,
    title: article.title,
    description: fallbackDescription(article),
    author: "시연 담당자",
    authorOrganization: article.authorOrganization,
    department: "가뭄영향정보플랫폼 운영팀",
    // 목록은 수정일만 들고 있다. 생성일은 표시 목적이므로 수정일과 같은 값을 쓴다.
    createdAt: article.updatedAt,
    updatedAt: article.updatedAt,
    views: article.views,
    classification: findCategory(fallbackArticleCategories.documentTypesResponse, article.documentType),
    serviceType: findCategory(fallbackArticleCategories.subjectDomainsResponses, article.subjectDomain),
    source: article.source,
    sourceUrl: article.sourceUrl,
    sourceArticleCount: article.sourceArticleCount,
    regionMentions: article.regionMentions,
    keywords: article.keywords,
    autoSummaryNotice: article.autoSummaryNotice,
    files: [
      {
        id: article.id * 10,
        originalFilename: `${article.title}.pdf`,
        extension: "pdf",
        fileSize: 1024 * 1024 * 2,
        filePath: `demo/${article.id}.pdf`
      }
    ]
  };
}

function findCategory(items: ArticleCategories["documentTypesResponse"], code: string) {
  return items.find((item) => item.code === code) ?? null;
}

/** 목록이 들고 있는 정보만으로 본문을 구성한다. 없는 사실을 지어내지 않는다. */
function fallbackDescription(article: ArticleListItem): string {
  const lines = [
    article.autoSummaryNotice ?? `${article.title} 관련 자료입니다.`,
    "",
    `등록기관: ${article.authorOrganization}`
  ];
  if (article.regionMentions.length > 0) {
    lines.push(`언급 지역: ${article.regionMentions.join(", ")}`);
  }
  if (article.keywords.length > 0) {
    lines.push(`키워드: ${article.keywords.map((keyword) => `#${keyword}`).join(" ")}`);
  }
  lines.push("", "백엔드 연결 전 표시되는 로컬 시연 데이터입니다.");
  return lines.join("\n");
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
