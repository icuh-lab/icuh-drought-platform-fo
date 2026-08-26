# 가뭄영향정보플랫폼 프론트오피스
#
# standalone 출력으로 Next 가 추려낸 서버 번들만 실행 이미지에 담는다.
# 최종 이미지에는 node_modules 전체가 들어가지 않는다.

# ── 1. 의존성 ────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── 2. 빌드 ──────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* 는 런타임이 아니라 빌드 시점에 번들에 박힌다.
# 값을 바꾸려면 이미지를 다시 빌드해야 한다.
ARG NEXT_PUBLIC_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_OPEN_API_BASE_URL
ARG NEXT_PUBLIC_OPEN_API_DEFAULT_YEAR
ARG NEXT_PUBLIC_OPEN_API_DEFAULT_MONTH
ARG NEXT_PUBLIC_AGRI_CABBAGE_LOCATION
ARG NEXT_PUBLIC_AGRI_ONION_LOCATION
ARG NEXT_PUBLIC_HYDROPOWER_DAM_NAME
ENV NEXT_PUBLIC_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_OPEN_API_BASE_URL=$NEXT_PUBLIC_OPEN_API_BASE_URL \
    NEXT_PUBLIC_OPEN_API_DEFAULT_YEAR=$NEXT_PUBLIC_OPEN_API_DEFAULT_YEAR \
    NEXT_PUBLIC_OPEN_API_DEFAULT_MONTH=$NEXT_PUBLIC_OPEN_API_DEFAULT_MONTH \
    NEXT_PUBLIC_AGRI_CABBAGE_LOCATION=$NEXT_PUBLIC_AGRI_CABBAGE_LOCATION \
    NEXT_PUBLIC_AGRI_ONION_LOCATION=$NEXT_PUBLIC_AGRI_ONION_LOCATION \
    NEXT_PUBLIC_HYDROPOWER_DAM_NAME=$NEXT_PUBLIC_HYDROPOWER_DAM_NAME \
    NEXT_TELEMETRY_DISABLED=1

# npm run build 는 dev 서버와의 충돌을 피하려고 NEXT_DIST_DIR=.next-build 를 쓴다.
# 컨테이너 안에는 dev 서버가 없으므로 기본 경로(.next)로 되돌려 standalone 위치를 단순하게 둔다.
RUN NEXT_DIST_DIR=.next npx next build

# ── 3. 실행 ──────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# standalone 이 생성한 진입점
CMD ["node", "server.js"]
