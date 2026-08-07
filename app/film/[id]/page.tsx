import BackButton from "../../../components/BackButton";
import MovieVaultActions, {
  type MovieVaultStatus,
} from "../../../components/MovieVaultActions";

import { createClient } from "../../../lib/supabase/server";

import {
  getMovie,
  getMovieCredits,
  getMovieVideos,
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
};

export default async function MoviePage({
  params,
}: PageProps) {
  const { id } = await params;

  const [movieData, creditsData, videosData] =
    await Promise.all([
      getMovie(id),
      getMovieCredits(id),
      getMovieVideos(id),
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

  if (user) {
    const { data, error } = await supabase
      .from("vault_items")
      .select("status, is_favorite")
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
      isFavorite = vaultRow.is_favorite ?? false;
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
    : "N/D";

  const runtime = movie.runtime
    ? `${movie.runtime} min`
    : "Durata non disponibile";

  return (
    <main className="min-h-screen bg-[#121212] text-[#F8FAFC]">
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
                    ? "✓ Visto"
                    : "👀 Da vedere"}
                </span>
              )}

              {isFavorite && (
                <span
                  className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-2xl shadow-lg"
                  title="Preferito"
                  aria-label="Film preferito"
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
                {movie.overview ||
                  "Trama non disponibile."}
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                <InfoBox
                  label="Popolarità"
                  value={Math.round(
                    movie.popularity ?? 0
                  )}
                />

                <InfoBox
                  label="Voti"
                  value={movie.vote_count}
                />

                <InfoBox
                  label="Lingua"
                  value={movie.original_language?.toUpperCase()}
                />

                <InfoBox
                  label="Stato"
                  value={movie.status}
                />
              </div>

              <div className="mt-8 flex flex-col gap-4">
                <MovieVaultActions
                  movieId={movie.id}
                  initialStatus={vaultStatus}
                  initialFavorite={isFavorite}
                />

                {trailer && (
                  <a
                    href={`https://www.youtube.com/watch?v=${trailer.key}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-fit rounded-full border border-zinc-700 px-8 py-4 text-center text-lg font-semibold text-white transition hover:border-[#7C3AED]"
                  >
                    ▶ Guarda trailer
                  </a>
                )}
              </div>
            </div>
          </div>

          {trailer && (
            <section className="mt-16">
              <h2 className="text-3xl font-bold">
                🎥 Trailer
              </h2>

              <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-800">
                <iframe
                  className="aspect-video w-full"
                  src={`https://www.youtube.com/embed/${trailer.key}`}
                  title={`Trailer di ${movie.title}`}
                  allowFullScreen
                />
              </div>
            </section>
          )}

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
  value: string | number | undefined | null;
}) {
  const displayValue =
    value === undefined ||
    value === null ||
    value === ""
      ? "N/D"
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