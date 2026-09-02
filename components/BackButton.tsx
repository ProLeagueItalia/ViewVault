"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

type BackButtonProps = {
  fallbackHref?: string;
  label?: string;
};

export default function BackButton({
  fallbackHref = "/",
  label,
}: BackButtonProps) {
  const router = useRouter();
  const t = useTranslations("BackButton");

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={t("ariaLabel")}
      className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-5 py-3 text-sm font-semibold text-zinc-200 backdrop-blur-md transition hover:border-[#7C3AED] hover:bg-[#7C3AED]/10 hover:text-white focus:outline-none focus:ring-4 focus:ring-[#7C3AED]/20"
    >
      <span aria-hidden="true" className="text-lg leading-none">
        ←
      </span>

      <span>{label ?? t("back")}</span>
    </button>
  );
}
