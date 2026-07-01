import type { Metadata } from "next";

// 결과 페이지는 순수 서버 컴포넌트(SSR)라 페이지에서 직접 metadata를 export할 수도 있지만,
// 향후 동적 라우트(궁합 공유 링크 등)로 확장할 때를 대비해 layout에 메타를 둔다.
// 지금은 더미 데이터라 noindex.
export const metadata: Metadata = {
  title: "내 사주",
  description:
    "진태양시로 정밀 계산한 사주 — 캐릭터, 오행의 균형, 신살, 올해의 흐름을 한눈에.",
  robots: { index: false }, // 더미 단계: 색인 제외. 엔진 연결 후 공유용 페이지로 개방 예정.
};

export default function SajuResultLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
