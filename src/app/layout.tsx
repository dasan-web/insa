import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "다산 인사정보시스템 (HRMS)",
  description: "임직원 인사정보 관리 시스템 - 조회, 등록, 수정, 삭제 및 엑셀 다운로드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
