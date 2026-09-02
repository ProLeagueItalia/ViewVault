import { getLocale, getTranslations } from "next-intl/server";

import Navbar from "../../../components/Navbar";
import BackButton from "../../../components/BackButton";
import MovieVaultActions, {
  type MovieVaultStatus,
} from "../../../components/MovieVaultActions";
import MovieReview from "../../../components/MovieReview";
import MediaComments from "../../../components/MediaComments";
import WatchProviders from "../../../components/WatchProviders";

import { createClient } from "../../../lib/supabase/server";
import { getTmdbLanguage } from "../../../i18n/config";

import {
  getMovie,
  getMovieCredits,
  getMovieVideos,
  getMovieWatchProviders,
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

type MovieDetails = {
  id: number;
  title: string;
  tagline?: string;
  overview: string;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language: string;
  status: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genres?: Genre[];
};

type CreditsResponse = {
  cast?: CastMember[];
};

type VideosResponse = {
  results?: Video[];
};

type VaultStatusRow = {
  status: "watched" | "watchlist";
  is_favorite: boolean;
  rating: number | null;
  review: string | null;
};

export default async function MoviePage({
  params,
}: PageProps) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getTranslations({
    locale,
    namespace: "MovieDetails",
  });
  const tmdbLanguage = getTmdbLanguage(locale);

  const [
  movieData,
  creditsData,
  videosData,
  watchProviders,
] = await Promise.all([
  getMovie(id, tmdbLanguage),
  getMovieCredits(id, tmdbLanguage),
  getMovieVideos(id, tmdbLanguage),
  getMovieWatchProviders(id),
]);

  const movie = movieData as MovieDetails;
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

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let vaultStatus: MovieVaultStatus = null;
  let isFavorite = false;
  let userRating: number | null = null;
  let userReview = "";
  let watchCount = 0;

  if (user) {
    const { data, error } = await supabase
      .from("vault_items")
      .select(
        "status, is_favorite, rating, review"
      )
      .eq("user_id", user.id)
      .eq("tmdb_id", movie.id)
      .eq("media_type", "movie")
      .maybeSingle();

    if (error) {
      console.error(
        "Errore nel recupero dello stato del film:",
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
      );
    }

    const vaultRow =
      data as VaultStatusRow | null;

    if (
      vaultRow?.status === "watched" ||
      vaultRow?.status === "watchlist"
    ) {
      vaultStatus = vaultRow.status;
      isFavorite =
        vaultRow.is_favorite ?? false;

      userRating =
        vaultRow.rating ?? null;

      userReview =
        vaultRow.review ?? "";
    }

    const {
      count: movieWatchCount,
      error: watchCountError,
    } = await supabase
      .from("watch_events")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("user_id", user.id)
      .eq("tmdb_id", movie.id)
      .eq("media_type", "movie");

    if (watchCountError) {
      console.error(
        "Errore nel recupero del numero di visioni:",
        {
          message: watchCountError.message,
          details: watchCountError.details,
          hint: watchCountError.hint,
          code: watchCountError.code,
        }
      );
    } else {
      watchCount = movieWatchCount ?? 0;
    }
  }

  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : "/viewvault-logo.svg";

  const backdropUrl = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : "";

  const releaseYear = movie.release_date
    ? movie.release_date.slice(0, 4)
    : t("notAvailable");

  const runtime = movie.runtime
    ? t("minutes", { minutes: movie.runtime })
    : t("durationUnavailable");

  return (
  <main className="min-h-screen bg-[#121212] text-[#F8FAFC]">
    <Navbar />

    <section
        className="relative min-h-screen bg-cover bg-center"
        style={{
          backgroundImage: backdropUrl
            ? `linear-gradient(
                to bottom,
                rgba(18,18,18,0.35),
                #121212 80%
              ),
              url(${backdropUrl})`
            : "none",
        }}
      >
        <div className="mx-auto max-w-7xl px-6 py-10">
          <BackButton fallbackHref="/ricerca" />

          <div className="mt-14 grid gap-10 md:grid-cols-[340px_1fr]">
            <div className="relative">
              <img
                src={posterUrl}
                alt={movie.title}
                className="w-full rounded-3xl border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
              />

              {vaultStatus && (
                <span
                  className={`absolute left-4 top-4 rounded-full px-4 py-2 text-sm font-bold text-white shadow-lg ${
                    vaultStatus === "watched"
                      ? "bg-green-600"
                      : "bg-[#7C3AED]"
                  }`}
                >
                  {vaultStatus === "watched"
                    ? t("watched")
                    : t("watchlist")}
                </span>
              )}

              {isFavorite && (
                <span
                  className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-2xl shadow-lg"
                  title={t("favorite")}
                  aria-label={t("favoriteMovie")}
                >
                  ❤️
                </span>
              )}
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-black/45 p-8 backdrop-blur-md">
              <h1 className="text-5xl font-bold md:text-7xl">
                {movie.title}
              </h1>

              {movie.tagline && (
                <p className="mt-4 text-xl italic text-zinc-300">
                  “{movie.tagline}”
                </p>
              )}

              <p className="mt-5 text-lg text-zinc-300">
                {releaseYear} • {runtime} • ⭐{" "}
                {movie.vote_average?.toFixed(1)}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                {movie.genres?.map((genre) => (
                  <span
                    key={genre.id}
                    className="rounded-full bg-[#7C3AED]/25 px-4 py-2 text-sm font-semibold text-[#C4B5FD]"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>

              <p className="mt-8 max-w-4xl text-lg leading-8 text-zinc-200">
                {movie.overview || t("overviewUnavailable")}
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                <InfoBox
                  label={t("popularity")}
                  value={Math.round(
                    movie.popularity ?? 0
                  )}
                  fallback={t("notAvailable")}
                />

                <InfoBox
                  label={t("votes")}
                  value={movie.vote_count}
                  fallback={t("notAvailable")}
                />

                <InfoBox
                  label={t("language")}
                  value={movie.original_language?.toUpperCase()}
                  fallback={t("notAvailable")}
                />

                <InfoBox
                  label={t("status")}
                  value={movie.status}
                  fallback={t("notAvailable")}
                />
              </div>

              <div className="mt-8 flex flex-col gap-4">
                <MovieVaultActions
                  movieId={movie.id}
                  initialStatus={vaultStatus}
                  initialFavorite={isFavorite}
                  initialWatchCount={watchCount}
                />

                {trailer && (
                  <a
                    href={`https://www.youtube.com/watch?v=${trailer.key}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-fit rounded-full border border-zinc-700 px-8 py-4 text-center text-lg font-semibold text-white transition hover:border-[#7C3AED]"
                  >
                    {t("watchTrailer")}
                  </a>
                )}
              </div>
            </div>
          </div>

          <WatchProviders
  providers={watchProviders}
  title={movie.title}
  countryLabel="Italia"
/>

          {vaultStatus === "watched" && (
            <MovieReview
              movieId={movie.id}
              initialRating={userRating}
              initialReview={userReview}
            />
          )}

          <MediaComments
            tmdbId={movie.id}
            mediaType="movie"
          />

          {trailer && (
            <section className="mt-16">
              <h2 className="text-3xl font-bold">
                {t("trailer")}
              </h2>

              <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-800">
                <iframe
                  className="aspect-video w-full"
                  src={`https://www.youtube-nocookie.com/embed/${trailer.key}`}
                  title={t("trailerOf", { title: movie.title })}
                  allowFullScreen
                />
              </div>
            </section>
          )}

          <section className="mt-16">
            <h2 className="text-3xl font-bold">
              {t("mainCast")}
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
                          {person.character || t("characterUnavailable")}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="mt-6 text-zinc-400">
                {t("castUnavailable")}
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
  fallback,
}: {
  label: string;
  value:
    | string
    | number
    | undefined
    | null;
  fallback: string;
}) {
  const displayValue =
    value === undefined ||
    value === null ||
    value === ""
      ? fallback
      : value;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <p className="text-sm text-zinc-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold">
        {displayValue}
      </p>
    </div>
  );
}