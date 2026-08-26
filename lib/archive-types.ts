export type ArticleSearchParams = {
  query?: string;
  documentType?: string;
  subjectDomain?: string;
  source?: string;
  page?: number; // UI 기준 1-base
  size?: number;
};

export type ArticleListItem = {
  id: number;
  title: string;
  authorOrganization: string;
  updatedAt: string;
  views: number;
  documentType: string;
  subjectDomain: string;
  source: string | null;
  /** 첨부파일 확장자. 목록 API 가 내려주지 않으면 빈 배열이다. */
  extensions: string[];
  sourceUrl: string | null;
  sourceArticleCount: number;
  regionMentions: string[];
  keywords: string[];
  autoSummaryNotice: string | null;
};

export type ArticlePage = {
  content: ArticleListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type CategoryItem = { id: number; code: string; name: string; enName: string | null };

export type ArticleFile = {
  id: number;
  originalFilename: string;
  extension: string | null;
  fileSize: number;
  filePath: string;
};

export type ArticleDetail = {
  id: number;
  title: string;
  description: string;
  author: string;
  authorOrganization: string;
  department: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  classification: CategoryItem | null;
  serviceType: CategoryItem | null;
  source: string | null;
  sourceUrl: string | null;
  sourceArticleCount: number;
  regionMentions: string[];
  keywords: string[];
  autoSummaryNotice: string | null;
  files: ArticleFile[];
};

export type ArticleCategories = {
  documentTypesResponse: CategoryItem[];
  subjectDomainsResponses: CategoryItem[];
};

export type CompletedFileUpload = {
  originalFileName: string;
  storedFileName: string;
  filePath: string;
  fileSize: number;
  extension: string;
};

export type ArticleFormValues = {
  title: string;
  description: string;
  author: string;
  authorOrganization: string;
  department: string;
  tempPassword: string;
  documentTypeCode: string;
  subjectDomainCode: string;
  source: string;
};
