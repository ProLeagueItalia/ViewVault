"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

export type RankingScope =
  | "friends"
  | "country"
  | "world";

type RankingMediaType = "movie" | "tv";

export type RankingItem = {
  rank: number;
  tmdbId: number;
  mediaType: RankingMediaType;
  title: string;
  year: string;
  posterUrl: string;
  totalViews: number | null;
  uniqueViewers: number;
  equivalentViews: number | null;
  episodeViews: number | null;
};

type RankingsSectionProps = {
  isLoggedIn: boolean;
  countryCode: string | null;
  movieRankings: Record<
    RankingScope,
    RankingItem[]
  >;
  seriesRankings: Record<
    RankingScope,
    RankingItem[]
  >;
  errorMessage?: string;
};

export default function RankingsSection({
  isLoggedIn,
  countryCode,
  movieRankings,
  seriesRankings,
  errorMessage = "",
}: RankingsSectionProps) {
  const locale = useLocale();
  const t = useTranslations("RankingsSection");

  const [scope, setScope] =
    useState<RankingScope>("world");

  const [mediaType, setMediaType] =
    useState<RankingMediaType>("movie");

  const countryLabel =
    countryCode?.toUpperCase() === "IT"
      ? t("italy")
      : t("myCountry");

  const scopeOptions = useMemo(
    () => [
      {
        value: "friends" as const,
        label: t("friends"),
        icon: "👥",
      },
      {
        value: "country" as const,
        label: countryLabel,
        icon:
          countryCode?.toUpperCase() === "IT"
            ? "🇮🇹"
            : "🌐",
      },
      {
        value: "world" as const,
        label: t("world"),
        icon: "🌍",
      },
    ],
    [countryCode, countryLabel, t]
  );

  const currentItems =
    mediaType === "movie"
      ? movieRankings[scope]
      : seriesRankings[scope];

  return (
    <section className="mt-12 overflow-hidden rounded-[2rem] border border-zinc-800 bg-[#151515]">
      <div className="border-b border-zinc-800 p-7 md:p-9">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
              🏆 {t("viewVaultRankings")}
            </p>

            <h2 className="mt-2 text-3xl font-black text-white">
              {t("mostWatchedTitles")}
            </h2>

            <p className="mt-3 max-w-3xl leading-7 text-zinc-400">
              {t("description")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMediaType("movie")}
              className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                mediaType === "movie"
                  ? "bg-[#7C3AED] text-white"
                  : "border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-[#7C3AED]/60"
              }`}
            >
              🎬 {t("movies")}
            </button>

            <button
              type="button"
              onClick={() => setMediaType("tv")}
              className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                mediaType === "tv"
                  ? "bg-[#7C3AED] text-white"
                  : "border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-[#7C3AED]/60"
              }`}
            >
              📺 {t("tvSeries")}
            </button>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-2">
          {scopeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setScope(option.value)}
              className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
                scope === option.value
                  ? "border border-[#A78BFA]/50 bg-[#7C3AED]/20 text-[#DDD6FE]"
                  : "border border-zinc-800 bg-black/20 text-zinc-400 hover:border-zinc-700 hover:text-white"
              }`}
            >
              {option.icon} {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-7 md:p-9">
        {!isLoggedIn ? (
          <div className="rounded-3xl border border-dashed border-zinc-700 bg-black/20 px-6 py-12 text-center">
            <p className="text-4xl">🔐</p>

            <h3 className="mt-4 text-xl font-bold text-white">
              {t("loginToSeeRankings")}
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-zinc-400">
              {t("loginDescription")}
            </p>
          </div>
        ) : errorMessage && currentItems.length === 0 ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 px-6 py-10 text-center text-red-300">
            {errorMessage}
          </div>
        ) : currentItems.length === 0 ? (
          <EmptyRanking
            scope={scope}
            mediaType={mediaType}
          />
        ) : (
          <div className="space-y-3">
            {currentItems.map((item) => (
              <RankingRow
                key={`${item.mediaType}-${item.tmdbId}`}
                item={item}
                locale={locale}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function RankingRow({
  item,
  locale,
}: {
  item: RankingItem;
  locale: string;
}) {
  const t = useTranslations("RankingsSection");

  const href =
    item.mediaType === "movie"
      ? `/film/${item.tmdbId}`
      : `/serie/${item.tmdbId}`;

  const medal =
    item.rank === 1
      ? "🥇"
      : item.rank === 2
        ? "🥈"
        : item.rank === 3
          ? "🥉"
          : `#${item.rank}`;

  return (
    <Link
      href={href}
      className="group grid grid-cols-[56px_72px_1fr] items-center gap-4 rounded-2xl border border-zinc-800 bg-[#18181B] p-3 transition hover:border-[#7C3AED]/60 hover:bg-[#1D1D22] md:grid-cols-[70px_84px_1fr_auto]"
    >
      <div className="text-center text-xl font-black text-white md:text-2xl">
        {medal}
      </div>

      <img
        src={item.posterUrl}
        alt={item.title}
        className="aspect-[2/3] w-full rounded-xl object-cover"
      />

      <div className="min-w-0">
        <h3 className="truncate text-base font-bold text-white transition group-hover:text-[#C4B5FD] md:text-lg">
          {item.title}
        </h3>

        <p className="mt-1 text-sm text-zinc-500">
          {item.year}
        </p>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-zinc-400 md:hidden">
          <RankingMetrics
            item={item}
            locale={locale}
          />
        </div>
      </div>

      <div className="hidden min-w-[220px] text-right md:block">
        <div className="flex flex-col gap-1 text-sm font-semibold text-zinc-300">
          <RankingMetrics
            item={item}
            locale={locale}
          />
        </div>
      </div>
    </Link>
  );
}

function RankingMetrics({
  item,
  locale,
}: {
  item: RankingItem;
  locale: string;
}) {
  const t = useTranslations("RankingsSection");

  if (item.mediaType === "movie") {
    return (
      <>
        <span>
          👁️ {t("views", {
            count: item.totalViews ?? 0,
          })}
        </span>

        <span>
          👥 {t("users", {
            count: item.uniqueViewers,
          })}
        </span>
      </>
    );
  }

  return (
    <>
      <span>
        🎞️ {t("equivalentViews", {
          count: formatEquivalentViews(
            item.equivalentViews ?? 0,
            locale
          ),
        })}
      </span>

      <span>
        🍿 {t("episodeViews", {
          count: item.episodeViews ?? 0,
        })}
      </span>

      <span>
        👥 {t("users", {
          count: item.uniqueViewers,
        })}
      </span>
    </>
  );
}

function EmptyRanking({
  scope,
  mediaType,
}: {
  scope: RankingScope;
  mediaType: RankingMediaType;
}) {
  const t = useTranslations("RankingsSection");

  const title =
    scope === "friends"
      ? t("emptyFriendsTitle")
      : scope === "country"
        ? t("emptyCountryTitle")
        : t("emptyWorldTitle");

  const description =
    scope === "friends"
      ? t("emptyFriendsDescription")
      : mediaType === "movie"
        ? t("emptyMoviesDescription")
        : t("emptySeriesDescription");

  return (
    <div className="rounded-3xl border border-dashed border-zinc-700 bg-black/20 px-6 py-12 text-center">
      <p className="text-4xl">📊</p>

      <h3 className="mt-4 text-xl font-bold text-white">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-xl leading-7 text-zinc-400">
        {description}
      </p>
    </div>
  );
}

function formatEquivalentViews(
  value: number,
  locale: string
) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
