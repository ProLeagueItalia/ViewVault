"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const CONSENT_COOKIE_NAME = "viewvault_cookie_consent";
const GOOGLE_ANALYTICS_ID = "G-853TFGKHKC";

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

export default function GoogleAnalytics() {
  const [hasAnalyticsConsent, setHasAnalyticsConsent] = useState(false);

  useEffect(() => {
    function syncConsent() {
      setHasAnalyticsConsent(
        getCookieValue(CONSENT_COOKIE_NAME) === "accepted"
      );
    }

    syncConsent();

    window.addEventListener(
      "viewvault-cookie-consent-changed",
      syncConsent
    );

    return () => {
      window.removeEventListener(
        "viewvault-cookie-consent-changed",
        syncConsent
      );
    };
  }, []);

  if (!hasAnalyticsConsent) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
        strategy="afterInteractive"
      />

      <Script id="viewvault-google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GOOGLE_ANALYTICS_ID}', {
            anonymize_ip: true
          });
        `}
      </Script>
    </>
  );
}
