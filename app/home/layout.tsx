import type { Metadata } from "next";

// 홈은 개인화된 "매일 여는" 유지 화면 — 색인 대상 아님(획득은 랜딩이 담당).
export const metadata: Metadata = {
  title: "오늘",
  description: "오늘의 운세와 감정 날씨 — 매일 여는 Wolune 홈.",
  robots: { index: false },
};

export default function HomeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
