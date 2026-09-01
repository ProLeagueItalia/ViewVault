"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

import {
  defaultLocale,
  isSupportedLocale,
  localeLabels,
  supportedLocales,
  type SupportedLocale,
} from "../i18n/config";

export default function LanguageSwitcher() {
  const router = useRouter();
  const currentLocale = useLocale();

  const locale: SupportedLocale =
    isSupportedLocale(currentLocale)
      ? currentLocale
      : defaultLocale;

  function changeLanguage(
    newLocale: SupportedLocale
  ) {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

    router.refresh();
  }

  return (
    <div className="relative">
      <label
        htmlFor="language-switcher"
        className="sr-only"
      >
        Seleziona lingua
      </label>

      <select
        id="language-switcher"
        value={locale}
        onChange={(event) =>
          changeLanguage(
            event.target.value as SupportedLocale
          )
        }
        className="h-11 cursor-pointer rounded-full border border-zinc-700 bg-[#151515] px-3 text-sm font-semibold text-zinc-200 outline-none transition hover:border-[#7C3AED] focus:border-[#7C3AED]"
        aria-label="Seleziona lingua"
      >
        {supportedLocales.map((language) => (
          <option
            key={language}
            value={language}
          >
            {localeLabels[language]}
          </option>
        ))}
      </select>
    </div>
  );
}