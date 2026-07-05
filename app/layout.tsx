import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import { SITE_URL } from "./lib/site";
import "./globals.css";

// voice 폰트 — 워드마크·태그라인용 세리프(우아·신비). CSS 변수로 주입.
const voice = Cormorant_Garamond({
  variable: "--font-voice-src",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Wolune — 달빛처럼, 곁에서 비춰주는 사주",
    template: "%s · Wolune",
  },
  description:
    "Wolune은 운명을 점치는 도구가 아니라, 어려울 때 곁에서 조용히 길을 비춰주는 동행입니다. 달빛처럼 은은하게 함께 들여다보는 사주 컴패니언.",
  keywords: ["Wolune", "월루네", "사주", "만세력", "사주풀이", "운세", "사주 앱"],
  applicationName: "Wolune",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "Wolune",
    title: "Wolune — 달빛처럼, 곁에서 비춰주는 사주",
    description:
      "운명을 점치지 않습니다. 달빛처럼 곁에서 조용히 길을 비춰주는 사주 컴패니언, Wolune.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wolune — 달빛처럼, 곁에서 비춰주는 사주",
    description:
      "운명을 점치지 않습니다. 달빛처럼 곁에서 조용히 길을 비춰주는 사주 컴패니언, Wolune.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={voice.variable}>
      <body>{children}</body>
    </html>
  );
}
