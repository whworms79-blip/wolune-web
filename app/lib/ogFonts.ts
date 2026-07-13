// OG 이미지(satori)용 한글 폰트 로더.
//
// 왜 이런 방식인가:
//   · satori 는 **시스템 폰트를 못 쓴다**. 폰트 바이너리를 직접 줘야 한다. 안 주면
//     한글이 두부(□)로 나오거나 아예 안 그려진다 — OG 라우트가 오래 영문만 그린 이유.
//   · 한글 폰트 전체는 5MB 급이라 레포에 넣기도, 요청마다 읽기도 부담이다.
//   · satori 는 woff2 를 못 읽는다(woff/ttf/otf 만). 그래서 CDN 의 woff2 도 못 쓴다.
//
// 해법: Google Fonts CSS API 의 `text=` 서브셋. **그 이미지에 실제로 쓰이는 글자만**
// 담은 ttf 를 돌려준다(수십 KB). 브라우저가 아닌 UA 로 요청하면 woff2 가 아니라
// truetype 을 준다 — satori 가 읽을 수 있는 형식.
//
// 폰트 선택은 디자인 시스템을 따랐다: globals.css 가 --font-voice 의 한글 대체로
// 이미 "Noto Serif KR" 을 지목하고 있다(라틴은 Cormorant Garamond). 그래서 제목·점수는
// Noto Serif KR, 나머지 본문은 Noto Sans KR(=Pretendard 계열 고딕에 가장 가깝다).

type Family = "Noto Serif KR" | "Noto Sans KR";

/// 같은 (폰트, 굵기, 글자) 조합은 다시 받지 않는다. 람다가 살아있는 동안 재사용.
const cache = new Map<string, ArrayBuffer>();

async function fetchSubset(
  family: Family,
  weight: number,
  text: string,
): Promise<ArrayBuffer> {
  const key = `${family}|${weight}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`,
    { signal: AbortSignal.timeout(4000) },
  ).then((r) => r.text());

  // Google 이 준 @font-face 에서 ttf/otf 링크를 뽑는다.
  const m = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:opentype|truetype)'\)/);
  if (!m) throw new Error(`no truetype src for ${family}`);

  const buf = await fetch(m[1], { signal: AbortSignal.timeout(4000) }).then((r) =>
    r.arrayBuffer(),
  );
  cache.set(key, buf);
  return buf;
}

/// satori 에 넘길 폰트 목록. 실패하면 null — 호출부가 영문 폴백으로 내려간다
/// (두부 이미지를 내보내느니 예전처럼 라틴만 그리는 편이 낫다).
export async function loadOgFonts(
  serifText: string,
  sansText: string,
): Promise<
  | { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }[]
  | null
> {
  try {
    const [serif, sans] = await Promise.all([
      fetchSubset("Noto Serif KR", 700, serifText),
      fetchSubset("Noto Sans KR", 400, sansText),
    ]);
    return [
      { name: "voice", data: serif, weight: 700, style: "normal" },
      { name: "sans", data: sans, weight: 400, style: "normal" },
    ];
  } catch {
    return null;
  }
}
