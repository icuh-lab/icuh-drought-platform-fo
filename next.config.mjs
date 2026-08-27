/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 컨테이너 배포용. Next 가 필요한 의존성만 추린 서버 번들을 만든다.
  // node_modules 통째 복사 대비 이미지가 크게 작아진다.
  output: "standalone",
  // next dev 와 next build 가 같은 .next 를 쓰면, 빌드가 dev 산출물을 갈아엎어
  // webpack 캐시가 사라진 vendor-chunks 를 참조하며 실패한다(ENOENT).
  // build/start 는 NEXT_DIST_DIR 로 별도 폴더를 쓴다.
  distDir: process.env.NEXT_DIST_DIR ?? ".next"
};

export default nextConfig;

