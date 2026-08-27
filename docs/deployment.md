# 배포 구성

`infradna.io.kr` 운영 배포 기준이다. 2026-08-26 작성.

## 전체 구성

```
인터넷
  │  :80 / :443
  ▼
Caddy 컨테이너 ──(docker network: web)──> icuh-drought-platform-fo:3000
  자동 HTTPS                                Next.js standalone

같은 EC2에서 계속 도는 것: icuh_platform_api :8080
```

앱 컨테이너는 **호스트 포트를 열지 않는다.** Caddy와 같은 도커 네트워크(`web`)에 붙어 컨테이너 이름으로 통신하므로, 외부에서 3000으로 직접 들어올 경로가 없다.

## 서버 현황

| 항목 | 값 |
| --- | --- |
| 도메인 | `infradna.io.kr` (Route 53) |
| A 레코드 | `54.180.165.127` |
| EC2 | Ubuntu, 메모리 3.9GB, 디스크 29GB |

### 포트 배치

| 포트 | 용도 |
| --- | --- |
| 80 / 443 | Caddy |
| 8080 | `icuh_platform_api` (기존, 유지) |
| 3000 | 가뭄 플랫폼 — 컨테이너 내부 전용 |
| 8081 / 8083 | 가뭄 백엔드 public-api / open-api (미배포) |

## 최초 1회 준비

### 1. 보안그룹

인바운드에 다음을 추가한다. **80이 없으면 Caddy가 인증서를 발급받지 못한다**(HTTP-01 챌린지).

```
HTTP   TCP 80   0.0.0.0/0, ::/0
HTTPS  TCP 443  0.0.0.0/0, ::/0
```

### 2. Caddy 기동

```bash
# 저장소의 deploy/Caddyfile 을 EC2 로 복사
scp -i <키> deploy/Caddyfile ubuntu@<EC2>:/home/ubuntu/caddy/Caddyfile
scp -i <키> deploy/bootstrap.sh ubuntu@<EC2>:/home/ubuntu/

# EC2 에서
bash ~/bootstrap.sh
docker logs -f caddy      # 인증서 발급 확인
```

### 3. GitHub 설정

**Secrets** (민감값)

| 이름 | 용도 |
| --- | --- |
| `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` | 이미지 push |
| `EC2_HOST` / `EC2_USERNAME` / `SSH_PRIVATE_KEY` | 배포 접속 |
| `NEXT_PUBLIC_PUBLIC_API_BASE_URL` | 자료실 API 주소 |
| `NEXT_PUBLIC_OPEN_API_BASE_URL` | 지수·예측 API 주소 |

**Variables** (민감하지 않아 평문으로 두는 편이 관리에 낫다)

값은 모두 운영 open-api 에 직접 물어 확인했다(2026-08-27).

| 이름 | 값 | 확인한 것 |
| --- | --- | --- |
| `NEXT_PUBLIC_OPEN_API_DEFAULT_YEAR` | `2026` | |
| `NEXT_PUBLIC_OPEN_API_DEFAULT_MONTH` | `5` | 네 항목이 모두 데이터를 갖는 가장 최신 월 |
| `NEXT_PUBLIC_AGRI_CABBAGE_LOCATION` | `강릉` | `calendarData` 31건 |
| `NEXT_PUBLIC_AGRI_ONION_LOCATION` | `합천` | `calendarData` 26건 |
| `NEXT_PUBLIC_HYDROPOWER_DAM_NAME` | `합천` | **`합천댐` 은 E404** |

### 값을 짐작하지 말 것

두 번 틀렸던 자리다.

**댐 이름은 `합천` 이다.** 화면에는 "합천댐"으로 표시되지만 open-api 가 찾는
이름은 `합천` 이고, `합천댐` 으로 물으면 `E404 Data Not Found` 를 준다.

**기준 연월은 신선물가가 정한다.** 다른 셋은 2026-08 에도 데이터가 있지만
신선물가만 비어 있다. 2026-06·07 은 아예 `E500` 이다.

| 연월 | 배추(강릉) | 양파(합천) | 신선물가 | 수력발전(합천) |
| --- | --- | --- | --- | --- |
| 2026-08 | 31건 | 26건 | **0건** | 8건 |
| 2026-07 | 31건 | 26건 | **E500** | 8건 |
| 2026-06 | 30건 | 25건 | **E500** | 8건 |
| 2026-05 | 31건 | 26건 | 18건 | 8건 |

값을 바꿀 때는 먼저 실제로 호출해 데이터가 있는지 확인한다. 비어 있어도
화면은 조용히 빈 카드를 보여줄 뿐 오류를 내지 않으므로 눈치채기 어렵다.

## 배포 흐름

```
develop 에 작업 누적 → main 으로 머지 → 자동 배포
```

| 단계 | 내용 |
| --- | --- |
| verify | lint + 테스트 5종 |
| build-and-push | Docker Hub 에 `:latest` 와 `:<커밋SHA>` push |
| deploy | SSH → pull → 컨테이너 교체 → 기동 확인 |

기동 확인이 20회(약 60초) 실패하면 배포를 실패로 표시하고 컨테이너 로그를 남긴다.

## 롤백

`:<커밋SHA>` 태그를 함께 남기므로 이전 이미지로 되돌릴 수 있다.

```bash
docker rm -f icuh-drought-platform-fo
docker run -d --name icuh-drought-platform-fo \
  --restart unless-stopped --network web \
  <user>/icuh-drought-platform-fo:<이전SHA>
```

## 주의할 점

### NEXT_PUBLIC_* 은 빌드 시점에 박힌다

런타임 `-e` 로 바꿀 수 없다. API 주소를 바꾸려면 **이미지를 다시 빌드**해야 한다. Vite 의 `VITE_*` 와 같은 성질이다.

### 기존 프론트를 되살릴 때 포트가 충돌한다

`icuh-platform-fo` 컨테이너는 현재 정지 상태이고, 그 저장소의 워크플로는 `docker run -p 80:80` 으로 뜨도록 되어 있다. Caddy 가 80 을 쓰는 상태에서 그대로 실행하면 **포트 충돌로 실패한다.**

되살릴 때는 호스트 포트 매핑 없이 `--network web` 으로 띄우고, `deploy/Caddyfile` 하단 주석의 블록을 참고해 서브도메인을 붙인다.

### 빌드 출력 경로

`npm run build` 는 dev 서버와의 `.next` 충돌을 피하려고 `NEXT_DIST_DIR=.next-build` 를 쓴다. 컨테이너 안에는 dev 서버가 없으므로 Dockerfile 은 `.next` 로 되돌려 빌드한다. standalone 산출물 경로를 단순하게 두기 위함이다.

### 8080 이 외부에 직접 열려 있다

`icuh_platform_api` 가 `0.0.0.0:8080` 으로 공개돼 있다. Caddy 도입 후에는 `127.0.0.1:8080` 으로 내리고 서브도메인으로 받는 편이 안전하다. 이번 작업 범위 밖이다.

## 검증 기록

로컬에서 이미지를 빌드해 확인했다.

- 이미지 크기 224MB
- 비루트(`nextjs`) 실행
- `/`, `/archive`, `/?view=api`, `/archive/9001` 모두 200
