import type { Metadata } from "next";
import "./globals.css";
import AppNav from "@/components/AppNav";

export const metadata: Metadata = {
  title: "STORKS Performance Hub",
  description: "神戸ストークス パフォーマンスチーム データ管理",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&family=JetBrains+Mono:wght@400;600;700&display=swap"
        />
      </head>
      <body>
        <AppNav />
        <div className="app-body">
          <header className="topbar">
            <div className="logo">KS</div>
            <div>
              <h1>STORKS Performance Hub</h1>
              <div className="sub">神戸ストークス パフォーマンスチーム データ管理</div>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
