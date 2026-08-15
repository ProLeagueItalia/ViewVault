import Navbar from "../../../components/Navbar";
import BackButton from "../../../components/BackButton";
import SeasonEpisodes, {
  type SeasonWithEpisodes,
} from "../../../components/SeasonEpisodes";
import SeriesReview from "../../../components/SeriesReview";
import SeriesVaultActions, {
  type SeriesVaultStatus,
} from "../../../components/SeriesVaultActions";

import { createClient } from "../../../lib/supabase/server";

import {
  getSeries,
  getSeriesCredits,
  getSeriesSeason,
  getSeriesVideos,
} from "../../../lib/tmdb";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Genre = {
  id: number;
  name: string;
};

type CastMember = {
  id: number;
  name: string;
  character?: string;
  profile_path: string | null;
};

type Video = {
  key: string;
  site: string;
  type: string;
  official?: boolean;
};

type SeasonSummary = {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
  overview: string;
};

type SeriesDetails = {
  id: number;
  name: string;
  tagline?: string;
  overview: string;
  first_air_date: string;
  last_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language: string;
  status: string;
  poster_path: string | null;
  backdrop_path: string | null;
  number_of_seasons: number;
  number_of_episodes: number;
  genres: Genre[];
  seasons: SeasonSummary[];
};

type CreditsResponse = {
  cast?: CastMember[];
};

type VideosResponse = {
  results?: Video[];
};

type SeasonEpisode = {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  air_date: string | null;
  runtime: number | null;
  still_path: string | null;
};

type SeasonDetailsResponse = {
  id: number;
  name: string;
  season_number: number;
  episodes?: SeasonEpisode[];
};

type SeriesProgressRow = {
  watched_episodes: number;
  total_episodes: number;
  status: "watchlist" | "in_progress" | "watched";
};

type SeriesVaultRow = {
  status: "watchlist" | "watched";
  is_favorite: boolean;
  rating: number | null;
  review: string | null;
};

