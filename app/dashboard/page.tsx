import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import Navbar from "../../components/Navbar";
import BackButton from "../../components/BackButton";

import { createClient } from "../../lib/supabase/server";
import {
  getMovie,
  getSeries,
} from "../../lib/tmdb";
import { getTmdbLanguage } from "../../i18n/config";

type VaultItem = {
  id: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  status: "watched" | "watchlist" | string;
  rating: number | null;
  review: string | null;
  is_favorite: boolean;
  created_at: string | null;
};

type SeriesProgress = {
  series_id: number;
  total_episodes: number;
  watched_episodes: number;
  status: "watchlist" | "in_progress" | "watched";
  updated_at: string | null;
};

type MovieWatchEvent = {
  id: string;
  tmdb_id: number;
  media_type: string;
  watched_at: string;
};

type EpisodeWatchEvent = {
  id: string;
  series_id: number;
  season_number: number;
  episode_number: number;
  watched_at: string;
};

type TMDBGenre = {
  id: number;
  name: string;
};

type TMDBContentDetails = {
  id: number;
  title?: string;
  name?: string;
  genres?: TMDBGenre[];
};

type StatCard = {
  label: string;
  value: string;
  icon: string;
  description: string;
};

type MonthlyActivity = {
  monthIndex: number;
  monthLabel: string;
  movies: number;
  episodes: number;
  total: number;
};

type GenreStat = {
  name: string;
  count: number;
  percentage: number;
};

type MovieRewatchStat = {
  tmdbId: number;
  totalViews: number;
  rewatches: number;
};

type AchievementProgress = {
  key: string;
  title: string;
  icon: string;
  value: number;
  unit: string;
  level: number;
  currentThreshold: number;
  nextThreshold: number;
  progressPercentage: number;
  remaining: number;
};

type AchievementDefinition = {
  key: string;
  title: string;
  icon: string;
  value: number;
  unit: string;
  base: number;
};

function getStartOfMonth(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
    0,
    0,
    0,
    0
  );
}

function getStartOfNextMonth(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    1,
    0,
    0,
    0,
    0
  );
}

function getStartOfPreviousMonth(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth() - 1,
    1,
    0,
    0,
    0,
    0
  );
}

function getStartOfYear(date: Date) {
  return new Date(
    date.getFullYear(),
    0,
    1,
    0,
    0,
    0,
    0
  );
}

function isDateInRange(
  value: string,
  start: Date,
  end: Date
) {
  const date = new Date(value);

  return date >= start && date < end;
}

function calculateVariation(
  currentValue: number,
  previousValue: number
) {
  if (previousValue === 0) {
    if (currentValue === 0) {
      return null;
    }

    return 100;
  }

  return Math.round(
    ((currentValue - previousValue) /
      previousValue) *
      100
  );
}

function normalizeGenreName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase();
}

/*
 * TRAGUARDI ILLIMITATI
 *
 * Ogni famiglia usa una progressione quadratica:
 * soglia = base × livello².
 *
 * In questo modo non esiste un ultimo livello.
 * Esempio con base 10:
 * Livello I = 10
 * Livello II = 40
 * Livello III = 90
 * Livello IV = 160
 * ...e così via senza limite.
 */
function getAchievementProgress(
  definition: AchievementDefinition
): AchievementProgress {
  const safeValue = Math.max(
    0,
    definition.value
  );

  const level =
    safeValue >= definition.base
      ? Math.floor(
          Math.sqrt(
            safeValue / definition.base
          )
        )
      : 0;

  const currentThreshold =
    level > 0
      ? definition.base * level * level
      : 0;

  const nextLevel = level + 1;

  const nextThreshold =
    definition.base *
    nextLevel *
    nextLevel;

  const range =
    nextThreshold - currentThreshold;

  const progressInCurrentLevel =
    safeValue - currentThreshold;

  const progressPercentage =
    range > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              (progressInCurrentLevel /
                range) *
                100
            )
          )
        )
      : 0;

  return {
    key: definition.key,
    title: definition.title,
    icon: definition.icon,
    value: safeValue,
    unit: definition.unit,
    level,
    currentThreshold,
    nextThreshold,
    progressPercentage,
    remaining: Math.max(
      0,
      nextThreshold - safeValue
    ),
  };
}

function toRomanNumeral(value: number) {
  if (value <= 0) {
    return "0";
  }

  const numerals: Array<
    [number, string]
  > = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];

  let remaining = value;
  let result = "";

  for (const [number, symbol] of numerals) {
    while (remaining >= number) {
      result += symbol;
      remaining -= number;
    }
  }

  return result;
}

