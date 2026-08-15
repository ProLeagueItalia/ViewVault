import Image from "next/image";
import Link from "next/link";

import NotificationBell from "./NotificationBell";
import LoginButton from "./LoginButton";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#0D0D0D]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center transition duration-300 hover:scale-[1.02] hover:opacity-90"
          aria-label="Torna alla Home di ViewVault"
        >
          <Image
            src="/viewvault-logo-new.png"
            alt="ViewVault"
            width={250}
            height={80}
            priority
            className="h-auto w-[180px] object-contain md:w-[220px]"
          />
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

          <Link
            href="/community"
            className="transition hover:text-[#A78BFA]"
          >
            Community
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <NotificationBell />
          <LoginButton />
        </div>
      </div>
    </header>
  );
}