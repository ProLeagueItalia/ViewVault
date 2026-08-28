"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

type Locale = "it" | "en" | "es" | "fr" | "de";

const languages: {
  code: Locale;
  label: string;
}[] = [
  {
    code: "it",
    label: "IT",
  },
  {
    code: "en",
    label: "EN",
  },
  {
    code: "es",
    label: "ES",
  },
  {
    code: "fr",
    label: "FR",
  },
  {
    code: "de",
    label: "DE",
  },
];

function isLocale(value: string): value is Locale {
  return ["it", "en", "es", "fr", "de"].includes(value);
}

export default function LanguageSwitcher() {
  const router = useRouter();
  const currentLocale = useLocale();

  const locale: Locale = isLocale(currentLocale)
    ? currentLocale
    : "it";

  function changeLanguage(newLocale: Locale) {
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
          changeLanguage(event.target.value as Locale)
        }
        className="h-11 cursor-pointer rounded-full border border-zinc-700 bg-[#151515] px-3 text-sm font-semibold text-zinc-200 outline-none transition hover:border-[#7C3AED] focus:border-[#7C3AED]"
        aria-label="Seleziona lingua"
      >
        {languages.map((language) => (
          <option
            key={language.code}
            value={language.code}
          >
            {language.label}
          </option>
        ))}
      </select>
    </div>
  );
}