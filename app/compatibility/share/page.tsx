// 궁합 공유 링크로 들어온 사람이 보는 페이지 — 서버 컴포넌트(SSR).
// URL의 두 사람 정보(a,b)를 디코드 → 엔진 호출 → 궁합 결과 렌더.
// 획득 퍼널: 링크로 온 사람이 결과를 보고 "나도 내 사주 보기"(→ /saju)로 유입.
// OG 메타태그(제목/설명/이미지)로 카톡·SNS 프리뷰가 잘 뜨게 한다.
import type { Metadata } from "next";
import Link from "next/link";
import { decodePerson, buildCompatibility } from "../../lib/compatibility";
import { fetchChartServer } from "../fetchChart";
import CompatResult from "../CompatResult";
import "../compatibility.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

type SearchParams = Promise<{ a?: string; b?: string }>;

/* ---------- 인라인 아이콘 ---------- */
const ico = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const ChevronLeft = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M15 6l-6 6 6 6" /></svg>);
const Moon = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>);
const Notebook = () => (<svg viewBox="0 0 24 24" {...ico}><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 4v16M9 9h6M9 13h4" /></svg>);
const LayoutGrid = () => (<svg viewBox="0 0 24 24" {...ico}><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></svg>);
const User = () => (<svg viewBox="0 0 24 24" {...ico}><circle cx="12" cy="8" r="4" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>);

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const a = decodePerson(sp.a);
  const b = decodePerson(sp.b);
  const aLabel = (a?.name || "").trim() || "나";
  const bLabel = (b?.name || "").trim() || "상대";
  const title = a && b ? `${aLabel}님과 ${bLabel}님의 궁합` : "우리 둘의 궁합 — Wolune";
  const description =
    "생일만으로 확인하는 두 사람의 결. 잘 통하는 점과 서로 배려하면 좋은 점을 Wolune이 따뜻하게 짚어드려요. 나도 내 궁합이 궁금하다면?";

  const enc = (s?: string) => encodeURIComponent(s || "");
  const q = `a=${enc(sp.a)}&b=${enc(sp.b)}`;
  const ogImage = `/compatibility/share/og?${q}`;

  return {
    metadataBase: new URL(SITE),
    title,
    description,
    alternates: { canonical: `/compatibility/share?${q}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/compatibility/share?${q}`,
      siteName: "Wolune",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main className="screen">
      <header className="topbar">
        <Link className="topbar__btn" href="/compatibility" aria-label="궁합 다시 보기"><ChevronLeft /></Link>
        <h1 className="wl-heading topbar__title">궁합</h1>
      </header>
      {children}
      <nav className="home__nav wl-bottom-nav" aria-label="주요 메뉴">
        <Link className="wl-bottom-nav__tab" href="/home"><Moon /><span>오늘</span></Link>
        <Link className="wl-bottom-nav__tab" href="/journal"><Notebook /><span>기록</span></Link>
        <Link className="wl-bottom-nav__tab" href="/saju"><LayoutGrid /><span>사주</span></Link>
        <button className="wl-bottom-nav__tab" type="button" disabled><User /><span>마이</span></button>
      </nav>
    </main>
  );
}

function Fallback({ title, body }: { title: string; body: string }) {
  return (
    <Screen>
      <div className="compat-state">
        <span className="compat-state__mark" aria-hidden="true"><Moon /></span>
        <h2 className="wl-title-m">{title}</h2>
        <p className="wl-body wl-text-secondary">{body}</p>
        <Link
          className="wl-btn wl-btn--primary"
          href="/compatibility"
          style={{ width: "auto", padding: "13px 26px", marginTop: 8 }}
        >
          궁합 보러 가기
        </Link>
      </div>
    </Screen>
  );
}

export default async function SharePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const a = decodePerson(sp.a);
  const b = decodePerson(sp.b);

  if (!a || !b) {
    return (
      <Fallback
        title="링크가 올바르지 않아요"
        body="공유 링크가 손상됐거나 오래된 것 같아요. 두 사람의 생년월일로 궁합을 새로 볼 수 있어요."
      />
    );
  }

  const [ca, cb] = await Promise.all([
    fetchChartServer(a.input),
    fetchChartServer(b.input),
  ]);

  if (!ca || !cb) {
    return (
      <Fallback
        title="지금은 궁합을 불러오지 못했어요"
        body="계산 서버와 연결이 잠시 원활하지 않아요. 잠시 후 다시 시도해 주세요."
      />
    );
  }

  const view = buildCompatibility(ca, cb, a.name, b.name);

  return (
    <Screen>
      <div className="screen__scroll">
        <CompatResult
          view={view}
          footer={
            <section className="wl-card wl-card--gold share-cta">
              <span className="wl-title-m share-cta__title">나의 사주도 궁금하다면?</span>
              <span className="wl-body-s wl-text-secondary">
                생년월일만 있으면, 나의 타고난 결과 오늘의 흐름까지 볼 수 있어요.
              </span>
              <Link className="wl-btn wl-btn--primary" href="/saju">
                <Moon /> 나도 내 사주 보기
              </Link>
            </section>
          }
        />
      </div>
    </Screen>
  );
}
