# 화면 기준 API 명세

이 문서는 `icuh-drought-platform-fo` 현재 화면을 기준으로 필요한 API를 정리한다.

## API 그룹

| API | Base URL 환경변수 | 기본값 | 용도 |
| --- | --- | --- | --- |
| open-api | `NEXT_PUBLIC_OPEN_API_BASE_URL` | `http://localhost:8083` | 정형 데이터, 예측·지수, OpenAPI성 데이터 |
| public-api | `NEXT_PUBLIC_PUBLIC_API_BASE_URL` 또는 `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8081` | 가뭄 자료실 공개 게시글/파일 |

공통 응답 래퍼는 API 서버별로 다를 수 있다.

- open-api 일부: `{ result, data, error }`
- public-api: `{ status, message, data, error }` 또는 `data` 직접 반환

## 화면: 종합 현황

### 종합 알림/KPI

| 항목 | 내용 |
| --- | --- |
| API | open-api |
| Endpoint | `GET /v1/summary` |
| Request | 없음 |
| Response | `generatedAt`, `alerts[]`, `kpis[]` |

Response 요약:

```ts
type SummaryResponse = {
  generatedAt: string;
  alerts: {
    id: string;
    category: string;
    dataset: string;
    regionCode: string;
    regionName: string;
    title: string;
    description: string;
    severity: "info" | "warning" | "danger";
    score: number;
    value: number;
    unit: string;
    observedAt: string | null;
    relatedReportCount: number;
  }[];
  kpis: {
    dataset: string;
    regionCode: string;
    regionName: string;
    name: string;
    value: number;
    unit: string;
    changeRate: number | null;
    severity: "info" | "warning" | "danger";
    observedAt: string | null;
  }[];
};
```

## 화면: 예측·지수

### 농산물 가격 예측

| 항목 | 내용 |
| --- | --- |
| API | open-api |
| Endpoint | `GET /api/v1/agrimarket/daily-price` |
| Request | `year`, `month`, `location` |
| Response | 지역·품목별 일자별 예측 가격 목록 |

Request 예시:

```http
GET /api/v1/agrimarket/daily-price?year=2026&month=8&location=강릉
```

Response 요약:

```ts
type OpenAgriDailyPriceResponse = {
  location: string;
  item: string;
  variety: string;
  calendarData: {
    predictionDate: string;
    predictedPrice: number | null;
    rateOfChangeFromPrevYear: number | null;
  }[];
};
```

### 농산물 월간 시장 가격/반입량 예측

| 항목 | 내용 |
| --- | --- |
| API | open-api |
| Endpoint | `GET /api/v1/agrimarket/market-price` |
| Request | `year`, `month`, `location` |
| Response | 월간 가격 예측, 반입량 예측, 전년 대비 변화 정보 |

### 수력발전량 예측/실적

| 항목 | 내용 |
| --- | --- |
| API | open-api |
| Endpoint | `GET /api/v1/hydropower/monthly-generation` |
| Request | `year`, `month`, `damName` |
| Response | 댐별 월별 계획 발전량 및 실제 발전량 목록 |

Request 예시:

```http
GET /api/v1/hydropower/monthly-generation?year=2026&month=5&damName=합천
```

Response 요약:

```ts
type OpenHydropowerGenerationResponse = {
  damName: string;
  damCode: string;
  monthlyGenerationDto: {
    year: string;
    month: string;
    plannedMwh: number | null;
    actualMwh: number | null;
  }[];
};
```

### 수력발전량 월간 예측

| 항목 | 내용 |
| --- | --- |
| API | open-api |
| Endpoint | `GET /api/v1/hydropower/monthly-predict` |
| Request | `year`, `month`, `damName` |
| Response | 월간 예상 발전량, 예상 저수량 범위 |

### 산불위험지수

| 항목 | 내용 |
| --- | --- |
| API | open-api |
| Endpoint | `GET /api/v1/wild-fire-risk/forecast` |
| Request | 없음 |
| Response | 예보 시각별 시군구 산불위험지수 목록 |

Response 요약:

```ts
type OpenWildFireForecastResponse = {
  targetDate: string;
  targetTime: string;
  regionData: {
    regionCode: string;
    riskLevel: "very_high" | "high" | "moderate" | "low" | string;
    indexValue: number | null;
  }[];
}[];
```

### 신선식품물가지수

| 항목 | 내용 |
| --- | --- |
| API | open-api |
| Endpoint | `GET /api/v1/freshfood/fresh-vegetable` |
| Request | `year`, `month` |
| Response | 시도별 신선채소 물가지수 및 등급 요약 |

Request 예시:

```http
GET /api/v1/freshfood/fresh-vegetable?year=2026&month=8
```

Response 요약:

```ts
type OpenFreshVegetableIndexResponse = {
  baseDate: string;
  provinceData: {
    code: number;
    province: string;
    freshVegetableIndex: number | null;
    grade: string;
  }[];
  summary: Record<string, number>;
};
```

### 신선과실물가지수

| 항목 | 내용 |
| --- | --- |
| API | open-api |
| Endpoint | `GET /api/v1/freshfood/fresh-fruit` |
| Request | `year`, `month` |
| Response | 시도별 신선과실 물가지수 및 등급 요약 |

## 화면: 가뭄영향 리포트

현재 화면은 `public-api` 게시글 데이터를 리포트 카드/상세 모델로 변환해 사용한다.

### 리포트 목록

| 항목 | 내용 |
| --- | --- |
| API | public-api |
| Endpoint | `GET /api/v1/articles` |
| Request | `page`, `size`, `sort` |
| Response | 게시글 페이지 목록 |

Request 예시:

```http
GET /api/v1/articles?page=0&size=20&sort=updatedAt,desc
```

