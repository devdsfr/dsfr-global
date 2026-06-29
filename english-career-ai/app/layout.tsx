import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "English Career AI - Get Your International Dev Job",
  description: "AI-powered English learning platform built around your target international job.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
