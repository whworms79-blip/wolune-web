// 사이트 절대 URL 단일 소스 — 메타데이터/OG/canonical 이 여기서만 도메인을 얻는다.
// 우선순위: 명시 env(NEXT_PUBLIC_SITE_URL) → Vercel 배포 도메인 → 운영 기본(wolune.app) → 로컬 개발.
// 이렇게 두면 화면마다 도메인이 어긋나거나(예: 루트는 wolune.app, 공유는 localhost) 하지 않는다.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.NODE_ENV === "production"
      ? "https://wolune.app"
      : "http://localhost:3000");
