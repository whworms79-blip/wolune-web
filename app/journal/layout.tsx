import type { Metadata } from "next";

// 무드저널은 개인 기록 화면 — 색인 대상 아님.
export const metadata: Metadata = {
  title: "기록",
  description: "매일의 감정을 사주 흐름과 함께 남기는 무드저널.",
  robots: { index: false },
};

export default function JournalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
