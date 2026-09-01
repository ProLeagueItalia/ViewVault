export const supportedLocales = [
  "it",
  "en",
  "es",
  "fr",
  "de",
] as const;

export type SupportedLocale =
  (typeof supportedLocales)[number];

export const defaultLocale: SupportedLocale = "it";

export const localeLabels: Record<
  SupportedLocale,
  string
> = {
  it: "IT",
  en: "EN",
  es: "ES",
  fr: "FR",
  de: "DE",
};

export const tmdbLanguages: Record<
  SupportedLocale,
  string
> = {
  it: "it-IT",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
};

export function isSupportedLocale(
  locale: string | undefined | null
): locale is SupportedLocale {
  return supportedLocales.includes(
    locale as SupportedLocale
  );
}

export function getTmdbLanguage(
  locale: string | undefined | null
): string {
  if (!isSupportedLocale(locale)) {
    return tmdbLanguages[defaultLocale];
  }

  return tmdbLanguages[locale];
}