export default async function DashboardPage() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  const tmdbLanguage = getTmdbLanguage(locale);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  /*
   * PROFILO VIEWVAULT
   */
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "username, display_name, avatar_url, favorite_genres"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Errore nel recupero del profilo Dashboard:",
      {
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code,
      }
    );
  }

  /*
   * DATI DASHBOARD
   */
  const [
    vaultResponse,
    progressResponse,
    watchedEpisodesResponse,
    movieWatchEventsResponse,
    episodeWatchEventsResponse,
  ] = await Promise.all([
    supabase
      .from("vault_items")
      .select(
        "id, tmdb_id, media_type, status, rating, review, is_favorite, created_at"
      )
      .eq("user_id", user.id),

    supabase
      .from("series_progress")
      .select(
        "series_id, total_episodes, watched_episodes, status, updated_at"
      )
      .eq("user_id", user.id),

    supabase
      .from("watched_episodes")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("user_id", user.id),

    supabase
      .from("watch_events")
      .select(
        "id, tmdb_id, media_type, watched_at"
      )
      .eq("user_id", user.id)
      .eq("media_type", "movie"),

    supabase
      .from("episode_watch_events")
      .select(
        "id, series_id, season_number, episode_number, watched_at"
      )
      .eq("user_id", user.id),
  ]);

  if (vaultResponse.error) {
    console.error(
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
    console.error(
      "Errore nel recupero dei progressi delle serie:",
      {
        message: progressResponse.error.message,
        details: progressResponse.error.details,
        hint: progressResponse.error.hint,
        code: progressResponse.error.code,
      }
    );
  }

  if (watchedEpisodesResponse.error) {
    console.error(
      "Errore nel conteggio degli episodi:",
      {
        message:
          watchedEpisodesResponse.error.message,
        details:
          watchedEpisodesResponse.error.details,
        hint:
          watchedEpisodesResponse.error.hint,
        code:
          watchedEpisodesResponse.error.code,
      }
    );
  }

  if (movieWatchEventsResponse.error) {
    console.error(
      "Errore nel recupero degli eventi film:",
      {
        message:
          movieWatchEventsResponse.error.message,
        details:
          movieWatchEventsResponse.error.details,
        hint:
          movieWatchEventsResponse.error.hint,
        code:
          movieWatchEventsResponse.error.code,
      }
    );
  }

  if (episodeWatchEventsResponse.error) {
    console.error(
      "Errore nel recupero degli eventi episodi:",
      {
        message:
          episodeWatchEventsResponse.error.message,
        details:
          episodeWatchEventsResponse.error.details,
        hint:
          episodeWatchEventsResponse.error.hint,
        code:
          episodeWatchEventsResponse.error.code,
      }
    );
  }

  const vaultItems =
    (vaultResponse.data as VaultItem[] | null) ??
    [];

  const seriesProgress =
    (progressResponse.data as
      | SeriesProgress[]
      | null) ?? [];

  const movieWatchEvents =
    (movieWatchEventsResponse.data as
      | MovieWatchEvent[]
      | null) ?? [];

  const episodeWatchEvents =
    (episodeWatchEventsResponse.data as
      | EpisodeWatchEvent[]
      | null) ?? [];

  /*
   * STATISTICHE GENERALI
   */
  const filmsWatched = vaultItems.filter(
    (item) =>
      item.media_type === "movie" &&
      item.status === "watched"
  ).length;

  const completedSeries = seriesProgress.filter(
    (item) => item.status === "watched"
  ).length;

  const seriesInProgress = seriesProgress.filter(
    (item) => item.status === "in_progress"
  ).length;

  const watchedEpisodes =
    watchedEpisodesResponse.count ?? 0;

  const favoritesCount = vaultItems.filter(
    (item) => item.is_favorite
  ).length;

  const ratedContents = vaultItems.filter(
    (item) =>
      item.rating !== null &&
      item.rating > 0
  );

  const averageRating =
    ratedContents.length > 0
      ? (
          ratedContents.reduce(
            (total, item) =>
              total + (item.rating ?? 0),
            0
          ) / ratedContents.length
        ).toFixed(1)
      : null;

  const reviewsCount = vaultItems.filter(
    (item) =>
      typeof item.review === "string" &&
      item.review.trim().length > 0
  ).length;

  /*
   * ATTIVITÀ TEMPORALE
   */
  const now = new Date();

  const currentMonthStart =
    getStartOfMonth(now);

  const nextMonthStart =
    getStartOfNextMonth(now);

  const previousMonthStart =
    getStartOfPreviousMonth(now);

  const currentYearStart =
    getStartOfYear(now);

  const nextYearStart = new Date(
    now.getFullYear() + 1,
    0,
    1,
    0,
    0,
    0,
    0
  );

  const moviesThisMonth =
    movieWatchEvents.filter((event) =>
      isDateInRange(
        event.watched_at,
        currentMonthStart,
        nextMonthStart
      )
    ).length;

  const episodesThisMonth =
    episodeWatchEvents.filter((event) =>
      isDateInRange(
        event.watched_at,
        currentMonthStart,
        nextMonthStart
      )
    ).length;

  const activityThisMonth =
    moviesThisMonth + episodesThisMonth;

  const moviesPreviousMonth =
    movieWatchEvents.filter((event) =>
      isDateInRange(
        event.watched_at,
        previousMonthStart,
        currentMonthStart
      )
    ).length;

  const episodesPreviousMonth =
    episodeWatchEvents.filter((event) =>
      isDateInRange(
        event.watched_at,
        previousMonthStart,
        currentMonthStart
      )
    ).length;

  const activityPreviousMonth =
    moviesPreviousMonth +
    episodesPreviousMonth;

  const monthlyVariation =
    calculateVariation(
      activityThisMonth,
      activityPreviousMonth
    );

  const moviesThisYear =
    movieWatchEvents.filter((event) =>
      isDateInRange(
        event.watched_at,
        currentYearStart,
        nextYearStart
      )
    ).length;

  const episodesThisYear =
    episodeWatchEvents.filter((event) =>
      isDateInRange(
        event.watched_at,
        currentYearStart,
        nextYearStart
      )
    ).length;

  const activityThisYear =
    moviesThisYear + episodesThisYear;

  /*
   * ANDAMENTO MENSILE
   */
  const monthlyActivity: MonthlyActivity[] =
    Array.from({ length: 12 }, (_, monthIndex) => {
      const monthLabel = new Intl.DateTimeFormat(locale, {
        month: "short",
      }).format(new Date(now.getFullYear(), monthIndex, 1));

      return { monthLabel, monthIndex };
    }).map(
      ({ monthLabel, monthIndex }) => {
        const monthStart = new Date(
          now.getFullYear(),
          monthIndex,
          1,
          0,
          0,
          0,
          0
        );

        const monthEnd = new Date(
          now.getFullYear(),
          monthIndex + 1,
          1,
          0,
          0,
          0,
          0
        );

        const movies =
          movieWatchEvents.filter((event) =>
            isDateInRange(
              event.watched_at,
              monthStart,
              monthEnd
            )
          ).length;

        const episodes =
          episodeWatchEvents.filter((event) =>
            isDateInRange(
              event.watched_at,
              monthStart,
              monthEnd
            )
          ).length;

        return {
          monthIndex,
          monthLabel,
          movies,
          episodes,
          total: movies + episodes,
        };
      }
    );

  const maxMonthlyActivity = Math.max(
    ...monthlyActivity.map(
      (month) => month.total
    ),
    1
  );

  /*
   * I TUOI GUSTI
   *
   * Un film visto vale un contenuto.
   * Una serie iniziata o completata vale un contenuto,
   * indipendentemente dal numero di episodi.
   */
  const watchedMovieIds = Array.from(
    new Set(
      vaultItems
        .filter(
          (item) =>
            item.media_type === "movie" &&
            item.status === "watched"
        )
        .map((item) => item.tmdb_id)
    )
  );

  const watchedSeriesIds = Array.from(
    new Set(
      seriesProgress
        .filter(
          (item) =>
            item.status === "in_progress" ||
            item.status === "watched"
        )
        .map((item) => item.series_id)
    )
  );

  const [
    watchedMovieDetails,
    watchedSeriesDetails,
  ] = await Promise.all([
    Promise.all(
      watchedMovieIds.map(
        async (movieId) => {
          try {
            return (await getMovie(
              String(movieId),
              tmdbLanguage
            )) as TMDBContentDetails;
          } catch (error) {
            console.error(
              `Errore TMDB film ${movieId} nella Dashboard:`,
              error
            );

            return null;
          }
        }
      )
    ),

    Promise.all(
      watchedSeriesIds.map(
        async (seriesId) => {
          try {
            return (await getSeries(
              String(seriesId),
              tmdbLanguage
            )) as TMDBContentDetails;
          } catch (error) {
            console.error(
              `Errore TMDB serie ${seriesId} nella Dashboard:`,
              error
            );

            return null;
          }
        }
      )
    ),
  ]);

  const validMovieDetails =
    watchedMovieDetails.filter(
      (
        item
      ): item is TMDBContentDetails =>
        item !== null
    );

  const validSeriesDetails =
    watchedSeriesDetails.filter(
      (
        item
      ): item is TMDBContentDetails =>
        item !== null
    );

  const analyzedMovies =
    validMovieDetails.length;

  const analyzedSeries =
    validSeriesDetails.length;

  const analyzedContents =
    analyzedMovies + analyzedSeries;

  const moviePercentage =
    analyzedContents > 0
      ? Math.round(
          (analyzedMovies /
            analyzedContents) *
            100
        )
      : 0;

  const seriesPercentage =
    analyzedContents > 0
      ? 100 - moviePercentage
      : 0;

  const genreCounts =
    new Map<string, number>();

  const allAnalyzedDetails = [
    ...validMovieDetails,
    ...validSeriesDetails,
  ];

  for (const content of allAnalyzedDetails) {
    const uniqueGenres =
      new Map<string, string>();

    for (const genre of content.genres ?? []) {
      const normalizedName =
        normalizeGenreName(genre.name);

      if (!normalizedName) {
        continue;
      }

      uniqueGenres.set(
        normalizedName,
        genre.name
      );
    }

    for (const [
      normalizedName,
      displayName,
    ] of uniqueGenres.entries()) {
      const existingEntry =
        Array.from(
          genreCounts.entries()
        ).find(
          ([genreName]) =>
            normalizeGenreName(genreName) ===
            normalizedName
        );

      if (existingEntry) {
        genreCounts.set(
          existingEntry[0],
          existingEntry[1] + 1
        );
      } else {
        genreCounts.set(
          displayName,
          1
        );
      }
    }
  }

  const genreStats: GenreStat[] =
    Array.from(genreCounts.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage:
          analyzedContents > 0
            ? Math.round(
                (count /
                  analyzedContents) *
                  100
              )
            : 0,
      }))
      .sort((first, second) => {
        if (
          second.count !== first.count
        ) {
          return (
            second.count - first.count
          );
        }

        return first.name.localeCompare(
          second.name,
          locale
        );
      });

  const topGenres =
    genreStats.slice(0, 5);

  const dominantGenre =
    topGenres[0] ?? null;

  const favoriteGenres =
    Array.isArray(profile?.favorite_genres)
      ? (profile.favorite_genres as string[])
      : [];

  const normalizedWatchedGenres =
    new Set(
      genreStats.map((genre) =>
        normalizeGenreName(genre.name)
      )
    );

  const matchingFavoriteGenres =
    favoriteGenres.filter((genre) =>
      normalizedWatchedGenres.has(
        normalizeGenreName(genre)
      )
    );

  const topGenreNames =
    topGenres.map((genre) =>
      normalizeGenreName(genre.name)
    );

  const favoriteTopMatches =
    favoriteGenres.filter((genre) =>
      topGenreNames.includes(
        normalizeGenreName(genre)
      )
    );

  /*
   * ABITUDINI - REWATCH FILM
   *
   * Ogni watch_event è una visione registrata.
   * Prima riga dello stesso tmdb_id = prima visione.
   * Dalla seconda in poi = rewatch.
   */
  const movieViewCounts =
    new Map<number, number>();

  for (const event of movieWatchEvents) {
    movieViewCounts.set(
      event.tmdb_id,
      (movieViewCounts.get(
        event.tmdb_id
      ) ?? 0) + 1
    );
  }

  const uniqueMoviesWithEvents =
    movieViewCounts.size;

  const totalMovieViewingEvents =
    movieWatchEvents.length;

  const totalMovieRewatches =
    Array.from(
      movieViewCounts.values()
    ).reduce(
      (total, count) =>
        total + Math.max(0, count - 1),
      0
    );

  const rewatchedMoviesCount =
    Array.from(
      movieViewCounts.values()
    ).filter((count) => count > 1).length;

  const movieRewatchPercentage =
    totalMovieViewingEvents > 0
      ? Math.round(
          (totalMovieRewatches /
            totalMovieViewingEvents) *
            100
        )
      : 0;

  const movieRewatchStats: MovieRewatchStat[] =
    Array.from(
      movieViewCounts.entries()
    )
      .map(([tmdbId, totalViews]) => ({
        tmdbId,
        totalViews,
        rewatches:
          Math.max(0, totalViews - 1),
      }))
      .filter(
        (item) => item.rewatches > 0
      )
      .sort((first, second) => {
        if (
          second.totalViews !==
          first.totalViews
        ) {
          return (
            second.totalViews -
            first.totalViews
          );
        }

        return (
          second.rewatches -
          first.rewatches
        );
      });

  const mostRewatchedMovie =
    movieRewatchStats[0] ?? null;

  let mostRewatchedMovieDetails:
    | TMDBContentDetails
    | null = null;

  if (mostRewatchedMovie) {
    const alreadyLoadedMovie =
      validMovieDetails.find(
        (movie) =>
          movie.id ===
          mostRewatchedMovie.tmdbId
      );

    if (alreadyLoadedMovie) {
      mostRewatchedMovieDetails =
        alreadyLoadedMovie;
    } else {
      try {
        mostRewatchedMovieDetails =
          (await getMovie(
            String(
              mostRewatchedMovie.tmdbId
            ),
            tmdbLanguage
          )) as TMDBContentDetails;
      } catch (error) {
        console.error(
          `Errore TMDB film più rivisto ${mostRewatchedMovie.tmdbId}:`,
          error
        );
      }
    }
  }

  const mostRewatchedMovieTitle =
    mostRewatchedMovieDetails?.title ??
    (mostRewatchedMovie
      ? t("movieFallback", { id: mostRewatchedMovie.tmdbId })
      : null);

  /*
   * ABITUDINI - REWATCH EPISODI
   *
   * La chiave univoca dell'episodio è:
   * series_id + season_number + episode_number.
   */
  const episodeViewCounts =
    new Map<string, number>();

  const episodeSeriesMap =
    new Map<string, number>();

  for (const event of episodeWatchEvents) {
    const episodeKey =
      `${event.series_id}:${event.season_number}:${event.episode_number}`;

    episodeViewCounts.set(
      episodeKey,
      (episodeViewCounts.get(
        episodeKey
      ) ?? 0) + 1
    );

    episodeSeriesMap.set(
      episodeKey,
      event.series_id
    );
  }

  const uniqueEpisodesWithEvents =
    episodeViewCounts.size;

  const totalEpisodeViewingEvents =
    episodeWatchEvents.length;

  const totalEpisodeRewatches =
    Array.from(
      episodeViewCounts.values()
    ).reduce(
      (total, count) =>
        total + Math.max(0, count - 1),
      0
    );

  const rewatchedEpisodesCount =
    Array.from(
      episodeViewCounts.values()
    ).filter((count) => count > 1).length;

  const episodeRewatchPercentage =
    totalEpisodeViewingEvents > 0
      ? Math.round(
          (totalEpisodeRewatches /
            totalEpisodeViewingEvents) *
            100
        )
      : 0;

  const seriesWithEpisodeRewatches =
    new Set<number>();

  for (const [
    episodeKey,
    count,
  ] of episodeViewCounts.entries()) {
    if (count <= 1) {
      continue;
    }

    const seriesId =
      episodeSeriesMap.get(episodeKey);

    if (seriesId) {
      seriesWithEpisodeRewatches.add(
        seriesId
      );
    }
  }

  /*
   * ABITUDINI - RAPPORTO GENERALE
   */
  const totalViewingEvents =
    totalMovieViewingEvents +
    totalEpisodeViewingEvents;

  const totalRewatchEvents =
    totalMovieRewatches +
    totalEpisodeRewatches;

  const totalFirstViewEvents =
    uniqueMoviesWithEvents +
    uniqueEpisodesWithEvents;

  const overallRewatchPercentage =
    totalViewingEvents > 0
      ? Math.round(
          (totalRewatchEvents /
            totalViewingEvents) *
            100
        )
      : 0;

  const firstViewPercentage =
    totalViewingEvents > 0
      ? 100 - overallRewatchPercentage
      : 0;

  /*
   * TRAGUARDI
   *
   * I livelli sono calcolati dinamicamente.
   * Non esiste un livello massimo.
   */
  const achievementDefinitions:
    AchievementDefinition[] = [
      {
        key: "cinefilo",
        title: t("achievementCinephile"),
        icon: "🎬",
        value: filmsWatched,
        unit: t("unitMoviesWatched"),
        base: 10,
      },
      {
        key: "maratoneta",
        title: t("achievementMarathoner"),
        icon: "📺",
        value: watchedEpisodes,
        unit: t("unitEpisodesWatched"),
        base: 25,
      },
      {
        key: "seriale",
        title: t("achievementSerial"),
        icon: "✅",
        value: completedSeries,
        unit: t("unitSeriesCompleted"),
        base: 2,
      },
      {
        key: "critico",
        title: t("achievementCritic"),
        icon: "⭐",
        value: ratedContents.length,
        unit: t("unitRatings"),
        base: 5,
      },
      {
        key: "recensore",
        title: t("achievementReviewer"),
        icon: "✍️",
        value: reviewsCount,
        unit: t("unitReviews"),
        base: 5,
      },
      {
        key: "deja-view",
        title: "Déjà View",
        icon: "🔁",
        value: totalRewatchEvents,
        unit: t("unitRewatch"),
        base: 1,
      },
    ];

  const achievements =
    achievementDefinitions.map(
      getAchievementProgress
    );

  const unlockedAchievements =
    achievements.filter(
      (achievement) =>
        achievement.level > 0
    );

  const totalAchievementLevels =
    achievements.reduce(
      (total, achievement) =>
        total + achievement.level,
      0
    );

  const closestAchievement =
    [...achievements].sort(
      (first, second) => {
        if (
          second.progressPercentage !==
          first.progressPercentage
        ) {
          return (
            second.progressPercentage -
            first.progressPercentage
          );
        }

        return (
          first.remaining -
          second.remaining
        );
      }
    )[0] ?? null;

  /*
   * IDENTITÀ UTENTE
   */
  const metadata = user.user_metadata ?? {};

  const displayName =
    profile?.display_name ||
    profile?.username ||
    metadata.full_name ||
    metadata.name ||
    metadata.user_name ||
    metadata.preferred_username ||
    user.email?.split("@")[0] ||
    t("user");

  const avatarUrl =
    profile?.avatar_url ||
    metadata.avatar_url ||
    metadata.picture ||
    null;

  const stats: StatCard[] = [
    {
      label: t("moviesWatched"),
      value: String(filmsWatched),
      icon: "🎬",
      description: t("completedMovies"),
    },
    {
      label: t("completedSeries"),
      value: String(completedSeries),
      icon: "✅",
      description: t("seriesWatchedToEnd"),
    },
    {
      label: t("episodesWatched"),
      value: String(watchedEpisodes),
      icon: "📺",
      description: t("completedEpisodes"),
    },
    {
      label: t("seriesInProgress"),
      value: String(seriesInProgress),
      icon: "🕒",
      description: t("seriesFollowing"),
    },
    {
      label: t("favorites"),
      value: String(favoritesCount),
      icon: "❤️",
      description: t("favoriteContent"),
    },
  ];

  return (
    <main className="min-h-screen bg-[#0D0D0D] text-white">
      <Navbar />

      <div className="mx-auto max-w-7xl px-6 pb-20 pt-12">
        <div className="mb-8">
          <BackButton fallbackHref="/" />
        </div>

        {/* HEADER */}
        <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-[#8B5CF6]">
              {t("dashboardPersonal")}
            </p>

            <h1 className="text-4xl font-bold md:text-5xl">
              {t("helloPrefix")}{" "}
              <span className="text-[#7C3AED]">
                {displayName}
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-400">
              {t("dashboardDescription")}
            </p>
          </div>

          <article className="flex items-center gap-4 rounded-3xl border border-zinc-800 bg-[#151515] p-4 pr-6">
            {avatarUrl ? (
              <div
                className="h-16 w-16 shrink-0 rounded-full border-2 border-[#7C3AED] bg-cover bg-center"
                style={{
                  backgroundImage: `url("${avatarUrl}")`,
                }}
                aria-label={t("avatarLabel", { name: displayName })}
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[#7C3AED] bg-[#7C3AED]/20 text-2xl font-bold text-[#A78BFA]">
                {displayName
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate font-bold">
                {displayName}
              </p>

              <p className="max-w-64 truncate text-sm text-zinc-400">
                {user.email}
              </p>

              <span className="mt-2 inline-block rounded-full bg-[#7C3AED]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#A78BFA]">
                {t("privateSpace")}
              </span>
            </div>
          </article>
        </section>

        {/* PANORAMICA */}
        <section>
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8B5CF6]">
              {t("overview")}
            </p>

            <h2 className="mt-2 text-2xl font-bold md:text-3xl">
              {t("yourNumbers")}
            </h2>

            <p className="mt-2 max-w-2xl text-zinc-500">
              {t("quickSnapshot")}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {stats.map((stat) => (
              <article
                key={stat.label}
                className="rounded-3xl border border-zinc-800 bg-[#151515] p-6 shadow-lg transition hover:-translate-y-1 hover:border-[#7C3AED]/70"
              >
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-3xl">
                    {stat.icon}
                  </span>

                  <span className="rounded-full bg-[#7C3AED]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#A78BFA]">
                    {t("personal")}
                  </span>
                </div>

                <p className="text-4xl font-bold">
                  {stat.value}
                </p>

                <p className="mt-2 font-semibold text-zinc-300">
                  {stat.label}
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  {stat.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* VALUTAZIONI E RECENSIONI */}
        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-6 md:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B5CF6]">
                  {t("ratings")}
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {t("averageRating")}
                </h2>
              </div>

              <span className="text-3xl">
                ⭐
              </span>
            </div>

            {averageRating ? (
              <>
                <p className="mt-7 text-5xl font-bold">
                  {averageRating}
                  <span className="ml-2 text-xl font-semibold text-zinc-500">
                    / 10
                  </span>
                </p>

                <p className="mt-3 text-zinc-400">
                  {t("calculatedOn", {
                    count: ratedContents.length,
                    content:
                      ratedContents.length === 1
                        ? t("ratedContentOne")
                        : t("ratedContentMany"),
                  })}
                </p>
              </>
            ) : (
              <div className="mt-7 rounded-2xl border border-dashed border-zinc-700 bg-black/20 p-5">
                <p className="font-semibold text-zinc-300">
                  {t("noRatings")}
                </p>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {t("noRatingsDesc")}
                </p>
              </div>
            )}
          </article>

          <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-6 md:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B5CF6]">
                  {t("reviews")}
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {t("yourVoice")}
                </h2>
              </div>

              <span className="text-3xl">
                ✍️
              </span>
            </div>

            <p className="mt-7 text-5xl font-bold">
              {reviewsCount}
            </p>

            <p className="mt-3 text-zinc-400">
              {reviewsCount === 1
                ? t("reviewOne")
                : t("reviewMany")}
            </p>
          </article>
        </section>

        {/* ATTIVITÀ */}
        <section className="mt-10">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8B5CF6]">
              {t("activity")}
            </p>

            <h2 className="mt-2 text-2xl font-bold md:text-3xl">
              {t("viewingRhythm")}
            </h2>

            <p className="mt-2 max-w-3xl text-zinc-500">
              {t("activityDesc")}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-6">
              <div className="flex items-center justify-between">
                <span className="text-3xl">
                  🎬
                </span>

                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {t("thisMonth")}
                </span>
              </div>

              <p className="mt-6 text-4xl font-bold">
                {moviesThisMonth}
              </p>

              <p className="mt-2 font-semibold text-zinc-300">
                {t("moviesWatched")}
              </p>
            </article>

            <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-6">
              <div className="flex items-center justify-between">
                <span className="text-3xl">
                  📺
                </span>

                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {t("thisMonth")}
                </span>
              </div>

              <p className="mt-6 text-4xl font-bold">
                {episodesThisMonth}
              </p>

              <p className="mt-2 font-semibold text-zinc-300">
                {t("episodesWatched")}
              </p>
            </article>

            <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-6">
              <div className="flex items-center justify-between">
                <span className="text-3xl">
                  🔥
                </span>

                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {t("total")}
                </span>
              </div>

              <p className="mt-6 text-4xl font-bold">
                {activityThisMonth}
              </p>

              <p className="mt-2 font-semibold text-zinc-300">
                {t("monthlyActivity")}
              </p>
            </article>

            <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-6">
              <div className="flex items-center justify-between">
                <span className="text-3xl">
                  📈
                </span>

                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {t("vsLastMonth")}
                </span>
              </div>

              {monthlyVariation === null ? (
                <>
                  <p className="mt-6 text-4xl font-bold text-zinc-500">
                    =
                  </p>

                  <p className="mt-2 font-semibold text-zinc-300">
                    {t("noVariation")}
                  </p>
                </>
              ) : (
                <>
                  <p
                    className={`mt-6 text-4xl font-bold ${
                      monthlyVariation > 0
                        ? "text-emerald-400"
                        : monthlyVariation < 0
                          ? "text-red-400"
                          : "text-zinc-300"
                    }`}
                  >
                    {monthlyVariation > 0
                      ? "+"
                      : ""}
                    {monthlyVariation}%
                  </p>

                  <p className="mt-2 font-semibold text-zinc-300">
                    {monthlyVariation > 0
                      ? t("moreActivity")
                      : monthlyVariation < 0
                        ? t("lessActivity")
                        : t("sameActivity")}
                  </p>
                </>
              )}

              <p className="mt-2 text-sm text-zinc-500">
                {t("lastMonth", {
                  count: activityPreviousMonth,
                })}
              </p>
            </article>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-6 md:p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B5CF6]">
                {now.getFullYear()}
              </p>

              <p className="mt-4 text-4xl font-bold">
                {moviesThisYear}
              </p>

              <p className="mt-2 font-semibold text-zinc-300">
                {t("moviesThisYear")}
              </p>
            </article>

            <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-6 md:p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B5CF6]">
                {now.getFullYear()}
              </p>

              <p className="mt-4 text-4xl font-bold">
                {episodesThisYear}
              </p>

              <p className="mt-2 font-semibold text-zinc-300">
                {t("episodesThisYear")}
              </p>
            </article>

            <article className="rounded-3xl border border-[#7C3AED]/40 bg-[#7C3AED]/10 p-6 md:p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C4B5FD]">
                {t("yearlyActivity")}
              </p>

              <p className="mt-4 text-4xl font-bold text-white">
                {activityThisYear}
              </p>

              <p className="mt-2 font-semibold text-[#C4B5FD]">
                {t("moviesPlusEpisodes")}
              </p>
            </article>
          </div>

          {/* ANDAMENTO MENSILE */}
          <article className="mt-6 rounded-3xl border border-zinc-800 bg-[#151515] p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B5CF6]">
                  {t("monthlyTrend")}
                </p>

                <h3 className="mt-2 text-2xl font-bold">
                  {t("yourViewsInYear", {
                    year: now.getFullYear(),
                  })}
                </h3>

                <p className="mt-2 text-zinc-500">
                  {t("monthlyTrendDesc")}
                </p>
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-2 text-zinc-400">
                  <span className="h-3 w-3 rounded-full bg-[#7C3AED]" />
                  {t("movie")}
                </span>

                <span className="flex items-center gap-2 text-zinc-400">
                  <span className="h-3 w-3 rounded-full bg-[#2563EB]" />
                  {t("episodes")}
                </span>
              </div>
            </div>

            <div className="mt-8 overflow-x-auto">
              <div className="flex min-w-[760px] items-end gap-3">
                {monthlyActivity.map(
                  (month) => {
                    const totalHeight =
                      month.total > 0
                        ? Math.max(
                            24,
                            Math.round(
                              (month.total /
                                maxMonthlyActivity) *
                                180
                            )
                          )
                        : 8;

                    const movieRatio =
                      month.total > 0
                        ? month.movies /
                          month.total
                        : 0;

                    const movieHeight =
                      Math.round(
                        totalHeight *
                          movieRatio
                      );

                    const episodeHeight =
                      totalHeight -
                      movieHeight;

                    return (
                      <div
                        key={month.monthIndex}
                        className="flex flex-1 flex-col items-center"
                      >
                        <div className="mb-2 text-xs font-bold text-zinc-500">
                          {month.total}
                        </div>

                        <div
                          className="flex w-full max-w-10 flex-col-reverse overflow-hidden rounded-t-xl bg-zinc-800"
                          style={{
                            height: `${totalHeight}px`,
                          }}
                          title={t("chartTitle", { month: month.monthLabel, movies: month.movies, episodes: month.episodes })}
                        >
                          {movieHeight > 0 && (
                            <div
                              className="w-full bg-[#7C3AED]"
                              style={{
                                height: `${movieHeight}px`,
                              }}
                            />
                          )}

                          {episodeHeight > 0 && (
                            <div
                              className="w-full bg-[#2563EB]"
                              style={{
                                height: `${episodeHeight}px`,
                              }}
                            />
                          )}
                        </div>

                        <p className="mt-3 text-xs font-semibold text-zinc-500">
                          {month.monthLabel}
                        </p>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-black/20 p-5">
                <p className="text-sm text-zinc-500">
                  {t("moviesRecordedInYear", {
                    year: now.getFullYear(),
                  })}
                </p>

                <p className="mt-2 text-2xl font-bold">
                  🎬 {moviesThisYear}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black/20 p-5">
                <p className="text-sm text-zinc-500">
                  {t("episodesRecordedInYear", {
                    year: now.getFullYear(),
                  })}
                </p>

                <p className="mt-2 text-2xl font-bold">
                  📺 {episodesThisYear}
                </p>
              </div>
            </div>
          </article>
        </section>

        {/* I TUOI GUSTI */}
        <section className="mt-10">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8B5CF6]">
              {t("yourTastes")}
            </p>

            <h2 className="mt-2 text-2xl font-bold md:text-3xl">
              {t("whatYouWatch")}
            </h2>

            <p className="mt-2 max-w-3xl text-zinc-500">
              {t("tastesDesc")}
            </p>
          </div>

          {analyzedContents > 0 ? (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                <article className="rounded-3xl border border-[#7C3AED]/40 bg-[#7C3AED]/10 p-6 md:p-8">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C4B5FD]">
                        {t("dominantGenre")}
                      </p>

                      <h3 className="mt-3 text-3xl font-bold text-white">
                        {dominantGenre?.name ??
                          t("notAvailable")}
                      </h3>
                    </div>

                    <span className="text-4xl">
                      🎭
                    </span>
                  </div>

                  {dominantGenre && (
                    <>
                      <p className="mt-5 text-zinc-300">
                        {t.rich("genreAppearsIn", {
                          count: dominantGenre.count,
                          total: analyzedContents,
                          strong: (chunks) => (
                            <strong className="text-white">
                              {chunks}
                            </strong>
                          ),
                        })}
                      </p>

                      <div className="mt-6 h-3 overflow-hidden rounded-full bg-black/30">
                        <div
                          className="h-full rounded-full bg-[#7C3AED]"
                          style={{
                            width: `${Math.min(
                              dominantGenre.percentage,
                              100
                            )}%`,
                          }}
                        />
                      </div>

                      <p className="mt-3 text-sm font-semibold text-[#C4B5FD]">
                        {t("ofYourContent", {
                          percentage: dominantGenre.percentage,
                        })}
                      </p>
                    </>
                  )}
                </article>

                <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-6 md:p-8">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B5CF6]">
                        {t("moviesVsSeries")}
                      </p>

                      <h3 className="mt-2 text-2xl font-bold">
                        {t("whatChooseMost")}
                      </h3>
                    </div>

                    <span className="text-3xl">
                      ⚖️
                    </span>
                  </div>

                  <div className="mt-7 flex h-4 overflow-hidden rounded-full bg-zinc-800">
                    {moviePercentage > 0 && (
                      <div
                        className="h-full bg-[#7C3AED]"
                        style={{
                          width: `${moviePercentage}%`,
                        }}
                      />
                    )}

                    {seriesPercentage > 0 && (
                      <div
                        className="h-full bg-[#2563EB]"
                        style={{
                          width: `${seriesPercentage}%`,
                        }}
                      />
                    )}
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-zinc-800 bg-black/20 p-5">
                      <p className="text-2xl">
                        🎬
                      </p>

                      <p className="mt-3 text-3xl font-bold">
                        {moviePercentage}%
                      </p>

                      <p className="mt-1 text-sm text-zinc-400">
                        {t("movie")}
                      </p>

                      <p className="mt-1 text-xs text-zinc-600">
                        {t("contentsCount", {
                          count: analyzedMovies,
                        })}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-black/20 p-5">
                      <p className="text-2xl">
                        📺
                      </p>

                      <p className="mt-3 text-3xl font-bold">
                        {seriesPercentage}%
                      </p>

                      <p className="mt-1 text-sm text-zinc-400">
                        {t("tvSeries")}
                      </p>

                      <p className="mt-1 text-xs text-zinc-600">
                        {t("contentsCount", {
                          count: analyzedSeries,
                        })}
                      </p>
                    </div>
                  </div>
                </article>
              </div>

              <article className="mt-6 rounded-3xl border border-zinc-800 bg-[#151515] p-6 md:p-8">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B5CF6]">
                      {t("topGenres")}
                    </p>

                    <h3 className="mt-2 text-2xl font-bold">
                      {t("cinematicFingerprint")}
                    </h3>
                  </div>

                  <p className="text-sm text-zinc-500">
                    {analyzedContents}{" "}
                    {analyzedContents === 1
                      ? t("analyzedContentOne")
                      : t("analyzedContentMany")}
                  </p>
                </div>

                {topGenres.length > 0 ? (
                  <div className="mt-8 space-y-5">
                    {topGenres.map(
                      (genre, index) => (
                        <div
                          key={genre.name}
                          className="grid gap-3 md:grid-cols-[180px_1fr_90px] md:items-center"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7C3AED]/15 text-sm font-bold text-[#C4B5FD]">
                              {index + 1}
                            </span>

                            <p className="font-semibold text-zinc-200">
                              {genre.name}
                            </p>
                          </div>

                          <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className="h-full rounded-full bg-[#7C3AED]"
                              style={{
                                width: `${Math.min(
                                  genre.percentage,
                                  100
                                )}%`,
                              }}
                            />
                          </div>

                          <div className="text-left md:text-right">
                            <p className="font-bold text-white">
                              {genre.percentage}%
                            </p>

                            <p className="text-xs text-zinc-500">
                              {genre.count}{" "}
                              {genre.count === 1
                                ? t("titleOne")
                                : t("titleMany")}
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-dashed border-zinc-700 bg-black/20 p-5 text-zinc-500">
                    {t("notEnoughGenres")}
                  </div>
                )}
              </article>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-6 md:p-8">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B5CF6]">
                    {t("inYourProfile")}
                  </p>

                  <h3 className="mt-2 text-2xl font-bold">
                    {t("youSayYouLove")}
                  </h3>

                  {favoriteGenres.length > 0 ? (
                    <>
                      <div className="mt-6 flex flex-wrap gap-2">
                        {favoriteGenres.map(
                          (genre) => {
                            const isMatch =
                              matchingFavoriteGenres.some(
                                (match) =>
                                  normalizeGenreName(
                                    match
                                  ) ===
                                  normalizeGenreName(
                                    genre
                                  )
                              );

                            return (
                              <span
                                key={genre}
                                className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                                  isMatch
                                    ? "border-[#7C3AED]/50 bg-[#7C3AED]/15 text-[#C4B5FD]"
                                    : "border-zinc-700 bg-zinc-900 text-zinc-400"
                                }`}
                              >
                                {genre}
                              </span>
                            );
                          }
                        )}
                      </div>

                      <p className="mt-5 text-sm leading-6 text-zinc-500">
                        {t("declaredGenresDesc")}
                      </p>
                    </>
                  ) : (
                    <div className="mt-6 rounded-2xl border border-dashed border-zinc-700 bg-black/20 p-5">
                      <p className="font-semibold text-zinc-300">
                        {t("noFavoriteGenres")}
                      </p>

                      <p className="mt-2 text-sm leading-6 text-zinc-500">
                        {t("chooseGenresDesc")}
                      </p>
                    </div>
                  )}
                </article>

                <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-6 md:p-8">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B5CF6]">
                    {t("basedOnViews")}
                  </p>

                  <h3 className="mt-2 text-2xl font-bold">
                    {t("mostlyWatch")}
                  </h3>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {topGenres
                      .slice(0, 3)
                      .map((genre) => {
                        const isDeclaredFavorite =
                          favoriteTopMatches.some(
                            (favoriteGenre) =>
                              normalizeGenreName(
                                favoriteGenre
                              ) ===
                              normalizeGenreName(
                                genre.name
                              )
                          );

                        return (
                          <span
                            key={genre.name}
                            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                              isDeclaredFavorite
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                : "border-[#2563EB]/40 bg-[#2563EB]/10 text-blue-300"
                            }`}
                          >
                            {genre.name}
                            {" · "}
                            {genre.percentage}%
                          </span>
                        );
                      })}
                  </div>

                  {favoriteGenres.length > 0 &&
                  favoriteTopMatches.length > 0 ? (
                    <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                      <p className="font-semibold text-emerald-300">
                        {t("tastesConfirmed")}
                      </p>

                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        {t("tastesConfirmedDesc")}
                      </p>
                    </div>
                  ) : favoriteGenres.length > 0 ? (
                    <div className="mt-6 rounded-2xl border border-[#2563EB]/20 bg-[#2563EB]/5 p-5">
                      <p className="font-semibold text-blue-300">
                        {t("smallSurprise")}
                      </p>

                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        {t("smallSurpriseDesc")}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-6 text-sm leading-6 text-zinc-500">
                      {t("setGenresDesc")}
                    </p>
                  )}
                </article>
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-700 bg-[#151515] p-8 text-center">
              <div className="text-4xl">
                🎭
              </div>

              <h3 className="mt-4 text-xl font-bold">
                {t("profileTakingShape")}
              </h3>

              <p className="mx-auto mt-3 max-w-xl leading-7 text-zinc-500">
                {t("profileTakingShapeDesc")}
              </p>
            </div>
          )}
        </section>

        {/* ABITUDINI */}
        <section className="mt-10">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8B5CF6]">
              {t("habits")}
            </p>

            <h2 className="mt-2 text-2xl font-bold md:text-3xl">
              {t("viewingStyle")}
            </h2>

            <p className="mt-2 max-w-3xl text-zinc-500">
              {t("habitsDesc")}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-6">
              <div className="flex items-center justify-between">
                <span className="text-3xl">
                  🔁
                </span>

                <span className="rounded-full bg-[#7C3AED]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#A78BFA]">
                  {t("movie")}
                </span>
              </div>

              <p className="mt-6 text-4xl font-bold">
                {totalMovieRewatches}
              </p>

              <p className="mt-2 font-semibold text-zinc-300">
                {t("movieRewatches")}
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                {t("afterFirstView")}
              </p>
            </article>

            <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-6">
              <div className="flex items-center justify-between">
                <span className="text-3xl">
                  🎬
                </span>

                <span className="rounded-full bg-[#7C3AED]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#A78BFA]">
                  {t("movie")}
                </span>
              </div>

              <p className="mt-6 text-4xl font-bold">
                {rewatchedMoviesCount}
              </p>

              <p className="mt-2 font-semibold text-zinc-300">
                {t("rewatchedMovies")}
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                {t("titlesWithRewatch")}
              </p>
            </article>

            <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-6">
              <div className="flex items-center justify-between">
                <span className="text-3xl">
                  🔂
                </span>

                <span className="rounded-full bg-[#2563EB]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-300">
                  {t("episodes")}
                </span>
              </div>

              <p className="mt-6 text-4xl font-bold">
                {totalEpisodeRewatches}
              </p>

              <p className="mt-2 font-semibold text-zinc-300">
                {t("episodeRewatches")}
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                {t("playsBeyondFirst")}
              </p>
            </article>

            <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-6">
              <div className="flex items-center justify-between">
                <span className="text-3xl">
                  📺
                </span>

                <span className="rounded-full bg-[#2563EB]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-300">
                  {t("series")}
                </span>
              </div>

              <p className="mt-6 text-4xl font-bold">
                {seriesWithEpisodeRewatches.size}
              </p>

              <p className="mt-2 font-semibold text-zinc-300">
                {t("resumedSeries")}
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                {t("seriesWithRewatchedEpisodes")}
              </p>
            </article>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* FILM PIÙ RIVISTO */}
            <article className="rounded-3xl border border-[#7C3AED]/40 bg-[#7C3AED]/10 p-6 md:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C4B5FD]">
                    {t("favoriteReturn")}
                  </p>

                  <h3 className="mt-2 text-2xl font-bold">
                    {t("mostRewatchedMovie")}
                  </h3>
                </div>

                <span className="text-4xl">
                  👑
                </span>
              </div>

              {mostRewatchedMovie ? (
                <>
                  <p className="mt-7 text-3xl font-bold text-white">
                    {mostRewatchedMovieTitle}
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-[#7C3AED]/20 bg-black/20 p-5">
                      <p className="text-sm text-zinc-400">
                        {t("totalViews")}
                      </p>

                      <p className="mt-2 text-3xl font-bold">
                        {
                          mostRewatchedMovie.totalViews
                        }
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#7C3AED]/20 bg-black/20 p-5">
                      <p className="text-sm text-zinc-400">
                        {t("rewatch")}
                      </p>

                      <p className="mt-2 text-3xl font-bold text-[#C4B5FD]">
                        {
                          mostRewatchedMovie.rewatches
                        }
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-7 rounded-2xl border border-dashed border-[#7C3AED]/30 bg-black/20 p-5">
                  <p className="font-semibold text-zinc-300">
                    {t("noRewatchedMovie")}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {t("noRewatchedMovieDesc")}
                  </p>
                </div>
              )}
            </article>

            {/* PRIME VISIONI VS REWATCH */}
            <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-6 md:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B5CF6]">
                    {t("firstVsRewatch")}
                  </p>

                  <h3 className="mt-2 text-2xl font-bold">
                    {t("howMuchReturn")}
                  </h3>
                </div>

                <span className="text-3xl">
                  🔄
                </span>
              </div>

              {totalViewingEvents > 0 ? (
                <>
                  <div className="mt-7 flex h-4 overflow-hidden rounded-full bg-zinc-800">
                    {firstViewPercentage > 0 && (
                      <div
                        className="h-full bg-[#7C3AED]"
                        style={{
                          width: `${firstViewPercentage}%`,
                        }}
                      />
                    )}

                    {overallRewatchPercentage >
                      0 && (
                      <div
                        className="h-full bg-[#2563EB]"
                        style={{
                          width: `${overallRewatchPercentage}%`,
                        }}
                      />
                    )}
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-zinc-800 bg-black/20 p-5">
                      <p className="text-sm text-zinc-500">
                        {t("firstView")}
                      </p>

                      <p className="mt-2 text-3xl font-bold">
                        {firstViewPercentage}%
                      </p>

                      <p className="mt-2 text-xs text-zinc-600">
                        {totalFirstViewEvents} eventi
                      </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-black/20 p-5">
                      <p className="text-sm text-zinc-500">
                        {t("rewatch")}
                      </p>

                      <p className="mt-2 text-3xl font-bold text-blue-300">
                        {overallRewatchPercentage}%
                      </p>

                      <p className="mt-2 text-xs text-zinc-600">
                        {totalRewatchEvents} eventi
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-7 rounded-2xl border border-dashed border-zinc-700 bg-black/20 p-5">
                  <p className="font-semibold text-zinc-300">
                    {t("noActivity")}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {t("needViews")}
                  </p>
                </div>
              )}
            </article>
          </div>

          {/* DETTAGLIO REWATCH */}
          <article className="mt-6 rounded-3xl border border-zinc-800 bg-[#151515] p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B5CF6]">
                  {t("rewatch")}
                </p>

                <h3 className="mt-2 text-2xl font-bold">
                  {t("secondViewsRelation")}
                </h3>

                <p className="mt-2 max-w-3xl text-zinc-500">
                  {t("secondViewsDesc")}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black/20 px-5 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {t("totalRewatches")}
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {totalRewatchEvents}
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-black/20 p-6">
                <div className="flex items-center justify-between">
                  <p className="font-bold">
                    🎬 {t("movie")}
                  </p>

                  <span className="text-sm font-bold text-[#A78BFA]">
                    {movieRewatchPercentage}%
                  </span>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-[#7C3AED]"
                    style={{
                      width: `${Math.min(
                        movieRewatchPercentage,
                        100
                      )}%`,
                    }}
                  />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-zinc-500">
                      {t("views")}
                    </p>

                    <p className="mt-1 font-bold">
                      {totalMovieViewingEvents}
                    </p>
                  </div>

                  <div>
                    <p className="text-zinc-500">
                      {t("rewatch")}
                    </p>

                    <p className="mt-1 font-bold">
                      {totalMovieRewatches}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black/20 p-6">
                <div className="flex items-center justify-between">
                  <p className="font-bold">
                    📺 {t("episodes")}
                  </p>

                  <span className="text-sm font-bold text-blue-300">
                    {episodeRewatchPercentage}%
                  </span>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-[#2563EB]"
                    style={{
                      width: `${Math.min(
                        episodeRewatchPercentage,
                        100
                      )}%`,
                    }}
                  />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-zinc-500">
                      {t("views")}
                    </p>

                    <p className="mt-1 font-bold">
                      {totalEpisodeViewingEvents}
                    </p>
                  </div>

                  <div>
                    <p className="text-zinc-500">
                      {t("rewatch")}
                    </p>

                    <p className="mt-1 font-bold">
                      {totalEpisodeRewatches}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {(rewatchedMoviesCount > 0 ||
              rewatchedEpisodesCount > 0) && (
              <div className="mt-6 rounded-2xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-5">
                <p className="font-semibold text-[#C4B5FD]">
                  {t("vaultHasMemory")}
                </p>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {t("rewatchedSummary", {
                    movies: rewatchedMoviesCount,
                    episodes: rewatchedEpisodesCount,
                    episodeLabel:
                      rewatchedEpisodesCount === 1
                        ? t("episodeOne")
                        : t("episodeMany"),
                  })}
                </p>
              </div>
            )}
          </article>
        </section>

        {/* TRAGUARDI */}
        <section className="mt-10">
          <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8B5CF6]">
                {t("achievements")}
              </p>

              <h2 className="mt-2 text-2xl font-bold md:text-3xl">
                {t("yourStory")}
              </h2>

              <p className="mt-2 max-w-3xl leading-7 text-zinc-500">
                {t("achievementsDesc")}
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-5 py-4">
              <span className="text-3xl">
                🏆
              </span>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#C4B5FD]">
                  {t("levelsEarned")}
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {totalAchievementLevels}
                </p>
              </div>
            </div>
          </div>

          {closestAchievement && (
            <article className="mb-6 overflow-hidden rounded-3xl border border-[#7C3AED]/40 bg-[#7C3AED]/10 p-6 md:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#7C3AED]/20 text-3xl">
                    {closestAchievement.icon}
                  </div>

                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C4B5FD]">
                      {t("nextAchievement")}
                    </p>

                    <h3 className="mt-2 text-2xl font-bold md:text-3xl">
                      {closestAchievement.title}{" "}
                      {toRomanNumeral(
                        closestAchievement.level + 1
                      )}
                    </h3>

                    <p className="mt-2 text-zinc-400">
                      {t("missingForNext", {
                        remaining: closestAchievement.remaining,
                        unit: closestAchievement.unit,
                      })}
                    </p>
                  </div>
                </div>

                <div className="min-w-44 rounded-2xl border border-[#7C3AED]/30 bg-black/20 p-5 text-center">
                  <p className="text-sm text-zinc-400">
                    {t("progress")}
                  </p>

                  <p className="mt-1 text-3xl font-bold text-[#C4B5FD]">
                    {closestAchievement.progressPercentage}%
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    {closestAchievement.value} /{" "}
                    {closestAchievement.nextThreshold}
                  </p>
                </div>
              </div>

              <div className="mt-6 h-3 overflow-hidden rounded-full bg-black/30">
                <div
                  className="h-full rounded-full bg-[#7C3AED]"
                  style={{
                    width: `${closestAchievement.progressPercentage}%`,
                  }}
                />
              </div>
            </article>
          )}

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {achievements.map(
              (achievement) => (
                <article
                  key={achievement.key}
                  className={`rounded-3xl border p-6 transition hover:-translate-y-1 ${
                    achievement.level > 0
                      ? "border-[#7C3AED]/30 bg-[#151515] hover:border-[#7C3AED]/70"
                      : "border-zinc-800 bg-[#151515] hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${
                          achievement.level > 0
                            ? "bg-[#7C3AED]/15"
                            : "bg-zinc-900"
                        }`}
                      >
                        {achievement.icon}
                      </div>

                      <div>
                        <p className="font-bold">
                          {achievement.title}
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          {achievement.unit}
                        </p>
                      </div>
                    </div>

                    {achievement.level > 0 ? (
                      <span className="rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/15 px-3 py-1 text-xs font-bold text-[#C4B5FD]">
                        LIV.{" "}
                        {toRomanNumeral(
                          achievement.level
                        )}
                      </span>
                    ) : (
                      <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-bold text-zinc-500">
                        {t("locked")}
                      </span>
                    )}
                  </div>

                  <div className="mt-6 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-4xl font-bold">
                        {achievement.value}
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        {t("currentTotal")}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-300">
                        {achievement.nextThreshold}
                      </p>

                      <p className="mt-1 text-xs text-zinc-600">
                        {t("nextLevel")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${
                        achievement.level > 0
                          ? "bg-[#7C3AED]"
                          : "bg-zinc-600"
                      }`}
                      style={{
                        width: `${achievement.progressPercentage}%`,
                      }}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4 text-xs">
                    <span className="text-zinc-500">
                      {achievement.level > 0
                        ? t("levelThreshold", {
                            level: toRomanNumeral(achievement.level),
                            threshold: achievement.currentThreshold,
                          })
                        : t("firstLevelNotEarned")}
                    </span>

                    <span className="font-semibold text-zinc-400">
                      -{achievement.remaining}
                    </span>
                  </div>
                </article>
              )
            )}
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-6 md:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B5CF6]">
                {t("collection")}
              </p>

              <h3 className="mt-2 text-2xl font-bold">
                {t("activeAchievements")}
              </h3>

              <p className="mt-4 leading-7 text-zinc-400">
                {t("activeAchievementSummary", {
                  unlocked: unlockedAchievements.length,
                  total: achievements.length,
                })}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {unlockedAchievements.length > 0 ? (
                  unlockedAchievements.map(
                    (achievement) => (
                      <span
                        key={achievement.key}
                        className="rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-4 py-2 text-sm font-semibold text-[#C4B5FD]"
                      >
                        {achievement.icon}{" "}
                        {achievement.title}{" "}
                        {toRomanNumeral(
                          achievement.level
                        )}
                      </span>
                    )
                  )
                ) : (
                  <p className="text-sm text-zinc-500">
                    {t("firstBadgeWaiting")}
                  </p>
                )}
              </div>
            </article>

            <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-6 md:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B5CF6]">
                {t("infiniteSystem")}
              </p>

              <h3 className="mt-2 text-2xl font-bold">
                {t("noLastLevel")}
              </h3>

              <p className="mt-4 leading-7 text-zinc-400">
                {t("noLevelCapDesc")}
              </p>

              <div className="mt-6 rounded-2xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-5">
                <p className="font-semibold text-[#C4B5FD]">
                  {t("challengeContinues")}
                </p>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {t("challengeDesc")}
                </p>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}