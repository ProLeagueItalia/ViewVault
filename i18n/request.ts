import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import {
  defaultLocale,
  isSupportedLocale,
} from "./config";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();

  const savedLocale =
    cookieStore.get("NEXT_LOCALE")?.value;

  const locale = isSupportedLocale(savedLocale)
    ? savedLocale
    : defaultLocale;

  return {
    locale,
    messages: (
      await import(`../messages/${locale}.json`)
    ).default,
  };
});