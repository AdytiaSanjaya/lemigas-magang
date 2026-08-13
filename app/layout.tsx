import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "@/components/providers";
import "./globals.css";

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
    default: "LEMIGAS Magang",
    template: "%s | LEMIGAS Magang",
  },
  description:
    "Sistem Pendaftaran & Manajemen Data Peserta Magang/PKL Balai Besar Pengujian Minyak dan Gas Bumi (LEMIGAS).",
  icons: {
    icon: "/logo-lemigas.png",
    shortcut: "/logo-lemigas.png",
    apple: "/logo-lemigas.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}