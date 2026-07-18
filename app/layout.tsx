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
      <body className="min-h-screen flex flex-col">
        <header className="app-header">
          <div className="logo">KS</div>
          <div>
            <h1>STORKS Performance Hub</h1>
            <div className="sub">神戸ストークス パフォーマンスチーム データ管理</div>
          </div>
        </header>
        <AppNav />
        <main className="flex-1 w-full">{children}</main>
      </body>
    </html>
  );
}
