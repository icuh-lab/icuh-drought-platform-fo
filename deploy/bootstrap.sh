#!/usr/bin/env bash
# EC2 최초 1회 실행. Caddy 리버스 프록시를 세운다.
# 이후 앱 배포는 GitHub Actions 가 담당하므로 이 스크립트를 다시 돌릴 일은 없다.
set -euo pipefail

CADDY_DIR=/home/ubuntu/caddy

# 앱과 프록시가 컨테이너 이름으로 통신할 네트워크
docker network inspect web >/dev/null 2>&1 || docker network create web

mkdir -p "$CADDY_DIR" "$CADDY_DIR/log"
# Caddyfile 은 저장소의 deploy/Caddyfile 을 복사해 둔다.
test -f "$CADDY_DIR/Caddyfile" || { echo "먼저 $CADDY_DIR/Caddyfile 을 배치하세요."; exit 1; }

# 기동 전에 설정을 검증한다. 문법이 틀리면 Caddy 가 재시작을 반복하는데, 그때마다
# Let's Encrypt 발급을 시도해 실패 한도(도메인당 시간당 5회)를 태운다. 한 번 걸리면
# 한 시간을 기다려야 하므로, 컨테이너를 띄우기 전에 여기서 걸러낸다.
docker run --rm -v "$CADDY_DIR/Caddyfile":/etc/caddy/Caddyfile:ro caddy:2-alpine \
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile \
  || { echo "Caddyfile 이 유효하지 않다. 기동하지 않고 멈춘다."; exit 1; }

docker rm -f caddy 2>/dev/null || true
docker run -d --name caddy \
  --restart unless-stopped \
  --network web \
  -p 80:80 -p 443:443 \
  -v "$CADDY_DIR/Caddyfile":/etc/caddy/Caddyfile:ro \
  -v caddy_data:/data \
  -v caddy_config:/config \
  -v "$CADDY_DIR/log":/var/log/caddy \
  caddy:2-alpine

echo "Caddy 기동 완료. 인증서 발급 로그 확인:"
echo "  docker logs -f caddy"
echo
echo "발급이 끝나면 세 이름이 모두 https 로 응답해야 한다:"
echo "  curl -sS -o /dev/null -w '%{http_code}\n' https://infradna.io.kr"
echo "  curl -sS -o /dev/null -w '%{http_code}\n' https://api.infradna.io.kr/health"
echo "  curl -sS -o /dev/null -w '%{http_code}\n' https://open-api.infradna.io.kr/health"
