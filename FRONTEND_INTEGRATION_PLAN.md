# Frontend Integration Plan

## 현재 분석

- 프론트는 Next.js 14 App Router 기반이며 `lib/api-client.ts`와 `lib/archive-upload.ts`가 백엔드 연동 지점이다.
- 기존 프론트는 단일 `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`과 가상 Open API path(`/v1/...`)를 사용하고 있었다.
- 현재 백엔드 멀티모듈은 실행 서버가 분리되어 있다.
  - `public-api`: `http://localhost:8081`
  - `admin-api`: `http://localhost:8082`
  - `open-api`: `http://localhost:8083`
- 응답 envelope도 서버별로 다르다.
  - `public-api`: `{ status, message, data, error }`
  - `open-api`: `{ result, data, error }`
  - `admin-api`: 일부 엔드포인트는 DTO/List를 직접 반환

## 연동 계획

1. API base URL을 서버별로 분리한다.
   - `NEXT_PUBLIC_PUBLIC_API_BASE_URL`
   - `NEXT_PUBLIC_OPEN_API_BASE_URL`
   - `NEXT_PUBLIC_ADMIN_API_BASE_URL`
2. 자료실 화면(`/archive`, 등록, 상세, 수정, 파일 업로드)은 `public-api`에 연결한다.
3. 메인 대시보드의 종합 현황·농산물·수력·산불·신선식품 영역은 `open-api` 실제 path에 연결한다.
4. 메인 대시보드의 가뭄영향 리포트 영역은 `public-api` 게시글 데이터를 화면용 리포트 모델로 변환해 사용한다.
5. 관리자 화면은 현재 `admin-api`의 목록/승인 API에 맞춰 우선 조회와 승인 호출을 연결한다.
6. 백엔드 미실행, 데이터 없음, 계약 미완성 API는 기존 mock/fallback UI를 유지한다.

## 구현 계획

1. `lib/api-client.ts`
   - 서버별 base URL 상수 추가
   - `open-api`, `public-api` envelope 파서 분리
   - Open API 실제 path 호출 및 화면 모델 adapter 추가
   - `/v1/summary`는 `{ generatedAt, alerts, kpis }` 계약으로 수신
   - public article 데이터를 대시보드 리포트 모델로 변환
   - admin 목록/승인 API path 보정
2. `lib/archive-upload.ts`
   - 파일 업로드 base URL을 `public-api`로 변경
3. `app/page.tsx`
   - API 센터 curl 예시가 API 그룹별 서버 base URL을 사용하도록 변경
   - 관리자 토큰 입력은 선택값으로 완화
4. `lib/mock-data.ts`
   - API 카탈로그를 실제 백엔드 path 기준으로 갱신
5. `.env.local.example`, `README.md`
   - 멀티모듈 백엔드 기준 환경변수와 실행 포트 문서화
6. 검증
   - `npm run lint`
   - `npm run build`
