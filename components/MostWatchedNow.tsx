import Link from "next/link";
import {
  getLocale,
  getTranslations,
} from "next-intl/server";

import {
  getPosterUrl,
  getTrendingAll,
  type TMDBTrendingItem,
} from "../lib/tmdb";

import { getTmdbLanguage } from "../i18n/config";

const MAX_ITEMS = 10;

export default async function MostWatchedNow() {
  const t = await getTranslations("MostWatchedNow");
  const locale = await getLocale();

  const tmdbLanguage = getTmdbLanguage(locale);

  let items: TMDBTrendingItem[] = [];

  try {
    const trending = await getTrendingAll(
      tmdbLanguage
    );

    items = trending
      .filter(
        (item) =>
          item.media_type === "movie" ||
          item.media_type === "tv"
      )
      .slice(0, MAX_ITEMS);
  } catch (error) {
    console.error(
      "Errore nel recupero dei contenuti più visti del momento:",
      error
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto mt-14 max-w-7xl px-6">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
            {t("eyebrow")}
          </p>

          <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">
            🔥 {t("title")}
          </h2>

          <p className="mt-3 max-w-2xl text-zinc-400">
            {t("description")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item, index) => (
          <TrendingCard
            key={`${item.media_type}-${item.id}`}
            item={item}
            position={index + 1}
            movieLabel={t("movie")}
            seriesLabel={t("series")}
            notAvailableLabel={t("notAvailable")}
          />
        ))}
      </div>
    </section>
  );
}

function TrendingCard({
  item,
  position,
  movieLabel,
  seriesLabel,
  notAvailableLabel,
}: {
  item: TMDBTrendingItem;
  position: number;
  movieLabel: string;
  seriesLabel: string;
  notAvailableLabel: string;
}) {
  const href =
    item.media_type === "movie"
      ? `/film/${item.id}`
      : `/serie/${item.id}`;

  const posterUrl = getPosterUrl(
    item.poster_path
  );

  const year = item.date
    ? item.date.slice(0, 4)
    : notAvailableLabel;

  const mediaLabel =
    item.media_type === "movie"
      ? `🎬 ${movieLabel}`
      : `📺 ${seriesLabel}`;

  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-[#18181B] transition hover:-translate-y-1 hover:border-[#7C3AED]/70"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-zinc-900">
        <img
          src={posterUrl}
          alt={item.title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

        <div className="absolute left-3 top-3 flex h-10 min-w-10 items-center justify-center rounded-full bg-black/80 px-3 text-sm font-black text-white backdrop-blur-sm">
          #{position}
        </div>

        <div className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/75 px-3 py-1 text-[10px] font-black tracking-wider text-white backdrop-blur-sm">
          {mediaLabel}
        </div>

        {item.vote_average > 0 && (
          <div className="absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-1 text-xs font-bold text-yellow-300 backdrop-blur-sm">
            ⭐{" "}
            {item.vote_average.toFixed(1)}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="line-clamp-2 min-h-[3rem] font-bold text-white transition group-hover:text-[#C4B5FD]">
          {item.title}
        </h3>

        <p className="mt-2 text-sm text-zinc-500">
          {year}
        </p>
      </div>
    </Link>
  );
}