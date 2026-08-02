import Link from "next/link";
import LoginButton from "./LoginButton";

export default function Navbar() {
  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-zinc-800 bg-[#121212]/80 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-8">
        <Link href="/" className="text-3xl font-bold tracking-tight">
          View<span className="text-[#7C3AED]">Vault</span>
        </Link>

        <nav className="hidden gap-8 text-lg md:flex">
          <Link href="/" className="transition hover:text-[#7C3AED]">
            Home
          </Link>

          <Link href="/film" className="transition hover:text-[#7C3AED]">
            Film
          </Link>

          <Link href="/serie-tv" className="transition hover:text-[#7C3AED]">
            Serie TV
          </Link>

          <Link href="/vault" className="transition hover:text-[#7C3AED]">
            Il mio Vault
          </Link>

          <Link href="/dashboard" className="transition hover:text-[#7C3AED]">
            Statistiche
          </Link>
        </nav>

        <LoginButton />
      </div>
    </header>
  );
}