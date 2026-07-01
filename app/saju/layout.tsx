import type { Metadata } from "next";

// 폼은 클라이언트 컴포넌트(page.tsx)라 metadata를 export할 수 없어,
// 서버 컴포넌트인 이 layout에서 <head> 메타를 서버 렌더한다.
export const metadata: Metadata = {
  title: "만나서 반가워요",
  description:
    "생년월일과 태어난 시간·장소를 알려주시면, 진태양시로 정밀하게 사주를 계산해 드려요.",
  robots: { index: false }, // 입력 폼은 색인 대상이 아님(랜딩만 SEO 노출)
};

export default function SajuLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
