// 궁합 공유 링크의 동적 OG 이미지(1200×630).
// opengraph-image 파일 규칙은 searchParams를 못 받으므로 라우트 핸들러로 구현하고,
// share/page.tsx 의 generateMetadata 에서 이 URL을 og:image 로 가리킨다.
//
// 한글은 lib/ogFonts.ts 가 넣어주는 서브셋 폰트로 그린다(satori 는 시스템 폰트를 못 쓴다).
// 폰트를 못 받아오면 두부(□)를 내보내는 대신 라틴 폴백으로 조용히 내려간다.
import { ImageResponse } from "next/og";
import { decodePerson } from "../../../lib/compatibility";
import { loadOgFonts } from "../../../lib/ogFonts";
import { fetchCompatServer } from "../../fetchCompat";

export const dynamic = "force-dynamic"; // searchParams 사용 → 요청 시 렌더

const SIZE = { width: 1200, height: 630 };

const CREAM = "#f3ecdd";
const GOLD = "#e8c06a";
const ROSE = "#e89bb0";
const MUTED = "#a9a7c8";
const BG = "linear-gradient(135deg, #191a35 0%, #16172f 55%, #121228 100%)";

function Heart({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M12 21s-7.5-4.8-9.6-9.3A4.8 4.8 0 0 1 12 6.2 4.8 4.8 0 0 1 21.6 11.7C19.5 16.2 12 21 12 21Z"
        fill={ROSE}
      />
    </svg>
  );
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const a = decodePerson(params.get("a"));
  const b = decodePerson(params.get("b"));

  let score = "";
  let titleKo = "두 사람의 궁합";
  let titleEn = "Compatibility";
  let tagline = "사주로 보는 두 사람의 결.";
  let names = "";

  if (a && b) {
    // ★ 점수는 엔진이 만든다. 여기서 따로 계산하면 카톡 미리보기만 다른 점수를 그리게 된다.
    const v = await fetchCompatServer(a, b);
    if (v) {
      score = String(v.score);
      titleKo = v.summary.title;
      titleEn = v.summary.en;
      tagline = v.summary.tagline;
      names = `${v.persons[0].name} · ${v.persons[1].name}`;
    }
  }

  // 이 이미지에 실제로 쓰이는 글자만 서브셋으로 받는다.
  const fonts = await loadOgFonts(titleKo + score, names + tagline + "WOLUNE" + titleEn);

  // 폰트를 못 받았을 때: 예전처럼 라틴만 그린다(깨진 네모보다 낫다).
  if (!fonts) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: BG,
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ display: "flex", fontSize: 40, letterSpacing: 10, color: GOLD }}>
            WOLUNE
          </div>
          <div style={{ display: "flex", marginTop: 26 }}>
            <Heart size={132} />
          </div>
          {score ? (
            <div
              style={{
                display: "flex",
                fontSize: 132,
                fontWeight: 700,
                color: ROSE,
                marginTop: 6,
                lineHeight: 1,
              }}
            >
              {score}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 700,
              color: CREAM,
              marginTop: 10,
            }}
          >
            {titleEn}
          </div>
        </div>
      ),
      { ...SIZE },
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: BG,
          fontFamily: "sans",
          padding: "48px 80px",
          textAlign: "center",
        }}
      >
        {/* 브랜드 */}
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 12, color: GOLD }}>
          WOLUNE
        </div>

        {/* 두 사람 이름 + 하트 + 점수 — 카톡 썸네일에서 제일 먼저 읽히는 줄 */}
        {names ? (
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: MUTED,
              marginTop: 26,
              letterSpacing: 1,
            }}
          >
            {names}
          </div>
        ) : null}

        {score ? (
          <div style={{ display: "flex", alignItems: "center", marginTop: 10 }}>
            <Heart size={72} />
            <div
              style={{
                display: "flex",
                fontFamily: "voice",
                fontWeight: 700,
                fontSize: 116,
                color: ROSE,
                lineHeight: 1,
                marginLeft: 18,
              }}
            >
              {score}
            </div>
          </div>
        ) : null}

        {/* 주인공 — 한글 캐릭터명. 길어지면 두 줄로 접힌다. */}
        <div
          style={{
            display: "flex",
            fontFamily: "voice",
            fontWeight: 700,
            fontSize: titleKo.length > 12 ? 58 : 72,
            color: CREAM,
            lineHeight: 1.25,
            marginTop: 20,
            maxWidth: 1000,
          }}
        >
          {titleKo}
        </div>

        {/* 영문명은 부제로 작게 */}
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: 5,
            color: GOLD,
            opacity: 0.75,
            marginTop: 14,
          }}
        >
          {titleEn.toUpperCase()}
        </div>

        {/* 클릭을 부르는 한 줄 */}
        <div
          style={{
            display: "flex",
            fontSize: 30,
            color: MUTED,
            lineHeight: 1.4,
            marginTop: 24,
            maxWidth: 940,
          }}
        >
          {tagline}
        </div>
      </div>
    ),
    { ...SIZE, fonts },
  );
}
