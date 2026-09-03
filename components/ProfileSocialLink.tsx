"use client";

type ProfileSocialPlatform =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "x"
  | "telegram";

type ProfileSocialLinkProps = {
  platform: ProfileSocialPlatform;
  href: string;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function trackProfileSocialClick(platform: ProfileSocialPlatform) {
  window.gtag?.("event", "profile_social_click", {
    platform,
  });
}

function SocialIcon({
  platform,
}: {
  platform: ProfileSocialPlatform;
}) {
  if (platform === "instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
        <defs>
          <linearGradient id="profile-instagram-gradient" x1="2" y1="22" x2="22" y2="2">
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
          stroke="url(#profile-instagram-gradient)"
          strokeWidth="2.3"
        />
        <circle
          cx="12"
          cy="12"
          r="4.2"
          stroke="url(#profile-instagram-gradient)"
          strokeWidth="2.3"
        />
        <circle
          cx="17.5"
          cy="6.6"
          r="1.35"
          fill="url(#profile-instagram-gradient)"
        />
      </svg>
    );
  }

  if (platform === "facebook") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <circle cx="12" cy="12" r="11" fill="#1877F2" />
        <path
          d="M13.55 20v-7h2.35l.35-2.73h-2.7V8.53c0-.79.22-1.33 1.36-1.33h1.45V4.76c-.25-.03-1.11-.11-2.11-.11-2.09 0-3.52 1.27-3.52 3.62v2h-2.36V13h2.36v7h2.82Z"
          fill="white"
        />
      </svg>
    );
  }

  if (platform === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
        <path d="M15.4 3c.3 1.8 1.3 3 3.1 3.6V9c-1.2 0-2.3-.4-3.2-1.1v6.3a5.2 5.2 0 1 1-4.5-5.1v2.6a2.7 2.7 0 1 0 2 2.6V3h2.6Z" />
      </svg>
    );
  }

  if (platform === "x") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
        <path d="M18.9 3H22l-6.8 7.8L23 21h-6.1l-4.8-6.3L6.6 21H3.5l7.2-8.2L3.2 3h6.2l4.3 5.7L18.9 3Zm-1.1 16h1.7L8.5 4.9H6.7L17.8 19Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M21.6 3.5 18.4 19c-.2 1.1-.9 1.4-1.8.9l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6 12.8l-4.8-1.5c-1-.3-1.1-1 .2-1.5L20.1 2.6c.9-.3 1.7.2 1.5.9Z" />
    </svg>
  );
}

const LABELS: Record<ProfileSocialPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  x: "X",
  telegram: "Telegram",
};

export default function ProfileSocialLink({
  platform,
  href,
}: ProfileSocialLinkProps) {
  const label = LABELS[platform];

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackProfileSocialClick(platform)}
      aria-label={label}
      title={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/70 text-white transition hover:scale-105 hover:border-[#8B5CF6] hover:bg-[#8B5CF6]/10"
    >
      <SocialIcon platform={platform} />
    </a>
  );
}
