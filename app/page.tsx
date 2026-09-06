// Wolune 랜딩 — 서버 컴포넌트(SSR). "use client" 없음 → 서버에서 렌더되어 SEO에 노출된다.
import Link from "next/link";

// 밤하늘 별. 고정 좌표(결정적)라 SSR/CSR 하이드레이션이 어긋나지 않는다.
const STARS = [
  { top: "12%", left: "16%", cls: "" },
  { top: "20%", left: "78%", cls: "gold" },
  { top: "30%", left: "40%", cls: "sm" },
  { top: "16%", left: "58%", cls: "sm" },
  { top: "68%", left: "22%", cls: "sm" },
  { top: "74%", left: "82%", cls: "" },
  { top: "82%", left: "48%", cls: "sm" },
  { top: "40%", left: "88%", cls: "sm" },
  { top: "58%", left: "10%", cls: "gold" },
  { top: "88%", left: "68%", cls: "sm" },
  { top: "34%", left: "8%", cls: "sm" },
  { top: "62%", left: "64%", cls: "sm" },
];

// 브랜드 마크 — 달이 작은 별 하나를 품은 형태(골드 초승달 + 별).
function WoluneMark() {
  return (
    <svg
      className="mark"
      viewBox="0 0 100 100"
      role="img"
      aria-label="Wolune 로고 — 초승달과 작은 별"
    >
      {/* 초승달: 바깥 원에서 안쪽 원을 빼 초승달 형태 */}
      <defs>
        <mask id="crescent">
          <rect width="100" height="100" fill="black" />
          <circle cx="50" cy="50" r="34" fill="white" />
          <circle cx="63" cy="43" r="30" fill="black" />
        </mask>
      </defs>
      <circle cx="50" cy="50" r="34" fill="#e8c06a" mask="url(#crescent)" />
      {/* 별 — 초승달 **바깥** 오른쪽 위.
          2026-09-06 변경: 원래는 초승달의 오목한 품 안(64,46)에 있었는데,
          그건 별과 초승달(☪)과 같은 배치라 사주 앱과 무관한 상징으로 읽혔다.
          ⚠ app/tools/make_icon.py(star_points)·welcome_screen.dart 와 같은 값. */}
      <path
        d="M80 15.5 L81.566 19.844 L86.182 19.991 L82.535 22.824 L83.821 27.259
           L80 24.665 L76.179 27.259 L77.465 22.824 L73.818 19.991 L78.434 19.844 Z"
        fill="#f3ecdd"
      />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="hero">
      <div className="stars" aria-hidden="true">
        {STARS.map((s, i) => (
          <span
            key={i}
            className={`star ${s.cls}`}
            style={{ top: s.top, left: s.left }}
          />
        ))}
      </div>

      <div className="hero__inner">
        <WoluneMark />

        <h1 className="wordmark">Wolune</h1>

        {/* ★ 랜딩엔 로그인 버튼을 두지 않는다. 여기는 "어서 오세요"만 하는 곳이다.
            (돌아온 사용자용 로그인 변형을 넣었다가 뺐다 — 카카오 노랑과 골드 CTA 가 서로 싸워
             위계가 무너졌고, 무엇보다 웰컴에서 로그인을 요구하는 건 첫인상으로 이르다.
             돌아온 사용자를 붙잡는 진짜 지점은 **사주를 새로 입력하려는 순간**이다 →
             app/saju/ReturningHint.tsx. wl_returning 플래그는 거기서 계속 쓴다.) */}
        <p className="tagline">달빛처럼, 곁에서 비춰주는</p>
        <p className="tagline-en">Your gentle guide through life&rsquo;s tides</p>

        <p className="hero__intro">
          운명을 점치지 않습니다. 어려울 때 곁에서 조용히 길을 비춰주는 동행. 달이 어둠을
          몰아내지 않고 은은히 밝히듯, <strong>Wolune</strong>은 단정하지 않고 함께
          들여다봅니다.
        </p>

        <Link className="cta" href="/saju">
          내 사주 보기
          <span className="cta__arrow" aria-hidden="true">
            →
          </span>
        </Link>

        <p className="footnote">생년월일만 있으면 시작할 수 있어요</p>

        <footer className="hero__footer">
          <Link href="/privacy">개인정보처리방침</Link>
        </footer>
      </div>
    </main>
  );
}
