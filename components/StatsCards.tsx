import { createClient } from "../lib/supabase/server";
import {
  getMovie,
  getSeriesSeason,
} from "../lib/tmdb";

type VaultItem = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  status: "watched" | "watchlist";
  review: string | null;
};

type SeriesProgressRow = {
  series_id: number;
  status: "watchlist" | "in_progress" | "watched";
  watched_episodes: number;
  total_episodes: number;
};

type WatchedEpisodeRow = {
  series_id: number;
  season_number: number;
  episode_number: number;
};

type MovieDetails = {
  runtime: number | null;
};

type SeasonEpisode = {
  episode_number: number;
  runtime: number | null;
};

type SeasonDetails = {
  episodes?: SeasonEpisode[];
};

type EpisodeGroup = {
  seriesId: number;
  seasonNumber: number;
  episodeNumbers: Set<number>;
};

export default async function StatsCards() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let filmsWatched = 0;
  let trackedSeries = 0;
  let watchlistCount = 0;
  let totalMinutes = 0;
  let reviewsCount = 0;

  if (user) {
    const [
      vaultResponse,
      progressResponse,
      episodesResponse,
    ] = await Promise.all([
      supabase
        .from("vault_items")
        .select("tmdb_id, media_type, status, review")
        .eq("user_id", user.id),

      supabase
        .from("series_progress")
        .select(
          "series_id, status, watched_episodes, total_episodes"
        )
        .eq("user_id", user.id),

      supabase
        .from("watched_episodes")
        .select(
          "series_id, season_number, episode_number"
        )
        .eq("user_id", user.id),
    ]);

    if (vaultResponse.error) {
      console.warn(
        "Errore nel recupero del Vault:",
        {
          message: vaultResponse.error.message,
          details: vaultResponse.error.details,
          hint: vaultResponse.error.hint,
          code: vaultResponse.error.code,
        }
      );
    }

    if (progressResponse.error) {
      console.warn(
        "Errore nel recupero dei progressi delle serie:",
        {
          message: progressResponse.error.message,
          details: progressResponse.error.details,
          hint: progressResponse.error.hint,
          code: progressResponse.error.code,
        }
      );
    }

    if (episodesResponse.error) {
      console.warn(
        "Errore nel recupero degli episodi visti:",
        {
          message: episodesResponse.error.message,
          details: episodesResponse.error.details,
          hint: episodesResponse.error.hint,
          code: episodesResponse.error.code,
        }
      );
    }

    const vaultItems =
      (vaultResponse.data as VaultItem[] | null) ?? [];

    const seriesProgress =
      (progressResponse.data as SeriesProgressRow[] | null) ??
      [];

    const watchedEpisodes =
      (episodesResponse.data as WatchedEpisodeRow[] | null) ??
      [];

    const watchedMovies = vaultItems.filter(
      (item) =>
        item.media_type === "movie" &&
        item.status === "watched"
    );

    filmsWatched = watchedMovies.length;

    /*
     * Conta tutte le serie effettivamente iniziate
     * oppure completate.
     */
    trackedSeries = seriesProgress.filter(
      (item) =>
        item.status === "in_progress" ||
        item.status === "watched"
    ).length;

    /*
     * ID delle serie già iniziate o completate.
     * Servono per non contarle anche nella Watchlist.
     */
    const startedSeriesIds = new Set(
      seriesProgress
        .filter(
          (item) =>
            item.status === "in_progress" ||
            item.status === "watched"
        )
        .map((item) => item.series_id)
    );

    watchlistCount = vaultItems.filter((item) => {
      if (item.status !== "watchlist") {
        return false;
      }

      if (
        item.media_type === "tv" &&
        startedSeriesIds.has(item.tmdb_id)
      ) {
        return false;
      }

      return true;
    }).length;

    reviewsCount = vaultItems.filter(
      (item) =>
        typeof item.review === "string" &&
        item.review.trim().length > 0
    ).length;

    /*
     * Durata dei film visti.
     */
    const movieRuntimeResults = await Promise.allSettled(
      watchedMovies.map(async (item) => {
        const movie = (await getMovie(
          String(item.tmdb_id)
        )) as MovieDetails;

        return movie.runtime ?? 0;
      })
    );

    const movieMinutes = movieRuntimeResults.reduce(
      (total, result) => {
        if (result.status === "fulfilled") {
          return total + result.value;
        }

        return total;
      },
      0
    );

    /*
     * Raggruppa gli episodi per serie e stagione.
     * In questo modo eseguiamo una sola richiesta TMDB
     * per ogni stagione, non una richiesta per episodio.
     */
    const episodeGroupsMap = new Map<
      string,
      EpisodeGroup
    >();

    for (const episode of watchedEpisodes) {
      const key = `${episode.series_id}-${episode.season_number}`;

      const existingGroup = episodeGroupsMap.get(key);

      if (existingGroup) {
        existingGroup.episodeNumbers.add(
          episode.episode_number
        );

        continue;
      }

      episodeGroupsMap.set(key, {
        seriesId: episode.series_id,
        seasonNumber: episode.season_number,
        episodeNumbers: new Set([
          episode.episode_number,
        ]),
      });
    }

    const episodeGroups = Array.from(
      episodeGroupsMap.values()
    );

    /*
     * Durata reale degli episodi visti.
     */
    const episodeRuntimeResults =
      await Promise.allSettled(
        episodeGroups.map(async (group) => {
          const season = (await getSeriesSeason(
            String(group.seriesId),
            group.seasonNumber
          )) as SeasonDetails;

          const seasonEpisodes =
            season.episodes ?? [];

          return seasonEpisodes.reduce(
            (seasonTotal, episode) => {
              if (
                group.episodeNumbers.has(
                  episode.episode_number
                )
              ) {
                return (
                  seasonTotal +
                  (episode.runtime ?? 0)
                );
              }

              return seasonTotal;
            },
            0
          );
        })
      );

    const episodeMinutes =
      episodeRuntimeResults.reduce(
        (total, result) => {
          if (result.status === "fulfilled") {
            return total + result.value;
          }

          return total;
        },
        0
      );

    totalMinutes = movieMinutes + episodeMinutes;
  }

  const hoursWatched = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  const formattedTime =
    totalMinutes === 0
      ? "0h"
      : remainingMinutes === 0
        ? `${hoursWatched}h`
        : `${hoursWatched}h ${remainingMinutes}m`;

  const stats = [
    {
      label: "Film visti",
      value: filmsWatched,
      colorClass: "text-violet-500",
    },
    {
      label: "Da vedere",
      value: watchlistCount,
      colorClass: "text-cyan-400",
    },
    {
      label: "Serie TV",
      value: trackedSeries,
      colorClass: "text-blue-500",
    },
    {
      label: "Ore viste",
      value: formattedTime,
      colorClass: "text-yellow-400",
    },
    {
      label: "Recensioni",
      value: reviewsCount,
      colorClass: "text-green-500",
    },
  ];

  return (
    <section className="mx-auto mt-16 max-w-7xl px-6">
      <h2 className="mb-8 text-3xl font-bold">
        📊 Le tue statistiche
      </h2>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center transition hover:-translate-y-1 hover:border-[#7C3AED]"
          >
            <h3
              className={`text-5xl font-bold ${stat.colorClass}`}
            >
              {stat.value}
            </h3>

            <p className="mt-3 text-zinc-400">
              {stat.label}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
