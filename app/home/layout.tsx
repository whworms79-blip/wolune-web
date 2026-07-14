import type { Metadata } from "next";
import { getGlossary } from "../lib/glossary";
import { GlossaryProvider } from "../saju/result/Glossary";

// 홈은 개인화된 "매일 여는" 유지 화면 — 색인 대상 아님(획득은 랜딩이 담당).
export const metadata: Metadata = {
  title: "오늘",
  description: "오늘의 운세와 감정 날씨 — 매일 여는 Wolune 홈.",
  robots: { index: false },
};

// 사전을 여기(레이아웃)에서 한 번 받아 내려준다 — 홈의 "왜 N점인가요?" 근거에
// 십성(정인·편관…)·오행 용어가 나오므로 툴팁이 필요하다. 홈 page.tsx 는 클라이언트
// 컴포넌트라 스스로 서버 fetch 를 할 수 없다(명식·궁합과 같은 구조).
// 브라우저는 사전을 따로 받아오지 않는다.
export default async function HomeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const glossary = await getGlossary();
  return <GlossaryProvider data={glossary}>{children}</GlossaryProvider>;
}
