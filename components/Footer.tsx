import Link from "next/link";
import { useTranslations } from "next-intl";

import SocialLink from "./SocialLink";

export default function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer className="mt-auto border-t border-zinc-800 bg-[#0F0F0F]">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          {/* BRAND + SOCIAL */}
          <div>
            <Link
              href="/"
              className="inline-block text-2xl font-bold text-white"
            >
              View
              <span className="text-[#8B5CF6]">Vault</span>
            </Link>

            <p className="mt-2 text-sm text-zinc-500">
              Every Story. Every Screen. One Vault.
            </p>

            <div className="mt-5 flex items-center gap-3">
              <SocialLink
                href="https://www.instagram.com/viewvault.italia?igsi=cnVwN2FydGtjOWM5"
                platform="instagram"
                location="footer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/80 text-lg font-bold text-zinc-300 transition hover:border-[#A78BFA] hover:bg-[#7C3AED]/15 hover:text-white"
              >
                <span aria-hidden="true">◎</span>
              </SocialLink>

              <SocialLink
                href="https://www.facebook.com/profile.php?id=61593552534107"
                platform="facebook"
                location="footer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/80 text-lg font-black text-zinc-300 transition hover:border-[#A78BFA] hover:bg-[#7C3AED]/15 hover:text-white"
              >
                <span aria-hidden="true">f</span>
              </SocialLink>
            </div>
          </div>

          {/* LINK LEGALI */}
          <nav
            aria-label={t("legalLinks")}
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
              {t("terms")}
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
              © 2026 ViewVault. {t("copyright")}
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
