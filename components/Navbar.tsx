"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

import LanguageSwitcher from "./LanguageSwitcher";
import NotificationBell from "./NotificationBell";
import LoginButton from "./LoginButton";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const t = useTranslations("Navbar");

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <>
      {/* SPAZIO RISERVATO ALLA NAVBAR FISSA */}
      <div className="h-20" aria-hidden="true" />

      <header className="fixed left-0 right-0 top-0 z-[100] border-b border-zinc-800/80 bg-[#0D0D0D]/95 shadow-lg shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          {/* LOGO */}
          <Link
            href="/"
            onClick={closeMobileMenu}
            className="flex min-w-0 shrink items-center transition duration-300 hover:opacity-90 xl:shrink-0 xl:hover:scale-[1.02]"
            aria-label={t("backHome")}
          >
            <Image
              src="/viewvault-logo-new.png"
              alt="ViewVault"
              width={250}
              height={80}
              priority
              className="h-auto w-[145px] object-contain sm:w-[180px] md:w-[200px] xl:w-[220px]"
            />
          </Link>

          {/* NAVIGAZIONE DESKTOP */}
          <nav className="hidden items-center gap-6 text-sm font-semibold text-zinc-300 xl:flex">
            <Link
              href="/"
              className="transition hover:text-[#A78BFA]"
            >
              {t("home")}
            </Link>

            <Link
              href="/film"
              className="transition hover:text-[#A78BFA]"
            >
              {t("movies")}
            </Link>

            <Link
              href="/serie-tv"
              className="transition hover:text-[#A78BFA]"
            >
              {t("series")}
            </Link>

            <Link
              href="/vault"
              className="transition hover:text-[#A78BFA]"
            >
              {t("vault")}
            </Link>

            <Link
              href="/dashboard"
              className="transition hover:text-[#A78BFA]"
            >
              {t("dashboard")}
            </Link>

            <Link
              href="/community"
              className="transition hover:text-[#A78BFA]"
            >
              {t("community")}
            </Link>
          </nav>

          {/* LATO DESTRO */}
          <div className="flex shrink-0 items-center gap-2 xl:gap-3">
            {/* SELETTORE LINGUA */}
            <LanguageSwitcher />

            {/* CAMPANELLA */}
            <NotificationBell />

            {/* ACCOUNT DESKTOP */}
            <div className="hidden xl:block">
              <LoginButton />
            </div>

            {/* MENU MOBILE / TABLET */}
            <button
              type="button"
              onClick={() =>
                setMobileMenuOpen(
                  (current) => !current
                )
              }
              aria-label={
                mobileMenuOpen
                  ? t("closeMenu")
                  : t("openMenu")
              }
              aria-expanded={mobileMenuOpen}
              aria-controls="viewvault-mobile-menu"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/80 text-white transition hover:border-[#7C3AED] hover:bg-[#7C3AED]/10 xl:hidden"
            >
              {mobileMenuOpen ? (
                <span className="text-2xl leading-none">
                  ×
                </span>
              ) : (
                <span
                  className="flex flex-col gap-[5px]"
                  aria-hidden="true"
                >
                  <span className="block h-[2px] w-5 rounded-full bg-white" />
                  <span className="block h-[2px] w-5 rounded-full bg-white" />
                  <span className="block h-[2px] w-5 rounded-full bg-white" />
                </span>
              )}
            </button>
          </div>
        </div>

        {/* MENU MOBILE / TABLET */}
        {mobileMenuOpen && (
          <div
            id="viewvault-mobile-menu"
            className="border-t border-zinc-800 bg-[#0D0D0D] px-4 pb-5 pt-3 shadow-2xl xl:hidden"
          >
            <nav className="mx-auto flex max-w-7xl flex-col">
              <Link
                href="/"
                onClick={closeMobileMenu}
                className="rounded-xl px-4 py-3.5 font-semibold text-zinc-200 transition hover:bg-zinc-900 hover:text-[#A78BFA]"
              >
                🏠 {t("home")}
              </Link>

              <Link
                href="/film"
                onClick={closeMobileMenu}
                className="rounded-xl px-4 py-3.5 font-semibold text-zinc-200 transition hover:bg-zinc-900 hover:text-[#A78BFA]"
              >
                🎬 {t("movies")}
              </Link>

              <Link
                href="/serie-tv"
                onClick={closeMobileMenu}
                className="rounded-xl px-4 py-3.5 font-semibold text-zinc-200 transition hover:bg-zinc-900 hover:text-[#A78BFA]"
              >
                📺 {t("series")}
              </Link>

              <Link
                href="/vault"
                onClick={closeMobileMenu}
                className="rounded-xl px-4 py-3.5 font-semibold text-zinc-200 transition hover:bg-zinc-900 hover:text-[#A78BFA]"
              >
                🎞️ {t("vault")}
              </Link>

              <Link
                href="/dashboard"
                onClick={closeMobileMenu}
                className="rounded-xl px-4 py-3.5 font-semibold text-zinc-200 transition hover:bg-zinc-900 hover:text-[#A78BFA]"
              >
                📊 {t("dashboard")}
              </Link>

              <Link
                href="/community"
                onClick={closeMobileMenu}
                className="rounded-xl px-4 py-3.5 font-semibold text-zinc-200 transition hover:bg-zinc-900 hover:text-[#A78BFA]"
              >
                👥 {t("community")}
              </Link>
            </nav>

            {/* ACCOUNT */}
            <div className="mx-auto mt-3 max-w-7xl border-t border-zinc-800 pt-4">
              <p className="mb-3 px-4 text-xs font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
                {t("account")}
              </p>

              <div className="px-2 [&_a]:!block">
                <LoginButton />
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}