export default async function SeriesPage({
  params,
}: PageProps) {
  const { id } = await params;

  const [seriesData, creditsData, videosData] =
    await Promise.all([
      getSeries(id),
      getSeriesCredits(id),
      getSeriesVideos(id),
    ]);

  const series = seriesData as SeriesDetails;
  const credits = creditsData as CreditsResponse;
  const videos = videosData as VideosResponse;

  const cast = credits.cast?.slice(0, 8) ?? [];

  const trailer =
    videos.results?.find(
      (video) =>
        video.site === "YouTube" &&
        video.type === "Trailer" &&
        video.official
    ) ??
    videos.results?.find(
      (video) =>
        video.site === "YouTube" &&
        video.type === "Trailer"
    );

  const posterUrl = series.poster_path
    ? `https://image.tmdb.org/t/p/w500${series.poster_path}`
    : "/viewvault-logo.svg";

  const backdropUrl = series.backdrop_path
    ? `https://image.tmdb.org/t/p/original${series.backdrop_path}`
    : "";

  const firstYear = series.first_air_date
    ? series.first_air_date.slice(0, 4)
    : "N/D";

  const regularSeasons =
    series.seasons?.filter(
      (season) =>
        season.season_number > 0 &&
        season.episode_count > 0
    ) ?? [];

  const seasonResults = await Promise.allSettled(
    regularSeasons.map(async (season) => {
      const seasonData = (await getSeriesSeason(
        id,
        season.season_number
      )) as SeasonDetailsResponse;

      return {
        id: seasonData.id ?? season.id,
        name: seasonData.name ?? season.name,
        season_number: season.season_number,
        episodes: seasonData.episodes ?? [],
      } satisfies SeasonWithEpisodes;
    })
  );

  const seasonsWithEpisodes: SeasonWithEpisodes[] =
    seasonResults
      .filter(
        (
          result
        ): result is PromiseFulfilledResult<SeasonWithEpisodes> =>
          result.status === "fulfilled"
      )
      .map((result) => result.value)
      .sort(
        (firstSeason, secondSeason) =>
          firstSeason.season_number -
          secondSeason.season_number
      );

  /*
   * PROGRESSO + RECENSIONE UTENTE
   */

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let watchedEpisodesCount = 0;
  let progressStatus:
    | "watchlist"
    | "in_progress"
    | "watched"
    | null = null;

  let userRating: number | null = null;
  let userReview = "";
  let isFavorite = false;
let vaultItemStatus:
  | "watchlist"
  | "watched"
  | null = null;

  if (user) {
    const [
      progressResponse,
      vaultResponse,
    ] = await Promise.all([
      supabase
        .from("series_progress")
        .select(
          "watched_episodes, total_episodes, status"
        )
        .eq("user_id", user.id)
        .eq("series_id", series.id)
        .maybeSingle(),

      supabase
  .from("vault_items")
  .select(
    "status, is_favorite, rating, review"
  )
  .eq("user_id", user.id)
  .eq("tmdb_id", series.id)
  .eq("media_type", "tv")
  .maybeSingle(),
    ]);

    if (progressResponse.error) {
      console.error(
        "Errore nel recupero del progresso della serie:",
        progressResponse.error
      );
    }

    if (vaultResponse.error) {
      console.error(
        "Errore nel recupero della recensione della serie:",
        vaultResponse.error
      );
    }

    const progressRow =
      progressResponse.data as
        | SeriesProgressRow
        | null;

    const vaultRow =
      vaultResponse.data as
        | SeriesVaultRow
        | null;

    watchedEpisodesCount =
      progressRow?.watched_episodes ?? 0;

    progressStatus =
      progressRow?.status ?? null;

    vaultItemStatus =
  vaultRow?.status ?? null;

isFavorite =
  vaultRow?.is_favorite ?? false;

userRating =
  vaultRow?.rating ?? null;

userReview =
  vaultRow?.review ?? "";
  }

const seriesVaultStatus: SeriesVaultStatus =
  progressStatus === "watched"
    ? "watched"
    : progressStatus === "in_progress"
      ? "in_progress"
      : vaultItemStatus === "watchlist"
        ? "watchlist"
        : progressStatus === "watchlist"
          ? "watchlist"
          : null;

  const canReviewSeries =
    watchedEpisodesCount > 0 ||
    progressStatus === "in_progress" ||
    progressStatus === "watched";

  return (
  <main className="min-h-screen bg-[#121212] text-[#F8FAFC]">
    <Navbar />

    <section
      className="relative min-h-screen bg-cover bg-center"
        style={{
          backgroundImage: backdropUrl
            ? `linear-gradient(
                to bottom,
                rgba(18, 18, 18, 0.35),
                #121212 80%
              ),
              url(${backdropUrl})`
            : "none",
        }}
      >
        <div className="mx-auto max-w-7xl px-6 py-10">
          <BackButton fallbackHref="/serie-tv" />

          <div className="mt-14 grid gap-10 md:grid-cols-[340px_1fr]">
            <div>
              <div className="relative overflow-hidden rounded-3xl border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                <img
                  src={posterUrl}
                  alt={series.name}
                  className="w-full"
                />

                <span className="absolute left-4 top-4 rounded-full bg-[#7C3AED] px-4 py-2 text-sm font-bold text-white">
                  Serie TV
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-black/45 p-8 backdrop-blur-md">
              <h1 className="text-5xl font-bold md:text-7xl">
                {series.name}
              </h1>

              {series.tagline && (
                <p className="mt-4 text-xl italic text-zinc-300">
                  “{series.tagline}”
                </p>
              )}

              <p className="mt-5 text-lg text-zinc-300">
                {firstYear} • {series.number_of_seasons}{" "}
                {series.number_of_seasons === 1
                  ? "stagione"
                  : "stagioni"}{" "}
                • {series.number_of_episodes} episodi • ⭐{" "}
                {series.vote_average?.toFixed(1)}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                {series.genres?.map((genre) => (
                  <span
                    key={genre.id}
                    className="rounded-full bg-[#7C3AED]/25 px-4 py-2 text-sm font-semibold text-[#C4B5FD]"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>

              <p className="mt-8 max-w-4xl text-lg leading-8 text-zinc-200">
                {series.overview ||
                  "Trama non disponibile."}
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                <InfoBox
                  label="Stagioni"
                  value={series.number_of_seasons}
                />

                <InfoBox
                  label="Episodi"
                  value={series.number_of_episodes}
                />

                <InfoBox
                  label="Lingua"
                  value={series.original_language?.toUpperCase()}
                />

                <InfoBox
                  label="Stato"
                  value={series.status}
                />
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <div className="rounded-full bg-[#7C3AED] px-8 py-4 text-center text-lg font-semibold text-white shadow-[0_0_30px_rgba(124,58,237,0.45)]">
                  Seleziona gli episodi visti
                </div>

                {trailer && (
                  <a
                    href={`https://www.youtube.com/watch?v=${trailer.key}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-zinc-700 px-8 py-4 text-center text-lg font-semibold text-white transition hover:border-[#7C3AED]"
                  >
                    ▶ Guarda trailer
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* STAGIONI ED EPISODI */}
          {seasonsWithEpisodes.length > 0 ? (
            <SeasonEpisodes
              seriesId={series.id}
              seasons={seasonsWithEpisodes}
            />
          ) : (
            <section className="mt-16 rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/70 p-12 text-center">
              <p className="text-4xl">📺</p>

              <h2 className="mt-5 text-2xl font-bold">
                Episodi non disponibili
              </h2>

              <p className="mt-3 text-zinc-400">
                Non è stato possibile recuperare gli episodi
                di questa serie.
              </p>
            </section>
          )}

          {/* VOTO E RECENSIONE */}

          {canReviewSeries && (
            <SeriesReview
              seriesId={series.id}
              initialRating={userRating}
              initialReview={userReview}
            />
          )}

          {/* TRAILER */}
          {trailer && (
            <section className="mt-16">
              <h2 className="text-3xl font-bold">
                🎥 Trailer
              </h2>

              <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-800">
                <iframe
                  className="aspect-video w-full"
                  src={`https://www.youtube-nocookie.com/embed/${trailer.key}`}
                  title={`Trailer di ${series.name}`}
                  allowFullScreen
                />
              </div>
            </section>
          )}

          {/* CAST */}
          <section className="mt-16">
            <h2 className="text-3xl font-bold">
              🎭 Cast principale
            </h2>

            {cast.length > 0 ? (
              <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
                {cast.map((person) => {
                  const profileUrl =
                    person.profile_path
                      ? `https://image.tmdb.org/t/p/w300${person.profile_path}`
                      : "/viewvault-logo.svg";

                  return (
                    <article
                      key={person.id}
                      className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900"
                    >
                      <img
                        src={profileUrl}
                        alt={person.name}
                        className="h-64 w-full object-cover"
                      />

                      <div className="p-4">
                        <p className="font-bold">
                          {person.name}
                        </p>

                        <p className="text-sm text-zinc-400">
                          {person.character ||
                            "Personaggio non disponibile"}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="mt-6 text-zinc-400">
                Cast non disponibile.
              </p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <p className="text-sm text-zinc-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold">
        {value || "N/D"}
      </p>
    </div>
  );
}