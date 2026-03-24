import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from '@vercel/analytics/next';
import "./globals.css";

const pretendard = localFont({
  src: "../../public/fonts/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pulseup.cc"),
  title: {
    default: "PulseUp — 글에 생명력을 부여하다",
    template: "%s | PulseUp",
  },
  description: "모든 글에는 맥박이 있다. 사랑받으면 더 오래 살고, 외면당하면 사라진다.",
  keywords: ["커뮤니티", "익명 게시판", "실시간", "생명력", "PulseUp", "펄스업"],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "PulseUp",
    title: "PulseUp — 글에 생명력을 부여하다",
    description: "모든 글에는 맥박이 있다. 사랑받으면 더 오래 살고, 외면당하면 사라진다.",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "PulseUp — 글에 생명력을 부여하다",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PulseUp — 글에 생명력을 부여하다",
    description: "모든 글에는 맥박이 있다. 사랑받으면 더 오래 살고, 외면당하면 사라진다.",
    images: ["/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${pretendard.variable} dark`}>
      <body className="min-h-screen antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
