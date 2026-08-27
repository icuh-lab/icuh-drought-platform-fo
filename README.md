# icuh-drought-platform-fo

Next.js 기반 ICUH 가뭄영향정보플랫폼 프론트오피스입니다.

## 기준

- 메인 플랫폼 화면: `/Users/jeongseok/Desktop/workspace_intelliJ/drought-impact-platform/apps/web`
- 가뭄 자료실/파일 관리 화면: `/Users/jeongseok/Desktop/workspace_front/icuh-platform-fo`

## 주요 화면

- `/`: 종합 현황, 예측·지수, 가뭄영향 리포트, API 센터
- `/archive`: 가뭄 파일 데이터 및 OpenAPI 자료 검색
- `/archive/new`: 자료 등록 및 첨부파일 업로드
- `/archive/[id]`: 자료 상세, 다운로드, 수정/삭제 요청
- `/archive/[id]/edit`: 자료 수정 요청

## 실행

```bash
npm install
npm run dev
```

기본 URL:

```text
http://localhost:3000
```

## 검증

```bash
npm run lint
npm run build
```

## 배포

`infradna.io.kr` 로 운영 배포합니다. 구성과 절차는 [docs/deployment.md](docs/deployment.md) 를 참고하세요.

`main` 에 머지되면 GitHub Actions 가 Docker Hub 로 이미지를 올리고 EC2 컨테이너를 교체합니다.
평소 작업은 `develop` 에 모으고, 배포 시점에 `develop` → `main` 을 머지합니다.

## 관리(어드민) 기능

게시글 승인·반려 등 관리 기능은 **별도 어드민 서비스**에서 제공합니다.
이 프론트오피스에는 관리 화면과 `admin-api` 연동 코드가 없습니다.

과거에는 `개발자 > 관리` 메뉴와 `NEXT_PUBLIC_ADMIN_API_BASE_URL` 환경변수가 있었으나
2026-08-25 제거했습니다. 되살릴 일이 생기면 git 이력에서 `refactor: 개발자 탭의 관리 화면 제거`
커밋을 참고하세요.

## API 설정

```bash
NEXT_PUBLIC_PUBLIC_API_BASE_URL=http://localhost:8081
NEXT_PUBLIC_OPEN_API_BASE_URL=http://localhost:8083
NEXT_PUBLIC_OPEN_API_DEFAULT_YEAR=2026
NEXT_PUBLIC_OPEN_API_DEFAULT_MONTH=8
```

백엔드 멀티모듈 실행 기준:

- `public-api`: 자료실/게시글/파일 업로드, 기본 포트 `8081`
- `open-api`: 농산물·수력·산불·신선식품 지수, 기본 포트 `8083`

가뭄 자료실/파일 관리 파트는 다음 `public-api`를 기준으로 연결합니다.

```http
GET /api/v1/article-categories
GET /api/v1/articles
GET /api/v1/articles/{id}
POST /api/v1/articles-with-files
POST /api/v1/multipart-upload/generate-upload-id
POST /api/v1/multipart-upload/presigned-url
POST /api/v1/multipart-upload/complete-upload
```

대시보드 지수/예측 파트는 다음 `open-api`를 기준으로 연결합니다.

```http
GET /v1/summary
GET /api/v1/agrimarket/daily-price
GET /api/v1/hydropower/monthly-generation
GET /api/v1/wild-fire-risk/forecast
GET /api/v1/freshfood/fresh-vegetable
```

백엔드가 실행 중이 아니거나 응답이 비어 있으면 주요 대시보드와 OpenAPI 카탈로그는 mock/fallback 데이터를 표시합니다.
