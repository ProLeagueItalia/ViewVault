import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-800 bg-[#0F0F0F]">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          {/* BRAND */}
          <div>
            <Link
              href="/"
              className="inline-block text-2xl font-bold text-white"
            >
              View
              <span className="text-[#8B5CF6]">
                Vault
              </span>
            </Link>

            <p className="mt-2 text-sm text-zinc-500">
              Every Story. Every Screen. One Vault.
            </p>
          </div>

          {/* LINK LEGALI */}
          <nav
            aria-label="Link legali"
            className="flex flex-wrap gap-x-6 gap-y-3 text-sm"
          >
            <Link
              href="/privacy"
              className="text-zinc-400 transition hover:text-[#A78BFA]"
            >
              Privacy Policy
            </Link>

            <Link
              href="/cookies"
              className="text-zinc-400 transition hover:text-[#A78BFA]"
            >
              Cookie Policy
            </Link>

            <Link
              href="/terms"
              className="text-zinc-400 transition hover:text-[#A78BFA]"
            >
              Termini d&apos;Uso
            </Link>

            <Link
              href="/credits"
              className="text-zinc-400 transition hover:text-[#A78BFA]"
            >
              Credits
            </Link>
          </nav>
        </div>

        <div className="mt-8 border-t border-zinc-800 pt-6">
          <div className="flex flex-col gap-3 text-sm text-zinc-500 md:flex-row md:items-center md:justify-between">
            <p>
              © 2026 ViewVault. Tutti i diritti riservati.
            </p>

            <a
              href="mailto:info@viewvault.it"
              className="transition hover:text-[#A78BFA]"
            >
              info@viewvault.it
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}