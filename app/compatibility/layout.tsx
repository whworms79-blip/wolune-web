import type { Metadata } from "next";
import { getGlossary } from "../lib/glossary";
import { GlossaryProvider } from "../saju/result/Glossary";

// 궁합은 "결과를 나눠 사람을 데려오는" 획득 통로 → 색인 허용(공유·검색 노출).
export const metadata: Metadata = {
  title: "궁합 — 두 사람의 결 맞춰보기",
  description:
    "생년월일만으로 두 사람의 사주를 견주어, 잘 통하는 점과 서로 배려하면 좋은 점을 따뜻하게 짚어드려요. Wolune 궁합.",
};

// 사전을 여기(레이아웃)에서 한 번 받아 내려준다. /compatibility 는 클라이언트 컴포넌트라
// 스스로 서버 fetch 를 할 수 없고, /compatibility/share 는 서버 렌더다 — 레이아웃이 둘의
// 공통 조상이라 한 곳에서 해결된다(브라우저는 사전을 따로 받아오지 않는다).
export default async function CompatibilityLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const glossary = await getGlossary();
  return <GlossaryProvider data={glossary}>{children}</GlossaryProvider>;
}