### 리포트 상세

| 항목 | 내용 |
| --- | --- |
| API | public-api |
| Endpoint | `GET /api/v1/articles/{id}` |
| Request | `id` |
| Response | 게시글 상세, 첨부파일, 분류, 출처/키워드/지역 언급 |

## 화면: 가뭄 자료실

### 문서 목록

| 항목 | 내용 |
| --- | --- |
| API | public-api |
| Endpoint | `GET /api/v1/articles` |
| Request | `page`, `size`, `query`, `documentType`, `subjectDomain`, `source`, `sort` |
| Response | 게시글 페이지 목록 |

Request 예시:

```http
GET /api/v1/articles?page=0&size=10&query=가뭄&documentType=DROUGHT_REPORT&subjectDomain=AGRICULTURE&source=domestic&sort=updatedAt,desc
```

Response 요약:

```ts
type ArticlePage = {
  content: {
    id: number;
    title: string;
    authorOrganization: string;
    updatedAt: string;
    views: number;
    documentType: string;
    subjectDomain: string;
    source: string | null;
  }[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};
```

### 문서 분류 목록

| 항목 | 내용 |
| --- | --- |
| API | public-api |
| Endpoint | `GET /api/v1/article-categories` |
| Request | 없음 |
| Response | 문서성격 목록, 주제영역 목록 |

Response 요약:

```ts
type ArticleCategories = {
  documentTypesResponse: {
    id: number;
    code: string;
    name: string;
    enName: string | null;
  }[];
  subjectDomainsResponses: {
    id: number;
    code: string;
    name: string;
    enName: string | null;
  }[];
};
```

### 문서 상세

| 항목 | 내용 |
| --- | --- |
| API | public-api |
| Endpoint | `GET /api/v1/articles/{id}` |
| Request | `id` |
| Response | 게시글 상세, 첨부파일 목록 |

### 문서 등록

| 항목 | 내용 |
| --- | --- |
| API | public-api |
| Endpoint | `POST /api/v1/articles-with-files` |
| Request | 제목, 설명, 작성자, 기관, 부서, 임시 비밀번호, 문서성격, 주제영역, 출처, 업로드 완료 파일 목록 |
| Response | 생성된 게시글 ID |

Request 요약:

```ts
type CreateArticleWithFilesRequest = {
  title: string;
  description: string;
  author: string;
  authorOrganization: string;
  department: string;
  tempPassword: string;
  documentTypeCode: string;
  subjectDomainCode: string;
  source: string;
  completedFiles: CompletedFileUpload[];
};
```

### 문서 수정 요청

| 항목 | 내용 |
| --- | --- |
| API | public-api |
| Endpoint | `PATCH /api/v1/articles/{id}` |
| Request | `id`, 등록 시 사용한 비밀번호, 수정 필드, 신규 첨부파일 |
| Response | 없음 또는 수정 요청 결과 |

### 문서 삭제 요청

| 항목 | 내용 |
| --- | --- |
| API | public-api |
| Endpoint | `DELETE /api/v1/articles/{id}` |
| Request | `id`, `password`, `reason` |
| Response | 없음 또는 삭제 요청 결과 |

## 화면: 파일 업로드

자료 등록/수정 화면에서 S3 multipart 업로드를 사용한다.

### 업로드 시작

| 항목 | 내용 |
| --- | --- |
| API | public-api |
| Endpoint | `POST /api/v1/multipart-upload/generate-upload-id` |
| Request | `fileName`, `fileType`, `fileSize` |
| Response | `uploadId`, `fileName` |

### 파트 업로드 URL 발급

| 항목 | 내용 |
| --- | --- |
| API | public-api |
| Endpoint | `POST /api/v1/multipart-upload/presigned-url` |
| Request | `uploadId`, `fileName`, `partNumber` |
| Response | presigned URL 문자열 |

### 업로드 완료

| 항목 | 내용 |
| --- | --- |
| API | public-api |
| Endpoint | `POST /api/v1/multipart-upload/complete-upload` |
| Request | `uploadId`, `fileName`, `fileSize`, `originFileName`, `parts[]` |
| Response | 게시글 등록에 넘길 완료 파일 메타데이터 |

### 파일 다운로드

| 항목 | 내용 |
| --- | --- |
| API | public-api |
| Endpoint | `GET /api/v1/multipart-upload/files/{fileId}/download` |
| Request | `fileId` |
| Response | 파일 다운로드 스트림 |

## 화면: API 센터

현재 화면은 프론트의 OpenAPI 카탈로그를 표시한다. 각 항목은 위 open-api/public-api 엔드포인트를 문서화한 카탈로그 데이터다.

## 화면: 관리자 (제거됨)

관리 기능은 **별도 어드민 서비스**에서 제공하므로 이 프론트오피스에서 제거했다(2026-08-25).

- 제거 대상: `개발자 > 관리` 메뉴, 게시글 승인/반려 화면, `admin-api` 연동 코드,
  `NEXT_PUBLIC_ADMIN_API_BASE_URL` 환경변수
- 당시 사용하던 엔드포인트는 아래와 같았다. 어드민 서비스 쪽 명세는 그 저장소를 참고한다.

```http
GET   /api/v1/admin/articles/{status}
PATCH /api/v1/admin/articles/{id}
PATCH /api/v2/articles/{id}/reject
```

상세 계약이 필요하면 git 이력의 `refactor: 개발자 탭의 관리 화면 제거` 커밋 이전 버전을 본다.

## 확인 필요

- `open-api /v1/summary`가 실제 open-api 서버에 존재하는지 확인이 필요하다. 현재 프론트는 종합 현황 fallback을 가지고 있다.
