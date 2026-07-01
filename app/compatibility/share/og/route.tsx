// 궁합 공유 링크의 동적 OG 이미지(1200×630).
// opengraph-image 파일 규칙은 searchParams를 못 받으므로 라우트 핸들러로 구현하고,
// share/page.tsx 의 generateMetadata 에서 이 URL을 og:image 로 가리킨다.
// ⚠ next/og(satori)는 기본 폰트에 한글 글리프가 없다 → 이미지는 라틴/숫자만 렌더(항상 안전).
//    한글 미리보기 문구는 HTML og:title/description(카톡·SNS 프리뷰)에서 보여준다.
import { ImageResponse } from "next/og";
import { createElement as h } from "react";
import { decodePerson, buildCompatibility } from "../../../lib/compatibility";
import { fetchChartServer } from "../../fetchChart";

export const dynamic = "force-dynamic"; // searchParams 사용 → 요청 시 렌더

const SIZE = { width: 1200, height: 630 };

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const a = decodePerson(params.get("a"));
  const b = decodePerson(params.get("b"));

  let score = "";
  let pairEn = "Compatibility";
  if (a && b) {
    const [ca, cb] = await Promise.all([
      fetchChartServer(a.input),
      fetchChartServer(b.input),
    ]);
    if (ca && cb) {
      const v = buildCompatibility(ca, cb, a.name, b.name);
      score = String(v.score);
      pairEn = v.summary.en;
    }
  }

  const heart = h(
    "svg",
    { width: 132, height: 132, viewBox: "0 0 24 24" },
    h("path", {
      d: "M12 21s-7.5-4.8-9.6-9.3A4.8 4.8 0 0 1 12 6.2 4.8 4.8 0 0 1 21.6 11.7C19.5 16.2 12 21 12 21Z",
      fill: "#e89bb0",
    }),
  );

  const kids = [
    h("div", { key: "k", style: { display: "flex", fontSize: 40, letterSpacing: 10, color: "#e8c06a" } }, "WOLUNE"),
    h("div", { key: "h", style: { display: "flex", marginTop: 26 } }, heart),
  ];
  if (score) {
    kids.push(
      h("div", { key: "s", style: { display: "flex", fontSize: 132, fontWeight: 700, color: "#e89bb0", marginTop: 6, lineHeight: 1 } }, score),
    );
  }
  kids.push(
    h("div", { key: "e", style: { display: "flex", fontSize: 64, fontWeight: 700, color: "#f3ecdd", marginTop: 10 } }, pairEn),
    h("div", { key: "t", style: { display: "flex", fontSize: 30, color: "#a9a7c8", marginTop: 22, letterSpacing: 2 } }, "Wolune Compatibility"),
  );

  const root = h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #191a35 0%, #16172f 55%, #121228 100%)",
        fontFamily: "sans-serif",
      },
    },
    ...kids,
  );

  return new ImageResponse(root, { ...SIZE });
}
