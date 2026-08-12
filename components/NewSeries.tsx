import MovieCard from "./MovieCard";
import {
  getNewSeries,
  getPosterUrl,
} from "../lib/tmdb";

export default async function NewSeries() {
  const response = await getNewSeries();

  const series = response.results;

  return (
    <section className="mx-auto mt-20 max-w-7xl px-6">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-3xl font-bold">
          📺 Nuove Serie TV
        </h2>

        <a
          href="/serie-tv"
          className="text-sm font-semibold text-[#7C3AED] transition hover:text-[#2563EB]"
        >
          Vedi tutte
        </a>
      </div>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {series
          .slice(0, 8)
          .map((serie) => (
            <MovieCard
              key={serie.id}
              id={serie.id}
              title={serie.name}
              year={
                serie.first_air_date?.slice(
                  0,
                  4
                ) || "N/D"
              }
              rating={`⭐ ${serie.vote_average.toFixed(
                1
              )}`}
              image={getPosterUrl(
                serie.poster_path
              )}
              mediaType="tv"
              tag="Nuova"
              genre="Serie TV"
              duration="Episodi nella scheda"
            />
          ))}
      </div>
    </section>
  );
}