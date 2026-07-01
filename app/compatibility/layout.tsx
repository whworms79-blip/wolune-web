import type { Metadata } from "next";

// 궁합은 "결과를 나눠 사람을 데려오는" 획득 통로 → 색인 허용(공유·검색 노출).
export const metadata: Metadata = {
  title: "궁합 — 두 사람의 결 맞춰보기",
  description:
    "생년월일만으로 두 사람의 사주를 견주어, 잘 통하는 점과 서로 배려하면 좋은 점을 따뜻하게 짚어드려요. Wolune 궁합.",
};

export default function CompatibilityLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
