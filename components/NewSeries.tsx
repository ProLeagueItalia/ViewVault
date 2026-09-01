import Link from "next/link";
import { getTranslations } from "next-intl/server";

import MovieCard from "./MovieCard";

import {
  getNewSeries,
  getPosterUrl,
} from "../lib/tmdb";

export default async function NewSeries() {
  const t = await getTranslations("NewContent");

  const response = await getNewSeries();

  const series = response.results;

  return (
    <section className="mx-auto mt-20 max-w-7xl px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold sm:text-3xl">
          📺 {t("newSeries")}
        </h2>

        <Link
          href="/serie-tv"
          className="shrink-0 rounded-full border border-[#7C3AED]/40 px-4 py-2 text-sm font-semibold text-[#A78BFA] transition hover:border-[#7C3AED] hover:bg-[#7C3AED]/10 hover:text-white"
        >
          {t("viewAllSeries")}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {series.slice(0, 8).map((serie) => (
          <MovieCard
            key={serie.id}
            id={serie.id}
            title={serie.name}
            year={
              serie.first_air_date?.slice(0, 4) ||
              t("notAvailable")
            }
            rating={`⭐ ${serie.vote_average.toFixed(
              1
            )}`}
            image={getPosterUrl(serie.poster_path)}
            mediaType="tv"
            tag={t("newSeriesTag")}
            genre={t("series")}
            duration={t("seriesEpisodes")}
          />
        ))}
      </div>
    </section>
  );
}