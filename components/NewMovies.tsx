import Link from "next/link";
import MovieCard from "./MovieCard";
import {
  getNowPlayingMovies,
  getPosterUrl,
} from "../lib/tmdb";

export default async function NewMovies() {
  const movies = await getNowPlayingMovies();

  return (
    <section className="mx-auto mt-20 max-w-7xl px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold sm:text-3xl">
          🎬 Nuovi Film
        </h2>

        <Link
          href="/film"
          className="shrink-0 rounded-full border border-[#7C3AED]/40 px-4 py-2 text-sm font-semibold text-[#A78BFA] transition hover:border-[#7C3AED] hover:bg-[#7C3AED]/10 hover:text-white"
        >
          Vedi tutti
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {movies
          .slice(0, 8)
          .map((movie) => (
            <MovieCard
              key={movie.id}
              id={movie.id}
              title={movie.title}
              year={
              movie.release_date?.slice(0, 4) ||
                "N/D"
              }
              rating={`⭐ ${movie.vote_average.toFixed(
                1
              )}`}
              image={getPosterUrl(
                movie.poster_path
              )}
              mediaType="movie"
              tag="Nuovo"
              genre="Film"
              duration="Durata nella scheda"
            />
          ))}
      </div>
    </section>
  );
}