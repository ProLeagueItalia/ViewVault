import Link from "next/link";
import { getMovie, getMovieCredits, getMovieVideos } from "../../../lib/tmdb";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MoviePage({ params }: PageProps) {
  const { id } = await params;

  const movie = await getMovie(id);
  const credits = await getMovieCredits(id);
  const videos = await getMovieVideos(id);

  const cast = credits.cast?.slice(0, 8) || [];

  const trailer = videos.results?.find(
    (video: any) => video.site === "YouTube" && video.type === "Trailer"
  );

  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : "/viewvault-logo.svg";

  const backdropUrl = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : "";

  return (
    <main className="min-h-screen bg-[#121212] text-[#F8FAFC]">
      <section
        className="relative min-h-screen bg-cover bg-center"
        style={{
          backgroundImage: backdropUrl
            ? `linear-gradient(to bottom, rgba(18,18,18,0.35), #121212 80%), url(${backdropUrl})`
            : "none",
        }}
      >
        <div className="mx-auto max-w-7xl px-6 py-10">
          <Link
            href="/"
            className="inline-block rounded-full border border-zinc-700 bg-black/40 px-5 py-2 text-sm font-semibold text-zinc-200 backdrop-blur-md transition hover:border-[#7C3AED] hover:text-white"
          >
            ← Torna alla Home
          </Link>

          <div className="mt-14 grid gap-10 md:grid-cols-[340px_1fr]">
            <img
              src={posterUrl}
              alt={movie.title}
              className="w-full rounded-3xl border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
            />

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
                {movie.release_date?.slice(0, 4)} • {movie.runtime} min • ⭐{" "}
                {movie.vote_average?.toFixed(1)}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                {movie.genres?.map((genre: any) => (
                  <span
                    key={genre.id}
                    className="rounded-full bg-[#7C3AED]/25 px-4 py-2 text-sm font-semibold text-[#C4B5FD]"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>

              <p className="mt-8 max-w-4xl text-lg leading-8 text-zinc-200">
                {movie.overview || "Trama non disponibile."}
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                <InfoBox label="Popolarità" value={Math.round(movie.popularity)} />
                <InfoBox label="Voti" value={movie.vote_count} />
                <InfoBox label="Lingua" value={movie.original_language?.toUpperCase()} />
                <InfoBox label="Stato" value={movie.status} />
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button className="rounded-full bg-[#7C3AED] px-8 py-4 text-lg font-semibold text-white shadow-[0_0_30px_rgba(124,58,237,0.45)] transition hover:bg-[#2563EB]">
                  + Aggiungi al Vault
                </button>

                {trailer && (
                  <a
                    href={`https://www.youtube.com/watch?v=${trailer.key}`}
                    target="_blank"
                    className="rounded-full border border-zinc-700 px-8 py-4 text-center text-lg font-semibold text-white transition hover:border-[#7C3AED]"
                  >
                    ▶ Guarda trailer
                  </a>
                )}
              </div>
            </div>
          </div>

          {trailer && (
            <section className="mt-16">
              <h2 className="text-3xl font-bold">🎥 Trailer</h2>

              <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-800">
                <iframe
                  className="aspect-video w-full"
                  src={`https://www.youtube.com/embed/${trailer.key}`}
                  title="Trailer"
                  allowFullScreen
                />
              </div>
            </section>
          )}

          <section className="mt-16">
            <h2 className="text-3xl font-bold">🎭 Cast principale</h2>

            <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
              {cast.map((person: any) => {
                const profileUrl = person.profile_path
                  ? `https://image.tmdb.org/t/p/w300${person.profile_path}`
                  : "/viewvault-logo.svg";

                return (
                  <div
                    key={person.id}
                    className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900"
                  >
                    <img
                      src={profileUrl}
                      alt={person.name}
                      className="h-64 w-full object-cover"
                    />

                    <div className="p-4">
                      <p className="font-bold">{person.name}</p>
                      <p className="text-sm text-zinc-400">{person.character}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function InfoBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-1 text-xl font-bold">{value || "N/D"}</p>
    </div>
  );
}