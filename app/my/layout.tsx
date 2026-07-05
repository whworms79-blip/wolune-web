import type { Metadata } from "next";

// 마이·설정은 개인 화면 → 색인 대상 아님.
export const metadata: Metadata = {
  title: "마이",
  description: "내 사주 정보·캐릭터, 계산 정확도와 한계, 데이터 관리.",
  robots: { index: false },
};

export default function MyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
