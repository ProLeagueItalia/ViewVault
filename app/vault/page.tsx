import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getLocale,
  getTranslations,
} from "next-intl/server";

import AppHeader from "../../components/AppHeader";
import BackButton from "../../components/BackButton";
import VaultLibrary, {
  type VaultMediaItem,
} from "../../components/VaultLibrary";

import { createClient } from "../../lib/supabase/server";

import {
  getMovie,
  getPosterUrl,
  getSeries,
} from "../../lib/tmdb";

import { getTmdbLanguage } from "../../i18n/config";

type VaultStatus = "watched" | "watchlist";

type VaultItem = {
  id: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  status: VaultStatus;
  rating: number | null;
  review: string | null;
  is_favorite: boolean;
  created_at: string | null;
};

type SeriesProgressRow = {
  series_id: number;
  total_episodes: number;
  watched_episodes: number;
  status: "watchlist" | "in_progress" | "watched";
};

type WatchEventRow = {
  tmdb_id: number;
};

type MovieDetails = {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  runtime: number | null;
  vote_average: number;
};

type SeriesDetails = {
  id: number;
  name: string;
  first_air_date: string;
  poster_path: string | null;
  episode_run_time?: number[];
  number_of_episodes: number;
  vote_average: number;
};

export default async function VaultPage() {
  const locale = await getLocale();

  const t = await getTranslations({
    locale,
    namespace: "Vault",
  });

  const tmdbLanguage = getTmdbLanguage(locale);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [
    vaultResponse,
    progressResponse,
    watchEventsResponse,
  ] = await Promise.all([
    supabase
      .from("vault_items")
      .select(
        "id, tmdb_id, media_type, status, rating, review, is_favorite, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("series_progress")
      .select(
        "series_id, total_episodes, watched_episodes, status"
      )
      .eq("user_id", user.id),

    supabase
      .from("watch_events")
      .select("tmdb_id")
      .eq("user_id", user.id)
      .eq("media_type", "movie"),
  ]);

  if (vaultResponse.error) {
    console.error("Errore nel recupero del Vault:", {
      message: vaultResponse.error.message,
      details: vaultResponse.error.details,
      hint: vaultResponse.error.hint,
      code: vaultResponse.error.code,
    });

    throw new Error(
      [
        vaultResponse.error.message,
        vaultResponse.error.details,
        vaultResponse.error.hint,
        `Codice: ${vaultResponse.error.code}`,
      ]
        .filter(Boolean)
        .join(" | ")
    );
  }

  if (progressResponse.error) {
    console.error(
      "Errore nel recupero dei progressi:",
      {
        message: progressResponse.error.message,
        details: progressResponse.error.details,
        hint: progressResponse.error.hint,
        code: progressResponse.error.code,
      }
    );
  }

  if (watchEventsResponse.error) {
    console.error(
      "Errore nel recupero delle visioni film:",
      {
        message: watchEventsResponse.error.message,
        details: watchEventsResponse.error.details,
        hint: watchEventsResponse.error.hint,
        code: watchEventsResponse.error.code,
      }
    );
  }

  const vaultItems =
    (vaultResponse.data as VaultItem[] | null) ?? [];

  const progressRows =
    (progressResponse.data as
      | SeriesProgressRow[]
      | null) ?? [];

  const watchEventRows =
    (watchEventsResponse.data as
      | WatchEventRow[]
      | null) ?? [];

  const progressMap = new Map(
    progressRows.map((progress) => [
      progress.series_id,
      progress,
    ])
  );

  const watchCountMap = new Map<number, number>();

  for (const event of watchEventRows) {
    watchCountMap.set(
      event.tmdb_id,
      (watchCountMap.get(event.tmdb_id) ?? 0) + 1
    );
  }

  const itemResults = await Promise.allSettled(
    vaultItems.map(
      async (
        vaultItem
      ): Promise<VaultMediaItem> => {
        if (vaultItem.media_type === "movie") {
          const movie = (await getMovie(
            String(vaultItem.tmdb_id),
            tmdbLanguage
          )) as MovieDetails;

          const storedWatchCount =
            watchCountMap.get(vaultItem.tmdb_id) ?? 0;

          return {
            vaultId: vaultItem.id,
            tmdbId: movie.id,
            mediaType: "movie",
            title: movie.title,
            year: movie.release_date
              ? movie.release_date.slice(0, 4)
              : t("notAvailable"),
            posterUrl: getPosterUrl(
              movie.poster_path
            ),
            voteAverage:
              movie.vote_average ?? 0,
            runtimeLabel: movie.runtime
              ? t("minutes", {
                  minutes: movie.runtime,
                })
              : t("durationUnavailable"),
            vaultStatus: vaultItem.status,
            progressStatus: null,
            watchedEpisodes: 0,
            totalEpisodes: 0,
            isFavorite: vaultItem.is_favorite,
            createdAt: vaultItem.created_at,
            watchCount:
              vaultItem.status === "watched"
                ? Math.max(storedWatchCount, 1)
                : storedWatchCount,
          };
        }

        const series = (await getSeries(
          String(vaultItem.tmdb_id),
          tmdbLanguage
        )) as SeriesDetails;

        const progress =
          progressMap.get(vaultItem.tmdb_id);

        const averageRuntime =
          series.episode_run_time?.[0];

        return {
          vaultId: vaultItem.id,
          tmdbId: series.id,
          mediaType: "tv",
          title: series.name,
          year: series.first_air_date
            ? series.first_air_date.slice(0, 4)
            : t("notAvailable"),
          posterUrl: getPosterUrl(
            series.poster_path
          ),
          voteAverage:
            series.vote_average ?? 0,
          runtimeLabel: averageRuntime
            ? t("minutesPerEpisode", {
                minutes: averageRuntime,
              })
            : t("episodes", {
                count:
                  series.number_of_episodes ?? 0,
              }),
          vaultStatus: vaultItem.status,
          progressStatus:
            progress?.status ?? null,
          watchedEpisodes:
            progress?.watched_episodes ?? 0,
          totalEpisodes:
            progress?.total_episodes ??
            series.number_of_episodes ??
            0,
          isFavorite: vaultItem.is_favorite,
          createdAt: vaultItem.created_at,
          watchCount: 0,
        };
      }
    )
  );

  const vaultMediaItems = itemResults
    .filter(
      (
        result
      ): result is PromiseFulfilledResult<VaultMediaItem> =>
        result.status === "fulfilled"
    )
    .map((result) => result.value);

  return (
    <>
      <AppHeader />

      <main className="min-h-screen bg-[#0D0D0D] px-6 pb-20 pt-10 text-white">
        <div className="mx-auto max-w-7xl">
          <BackButton fallbackHref="/" />

          <section className="mb-10 mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-[#8B5CF6]">
                {t("archiveLabel")}
              </p>

              <h1 className="text-4xl font-bold md:text-5xl">
                {t("titlePrefix")}{" "}
                <span className="text-[#7C3AED]">
                  {t("titleHighlight")}
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-lg text-zinc-400">
                {t("description")}
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/import/tv-time"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#7C3AED]/60 bg-[#7C3AED]/10 px-7 py-3 font-bold text-[#C4B5FD] transition hover:border-[#8B5CF6] hover:bg-[#7C3AED]/20 hover:text-white"
              >
                <span aria-hidden="true">
                  📥
                </span>

                {t("importTvTime")}
              </Link>

              <Link
                href="/ricerca"
                className="inline-flex items-center justify-center rounded-full bg-[#7C3AED] px-7 py-3 font-bold text-white transition hover:bg-[#6D28D9]"
              >
                + {t("addContent")}
              </Link>
            </div>
          </section>

          {vaultMediaItems.length > 0 ? (
            <VaultLibrary
              items={vaultMediaItems}
            />
          ) : (
            <section className="rounded-3xl border border-dashed border-zinc-700 bg-[#151515] px-6 py-20 text-center">
              <p className="text-5xl">
                🎞️
              </p>

              <h2 className="mt-5 text-2xl font-bold">
                {t("emptyTitle")}
              </h2>

              <p className="mx-auto mt-3 max-w-xl text-zinc-400">
                {t("emptyDescription")}
              </p>

              <Link
                href="/ricerca"
                className="mt-7 inline-block rounded-full bg-[#7C3AED] px-7 py-3 font-bold transition hover:bg-[#6D28D9]"
              >
                {t("searchContent")}
              </Link>
            </section>
          )}
        </div>
      </main>
    </>
  );
}