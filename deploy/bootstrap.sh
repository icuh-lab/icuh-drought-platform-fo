#!/usr/bin/env bash
# EC2 최초 1회 실행. Caddy 리버스 프록시를 세운다.
# 이후 앱 배포는 GitHub Actions 가 담당하므로 이 스크립트를 다시 돌릴 일은 없다.
set -euo pipefail

CADDY_DIR=/home/ubuntu/caddy

# 앱과 프록시가 컨테이너 이름으로 통신할 네트워크
docker network inspect web >/dev/null 2>&1 || docker network create web

mkdir -p "$CADDY_DIR"
# Caddyfile 은 저장소의 deploy/Caddyfile 을 복사해 둔다.
test -f "$CADDY_DIR/Caddyfile" || { echo "먼저 $CADDY_DIR/Caddyfile 을 배치하세요."; exit 1; }

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
