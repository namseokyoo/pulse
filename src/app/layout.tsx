import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse — 이 글은 아직 살아있다",
  description: "모든 글에는 맥박이 있다. 사랑받으면 더 오래 살고, 외면당하면 사라진다.",
  keywords: ["커뮤니티", "익명 게시판", "실시간", "생명력"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
