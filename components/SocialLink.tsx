"use client";

import type { ReactNode } from "react";

type SocialPlatform = "instagram" | "facebook";

type SocialLinkProps = {
  platform: SocialPlatform;
  href: string;
  label?: string;
  location: "footer" | "community";
  variant?: "icon" | "button";
  className?: string;
  children?: ReactNode;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function trackSocialClick(
  platform: SocialPlatform,
  location: "footer" | "community"
) {
  window.gtag?.("event", "social_click", {
    platform,
    location,
  });
}

function InstagramLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
    >
      <defs>
        <linearGradient
          id="instagram-gradient"
          x1="2"
          y1="22"
          x2="22"
          y2="2"
        >
          <stop offset="0%" stopColor="#FFDC80" />
          <stop offset="25%" stopColor="#FCAF45" />
          <stop offset="50%" stopColor="#F77737" />
          <stop offset="70%" stopColor="#E1306C" />
          <stop offset="85%" stopColor="#C13584" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>

      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="5.5"
        stroke="url(#instagram-gradient)"
        strokeWidth="2.3"
      />

      <circle
        cx="12"
        cy="12"
        r="4.2"
        stroke="url(#instagram-gradient)"
        strokeWidth="2.3"
      />

      <circle
        cx="17.5"
        cy="6.6"
        r="1.35"
        fill="url(#instagram-gradient)"
      />
    </svg>
  );
}

function FacebookLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="11" fill="#1877F2" />

      <path
        d="M13.55 20v-7h2.35l.35-2.73h-2.7V8.53c0-.79.22-1.33 1.36-1.33h1.45V4.76c-.25-.03-1.11-.11-2.11-.11-2.09 0-3.52 1.27-3.52 3.62v2h-2.36V13h2.36v7h2.82Z"
        fill="white"
      />
    </svg>
  );
}

export default function SocialLink({
  platform,
  href,
  label,
  location,
  variant = "icon",
  className = "",
}: SocialLinkProps) {
  const accessibleLabel =
    label ??
    (platform === "instagram"
      ? "Instagram ViewVault"
      : "Facebook ViewVault");

  const icon =
    platform === "instagram" ? (
      <InstagramLogo />
    ) : (
      <FacebookLogo />
    );

  if (variant === "button") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() =>
          trackSocialClick(platform, location)
        }
        aria-label={accessibleLabel}
        className={`inline-flex items-center justify-center gap-3 rounded-full border border-zinc-700 bg-black/20 px-5 py-3 font-semibold text-zinc-200 transition hover:border-[#8B5CF6] hover:bg-[#8B5CF6]/10 hover:text-white ${className}`}
      >
        {icon}
        <span>{accessibleLabel}</span>
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() =>
        trackSocialClick(platform, location)
      }
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/70 transition hover:scale-105 hover:border-[#8B5CF6] hover:bg-[#8B5CF6]/10 ${className}`}
    >
      {icon}
    </a>
  );
}
