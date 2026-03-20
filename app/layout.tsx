import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cash Flow Simulator",
  description: "Personal cash flow simulation workspace"
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
