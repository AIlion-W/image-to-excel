import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "产品图片 → Excel | Image to Excel",
  description: "上传产品图片，AI 自动识别货号、容量、单价、尺码，一键生成 Excel 表格",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
