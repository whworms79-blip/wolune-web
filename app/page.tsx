// Wolune 랜딩 — 서버 컴포넌트(SSR). "use client" 없음 → 서버에서 렌더되어 SEO에 노출된다.
import Link from "next/link";
import { WelcomeCta } from "./WelcomeCta";

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
      aria-label="Wolune 로고 — 작은 별을 품은 초승달"
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
      {/* 품은 별 */}
      <path
        d="M64 46 l2.2 5.6 6 .5 -4.6 3.9 1.5 5.9 -5.1 -3.2 -5.1 3.2 1.5 -5.9 -4.6 -3.9 6 -.5 z"
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

        {/* 인사말·소개·CTA — 돌아온 사용자(이 기기에서 로그인한 적 있음)에겐 다르게 보인다.
            localStorage 를 읽어야 하므로 이 블록만 클라이언트. 나머지 랜딩은 SSR(SEO) 유지. */}
        <WelcomeCta />

        <footer className="hero__footer">
          <Link href="/privacy">개인정보처리방침</Link>
        </footer>
      </div>
    </main>
  );
}
