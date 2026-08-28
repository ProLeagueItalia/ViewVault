import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

const supportedLocales = [
  "it",
  "en",
  "es",
  "fr",
  "de",
] as const;

type SupportedLocale =
  (typeof supportedLocales)[number];

function isSupportedLocale(
  locale: string | undefined
): locale is SupportedLocale {
  return supportedLocales.includes(
    locale as SupportedLocale
  );
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();

  const savedLocale =
    cookieStore.get("NEXT_LOCALE")?.value;

  const locale = isSupportedLocale(savedLocale)
    ? savedLocale
    : "it";

  return {
    locale,
    messages: (
      await import(`../messages/${locale}.json`)
    ).default,
  };
});