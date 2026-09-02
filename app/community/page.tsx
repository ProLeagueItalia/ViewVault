import { getLocale, getTranslations } from "next-intl/server";

import Navbar from "../../components/Navbar";
import BackButton from "../../components/BackButton";
import FriendFinder from "../../components/FriendFinder";
import FriendsActivityFeed from "../../components/FriendsActivityFeed";
import RankingsSection, {
  type RankingItem,
  type RankingScope,
} from "../../components/RankingsSection";

import { createClient } from "../../lib/supabase/server";
import {
  getMovie,
  getPosterUrl,
  getSeries,
} from "../../lib/tmdb";
import { getTmdbLanguage } from "../../i18n/config";

type MovieRankingRow = {
  tmdb_id: number;
  total_views: number | string;
  unique_viewers: number | string;
};

type SeriesRankingRow = {
  series_id: number;
  equivalent_views: number | string;
  episode_views: number | string;
  unique_viewers: number | string;
};

type MovieDetails = {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
};

type SeriesDetails = {
  id: number;
  name: string;
  first_air_date: string;
  poster_path: string | null;
};

const scopes: RankingScope[] = [
  "friends",
  "country",
  "world",
];

function emptyRankings(): Record<
  RankingScope,
  RankingItem[]
> {
  return {
    friends: [],
    country: [],
    world: [],
  };
}

