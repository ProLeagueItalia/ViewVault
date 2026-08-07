import Link from "next/link";

import LoginButton from "./LoginButton";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#0D0D0D]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-6">
        <Link
          href="/"
          className="shrink-0 text-2xl font-black tracking-tight transition hover:opacity-80 md:text-3xl"
          aria-label="Torna alla Home di ViewVault"
        >
          <span className="text-white">View</span>
          <span className="text-[#7C3AED]">Vault</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-zinc-300 lg:flex">
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
        </nav>

        <div className="shrink-0">
          <LoginButton />
        </div>
      </div>
    </header>
  );
}