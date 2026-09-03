"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CONSENT_COOKIE_NAME = "viewvault_cookie_consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

type ConsentChoice = "accepted" | "rejected";

function getCookieValue(name: string) {
  if (typeof document === "undefined") return null;

  for (const cookie of document.cookie.split("; ")) {
    const [cookieName, ...valueParts] = cookie.split("=");
    if (cookieName === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
}

export default function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const currentChoice = getCookieValue(CONSENT_COOKIE_NAME);

    if (currentChoice !== "accepted" && currentChoice !== "rejected") {
      setIsVisible(true);
    }
  }, []);

  function saveChoice(choice: ConsentChoice) {
    document.cookie =
      `${CONSENT_COOKIE_NAME}=${choice}; ` +
      `Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax`;

    setIsVisible(false);

    window.dispatchEvent(
      new Event("viewvault-cookie-consent-changed")
    );
  }

  if (!isVisible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[10000] p-4 sm:p-6">
      <div className="mx-auto max-w-5xl rounded-3xl border border-zinc-700 bg-[#181818]/95 p-5 shadow-[0_0_60px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
              Privacy e cookie
            </p>

            <p className="mt-2 text-sm leading-6 text-zinc-300 sm:text-base">
              ViewVault utilizza cookie tecnici necessari al funzionamento
              del servizio. Con il tuo consenso, utilizziamo anche Google
              Analytics per capire come viene usato ViewVault e migliorare
              il progetto.
            </p>

            <Link
              href="/cookies"
              className="mt-3 inline-block text-sm font-semibold text-[#A78BFA] transition hover:text-white"
            >
              Leggi la Cookie Policy
            </Link>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => saveChoice("rejected")}
              className="rounded-full border border-zinc-600 px-5 py-3 text-sm font-bold text-zinc-200 transition hover:border-zinc-400 hover:bg-zinc-800"
            >
              Rifiuta analytics
            </button>

            <button
              type="button"
              onClick={() => saveChoice("accepted")}
              className="rounded-full bg-[#7C3AED] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#6D28D9]"
            >
              Accetta analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
