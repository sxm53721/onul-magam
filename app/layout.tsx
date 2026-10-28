import type { Metadata, Viewport } from "next";
import BottomNav from "@/components/BottomNav";
import RegisterSW from "@/components/RegisterSW";
import "./globals.css";

export const metadata: Metadata = {
  title: "오늘마감 — 영종도 마감할인",
  description: "영종도 동네 횟집·과일·채소·빵·떡집의 오늘 마감할인을 알림으로 받아보세요.",
  appleWebApp: { capable: true, title: "오늘마감", statusBarStyle: "default" },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf6ef",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-dvh">
        <div className="mx-auto max-w-md min-h-dvh safe-bottom">{children}</div>
        <BottomNav />
        <RegisterSW />
      </body>
    </html>
  );
}
