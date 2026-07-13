// 사이트 절대 URL 단일 소스 — 메타데이터/OG/canonical 이 여기서만 도메인을 얻는다.
//
// 운영 기본값은 실제로 살아 있는 주소여야 한다. 예전 기본값이 `wolune.app`(사지 않은
// 도메인)이라 배포된 OG 메타가 열리지 않는 주소를 가리켰다 — 카톡 미리보기가 통째로
// 죽는다. 앱(app/lib/data/site.dart)도 같은 주소를 쓴다. 둘을 같이 바꿀 것.
//
// 커스텀 도메인을 사면: Netlify 환경변수 NEXT_PUBLIC_SITE_URL 만 새 주소로 넣으면 된다
// (코드 수정 없이 덮어쓴다). 아래 상수는 env 가 없을 때의 안전한 기본값일 뿐이다.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://wolune.netlify.app"
    : "http://localhost:3000");
