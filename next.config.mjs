/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // next dev 와 next build 가 같은 .next 를 쓰면, 빌드가 dev 산출물을 갈아엎어
  // webpack 캐시가 사라진 vendor-chunks 를 참조하며 실패한다(ENOENT).
  // build/start 는 NEXT_DIST_DIR 로 별도 폴더를 쓴다.
  distDir: process.env.NEXT_DIST_DIR ?? ".next"
};

export default nextConfig;

