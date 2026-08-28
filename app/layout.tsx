import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import "./globals.css";

import Footer from "../components/Footer";
import ScrollToTopButton from "../components/ScrollToTopButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ViewVault",
  description: "Every Story. Every Screen. One Vault.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();

  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#121212]">
        <NextIntlClientProvider messages={messages}>
          <div className="flex min-h-screen flex-1 flex-col">
            {children}
          </div>

          <Footer />

          <ScrollToTopButton />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}