export default async function CommunityPage() {
  const locale = await getLocale();
  const t = await getTranslations({
    locale,
    namespace: "Community",
  });
  const tmdbLanguage = getTmdbLanguage(locale);
  const supabase = await createClient();

  const features = [
    {
      icon: "💬",
      title: t("featureChatTitle"),
      description: t("featureChatDescription"),
    },
    {
      icon: "🎬",
      title: t("featureChannelsTitle"),
      description: t("featureChannelsDescription"),
    },
    {
      icon: "👥",
      title: t("featureGroupsTitle"),
      description: t("featureGroupsDescription"),
    },
    {
      icon: "🍿",
      title: t("featureRecommendationsTitle"),
      description: t("featureRecommendationsDescription"),
    },
  ];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const movieRankings = emptyRankings();
  const seriesRankings = emptyRankings();

  let countryCode: string | null = null;
  let rankingsError = "";

  if (user) {
    const profileResponse = await supabase
      .from("profiles")
      .select("country_code")
      .eq("id", user.id)
      .maybeSingle();

    if (!profileResponse.error) {
      countryCode =
        profileResponse.data?.country_code ?? null;
    }

    const rankingResponses = await Promise.all(
      scopes.flatMap((scope) => [
        supabase.rpc("get_movie_rankings", {
          p_scope: scope,
          p_limit: 10,
        }),
        supabase.rpc("get_series_rankings", {
          p_scope: scope,
          p_limit: 10,
        }),
      ])
    );

    const movieRowsByScope =
      new Map<RankingScope, MovieRankingRow[]>();

    const seriesRowsByScope =
      new Map<RankingScope, SeriesRankingRow[]>();

    scopes.forEach((scope, index) => {
      const movieResponse =
        rankingResponses[index * 2];

      const seriesResponse =
        rankingResponses[index * 2 + 1];

      if (movieResponse.error) {
        console.warn(
          `Errore classifica film (${scope}):`,
          {
            message: movieResponse.error.message,
            details: movieResponse.error.details,
            hint: movieResponse.error.hint,
            code: movieResponse.error.code,
          }
        );
      }

      if (seriesResponse.error) {
        console.warn(
          `Errore classifica serie (${scope}):`,
          {
            message: seriesResponse.error.message,
            details: seriesResponse.error.details,
            hint: seriesResponse.error.hint,
            code: seriesResponse.error.code,
          }
        );
      }

      movieRowsByScope.set(
        scope,
        (movieResponse.data as
          | MovieRankingRow[]
          | null) ?? []
      );

      seriesRowsByScope.set(
        scope,
        (seriesResponse.data as
          | SeriesRankingRow[]
          | null) ?? []
      );
    });

    if (
      rankingResponses.some(
        (response) => response.error
      )
    ) {
      rankingsError =
        t("rankingsUnavailable");
    }

    const movieIds = Array.from(
      new Set(
        Array.from(
          movieRowsByScope.values()
        ).flatMap((rows) =>
          rows.map((row) => row.tmdb_id)
        )
      )
    );

    const seriesIds = Array.from(
      new Set(
        Array.from(
          seriesRowsByScope.values()
        ).flatMap((rows) =>
          rows.map((row) => row.series_id)
        )
      )
    );

    const movieDetailsResults =
      await Promise.allSettled(
        movieIds.map(async (movieId) => {
          const movie = (await getMovie(
            String(movieId),
            tmdbLanguage
          )) as MovieDetails;

          return [movieId, movie] as const;
        })
      );

    const seriesDetailsResults =
      await Promise.allSettled(
        seriesIds.map(async (seriesId) => {
          const series = (await getSeries(
            String(seriesId),
            tmdbLanguage
          )) as SeriesDetails;

          return [seriesId, series] as const;
        })
      );

    const movieDetailsMap = new Map<
      number,
      MovieDetails
    >();

    for (const result of movieDetailsResults) {
      if (result.status === "fulfilled") {
        movieDetailsMap.set(
          result.value[0],
          result.value[1]
        );
      }
    }

    const seriesDetailsMap = new Map<
      number,
      SeriesDetails
    >();

    for (const result of seriesDetailsResults) {
      if (result.status === "fulfilled") {
        seriesDetailsMap.set(
          result.value[0],
          result.value[1]
        );
      }
    }

    for (const scope of scopes) {
      movieRankings[scope] = (
        movieRowsByScope.get(scope) ?? []
      )
        .map(
          (
            row,
            index
          ): RankingItem | null => {
            const movie =
              movieDetailsMap.get(row.tmdb_id);

            if (!movie) {
              return null;
            }

            return {
              rank: index + 1,
              tmdbId: row.tmdb_id,
              mediaType: "movie",
              title: movie.title,
              year: movie.release_date
                ? movie.release_date.slice(0, 4)
                : t("notAvailable"),
              posterUrl: getPosterUrl(
                movie.poster_path
              ),
              totalViews: Number(
                row.total_views
              ),
              uniqueViewers: Number(
                row.unique_viewers
              ),
              equivalentViews: null,
              episodeViews: null,
            };
          }
        )
        .filter(
          (item): item is RankingItem =>
            item !== null
        );

      seriesRankings[scope] = (
        seriesRowsByScope.get(scope) ?? []
      )
        .map(
          (
            row,
            index
          ): RankingItem | null => {
            const series =
              seriesDetailsMap.get(
                row.series_id
              );

            if (!series) {
              return null;
            }

            return {
              rank: index + 1,
              tmdbId: row.series_id,
              mediaType: "tv",
              title: series.name,
              year: series.first_air_date
                ? series.first_air_date.slice(
                    0,
                    4
                  )
                : t("notAvailable"),
              posterUrl: getPosterUrl(
                series.poster_path
              ),
              totalViews: null,
              uniqueViewers: Number(
                row.unique_viewers
              ),
              equivalentViews: Number(
                row.equivalent_views
              ),
              episodeViews: Number(
                row.episode_views
              ),
            };
          }
        )
        .filter(
          (item): item is RankingItem =>
            item !== null
        );
    }
  }

  return (
    <main className="min-h-screen bg-[#121212] text-[#F8FAFC]">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-6">
        <div className="mb-8">
          <BackButton fallbackHref="/" />
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-[#7C3AED]/30 bg-gradient-to-br from-[#24153A] via-[#18181B] to-[#111827] p-8 md:p-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-[#7C3AED]/40 bg-[#7C3AED]/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-[#C4B5FD]">
              {t("community")}
            </div>

            <p className="mt-8 text-sm font-bold uppercase tracking-[0.22em] text-[#A78BFA]">
              {t("viewVaultCommunity")}
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">
              {t("heroTitle")}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300 md:text-xl">
              {t("heroDescription")}
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <span className="rounded-full border border-zinc-700 bg-black/20 px-4 py-2 text-sm font-semibold text-zinc-300">
              {t("rankings")}
            </span>

            <span className="rounded-full border border-zinc-700 bg-black/20 px-4 py-2 text-sm font-semibold text-zinc-300">
              {t("friends")}
            </span>

            <span className="rounded-full border border-zinc-700 bg-black/20 px-4 py-2 text-sm font-semibold text-zinc-300">
              {t("italy")}
            </span>

            <span className="rounded-full border border-zinc-700 bg-black/20 px-4 py-2 text-sm font-semibold text-zinc-300">
              {t("world")}
            </span>
          </div>
        </div>

        {user && (
          <FriendFinder
            currentUserId={user.id}
          />
        )}

        {user && <FriendsActivityFeed />}

        <RankingsSection
          isLoggedIn={Boolean(user)}
          countryCode={countryCode}
          movieRankings={movieRankings}
          seriesRankings={seriesRankings}
          errorMessage={rankingsError}
        />

        <section className="mt-12">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#8B5CF6]">
            {t("comingSoon")}
          </p>

          <h2 className="mt-2 text-3xl font-bold text-white">
            {t("spaceBuiltForCommunity")}
          </h2>

          <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
            {t("communityFutureDescription")}
          </p>

          <div className="mt-7 grid gap-5 md:grid-cols-2">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-3xl border border-zinc-800 bg-[#18181B] p-7 transition hover:border-[#7C3AED]/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="text-3xl">
                    {feature.icon}
                  </div>

                  <span className="rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#C4B5FD]">
                    {t("comingSoon")}
                  </span>
                </div>

                <h3 className="mt-6 text-xl font-bold text-white">
                  {feature.title}
                </h3>

                <p className="mt-3 leading-7 text-zinc-400">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 overflow-hidden rounded-3xl border border-[#7C3AED]/40 bg-[#7C3AED]/10 p-7 md:p-9">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
                {t("viewVaultPro")}
              </p>

              <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">
                {t("moreSpaceForCommunity")}
              </h2>

              <p className="mt-4 leading-7 text-zinc-300">
                Alcune funzionalità avanzate
                della Community potranno essere
                riservate ai futuri piani
                {t("viewVaultPro")} o Premium. Prezzi e
                caratteristiche verranno definiti
                più avanti, quando il servizio
                sarà pronto.
              </p>
            </div>

            <div className="shrink-0 rounded-3xl border border-[#7C3AED]/30 bg-black/20 px-6 py-5 text-center">
              <div className="text-3xl">
                ✨
              </div>

              <p className="mt-2 font-bold text-white">
                {t("proPremium")}
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                {t("detailsComingSoon")}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-zinc-800 bg-[#18181B] p-7 md:p-9">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
            {t("inTheMeantime")}
          </p>

          <h2 className="mt-2 text-2xl font-bold text-white">
            {t("friendshipsActive")}
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-zinc-400">
            {t("friendshipsDescription")}
          </p>

          <p className="mt-4 text-sm font-semibold text-[#C4B5FD]">
            {t("buildYourNetwork")}
          </p>
        </section>
      </section>
    </main>
  );
}