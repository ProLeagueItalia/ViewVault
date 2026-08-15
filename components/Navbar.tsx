"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import NotificationBell from "./NotificationBell";
import LoginButton from "./LoginButton";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#0D0D0D]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* LOGO */}
        <Link
          href="/"
          onClick={closeMobileMenu}
          className="flex min-w-0 shrink items-center transition duration-300 hover:opacity-90 xl:shrink-0 xl:hover:scale-[1.02]"
          aria-label="Torna alla Home di ViewVault"
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
            Home
          </Link>

          <Link
            href="/film"
            className="transition hover:text-[#A78BFA]"
          >
            Film
          </Link>

          <Link
            href="/serie-tv"
            className="transition hover:text-[#A78BFA]"
          >
            Serie TV
          </Link>

          <Link
            href="/vault"
            className="transition hover:text-[#A78BFA]"
          >
            Il mio Vault
          </Link>

          <Link
            href="/dashboard"
            className="transition hover:text-[#A78BFA]"
          >
            Dashboard
          </Link>

          <Link
            href="/community"
            className="transition hover:text-[#A78BFA]"
          >
            Community
          </Link>
        </nav>

        {/* LATO DESTRO */}
        <div className="flex shrink-0 items-center gap-2 xl:gap-3">
          {/* UNA SOLA CAMPANELLA */}
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
                ? "Chiudi menu"
                : "Apri menu"
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
              🏠 Home
            </Link>

            <Link
              href="/film"
              onClick={closeMobileMenu}
              className="rounded-xl px-4 py-3.5 font-semibold text-zinc-200 transition hover:bg-zinc-900 hover:text-[#A78BFA]"
            >
              🎬 Film
            </Link>

            <Link
              href="/serie-tv"
              onClick={closeMobileMenu}
              className="rounded-xl px-4 py-3.5 font-semibold text-zinc-200 transition hover:bg-zinc-900 hover:text-[#A78BFA]"
            >
              📺 Serie TV
            </Link>

            <Link
              href="/vault"
              onClick={closeMobileMenu}
              className="rounded-xl px-4 py-3.5 font-semibold text-zinc-200 transition hover:bg-zinc-900 hover:text-[#A78BFA]"
            >
              🎞️ Il mio Vault
            </Link>

            <Link
              href="/dashboard"
              onClick={closeMobileMenu}
              className="rounded-xl px-4 py-3.5 font-semibold text-zinc-200 transition hover:bg-zinc-900 hover:text-[#A78BFA]"
            >
              📊 Dashboard
            </Link>

            <Link
              href="/community"
              onClick={closeMobileMenu}
              className="rounded-xl px-4 py-3.5 font-semibold text-zinc-200 transition hover:bg-zinc-900 hover:text-[#A78BFA]"
            >
              👥 Community
            </Link>
          </nav>

          {/* ACCOUNT */}
          <div className="mx-auto mt-3 max-w-7xl border-t border-zinc-800 pt-4">
            <p className="mb-3 px-4 text-xs font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
              Account
            </p>

            <div className="px-2 [&_a]:!block">
              <LoginButton />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}