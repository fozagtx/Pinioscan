import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Pinioscan — AI Token Safety on Base",
    template: "%s | Pinioscan",
  },
  description: "Paste any Base token address. Get an AI safety score backed by on-chain attestation. No more blindly aping into rugs.",
  metadataBase: new URL("https://pinioscan.xyz"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: '/manifest.json',
  openGraph: {
    title: "Pinioscan — AI Token Safety on Base",
    description: "Paste any Base token address. Get an AI safety score backed by on-chain attestation. No more blindly aping into rugs.",
    siteName: "Pinioscan",
    url: "https://pinioscan.xyz",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Pinioscan — AI Token Safety on Base" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pinioscan — AI Token Safety on Base",
    description: "AI-powered token safety for Base — backed by on-chain attestation",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#050507] bg-grid min-h-screen flex flex-col`}
      >
        <Header />
        <main className="flex-1 flex flex-col overflow-x-hidden">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
