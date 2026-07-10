import MovieCard from "./MovieCard";
import { getNowPlayingMovies, getPosterUrl } from "../lib/tmdb";

export default async function NewMovies() {
  const movies = await getNowPlayingMovies();

  return (
    <section className="mx-auto mt-20 max-w-7xl px-6">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-3xl font-bold">🎬 Nuovi Film</h2>

        <button className="text-sm font-semibold text-[#7C3AED] hover:text-[#2563EB]">
          Vedi tutti
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {movies.slice(0, 8).map((movie) => (
         <MovieCard
  key={movie.id}
  id={movie.id}
  title={movie.title}
  year={movie.release_date?.slice(0, 4) || "N/D"}
  rating={`⭐ ${movie.vote_average.toFixed(1)}`}
  image={getPosterUrl(movie.poster_path)}
  tag="Nuovo"
/>
        ))}
      </div>
    </section>
  );
}