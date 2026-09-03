import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import "./globals.css";

import Footer from "../components/Footer";
import ScrollToTopButton from "../components/ScrollToTopButton";
import CookieConsentBanner from "../components/CookieConsentBanner";
import GoogleAnalytics from "../components/GoogleAnalytics";

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
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#121212]">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="flex min-h-screen flex-1 flex-col">
            {children}
          </div>

          <Footer />
          <ScrollToTopButton />
          <CookieConsentBanner />
          <GoogleAnalytics />
          <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
