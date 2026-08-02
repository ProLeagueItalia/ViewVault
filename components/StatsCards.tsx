import { createClient } from "../lib/supabase/server";
import { getMovie } from "../lib/tmdb";

type VaultItem = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  status: "watched" | "watchlist";
  review: string | null;
};

type MovieDetails = {
  runtime: number | null;
};

export default async function StatsCards() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let filmsWatched = 0;
  let seriesWatched = 0;
  let watchlistCount = 0;
  let totalMinutes = 0;
  let reviewsCount = 0;

  if (user) {
    const { data: vaultItems, error } = await supabase
      .from("vault_items")
      .select("tmdb_id, media_type, status, review")
      .eq("user_id", user.id);

    if (error) {
      console.error(
        "Errore nel recupero delle statistiche:",
        error
      );
    }

    const items = (vaultItems as VaultItem[] | null) ?? [];

    const watchedMovies = items.filter(
      (item) =>
        item.media_type === "movie" &&
        item.status === "watched"
    );

    const watchedSeries = items.filter(
      (item) =>
        item.media_type === "tv" &&
        item.status === "watched"
    );

    const watchlistItems = items.filter(
      (item) => item.status === "watchlist"
    );

    filmsWatched = watchedMovies.length;
    seriesWatched = watchedSeries.length;
    watchlistCount = watchlistItems.length;

    reviewsCount = items.filter(
      (item) =>
        item.review !== null &&
        item.review.trim().length > 0
    ).length;

    const movieResults = await Promise.allSettled(
      watchedMovies.map(async (item) => {
        const movie = (await getMovie(
          String(item.tmdb_id)
        )) as MovieDetails;

        return movie.runtime ?? 0;
      })
    );

    totalMinutes = movieResults.reduce(
      (total, result) => {
        if (result.status === "fulfilled") {
          return total + result.value;
        }

        return total;
      },
      0
    );
  }

  const hoursWatched = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  const formattedTime =
    totalMinutes === 0
      ? "0h"
      : remainingMinutes === 0
        ? `${hoursWatched}h`
        : `${hoursWatched}h ${remainingMinutes}m`;

  return (
    <section className="mx-auto mt-16 max-w-7xl px-6">
      <h2 className="mb-8 text-3xl font-bold">
        📊 Le tue statistiche
      </h2>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-5">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <h3 className="text-5xl font-bold text-violet-500">
            {filmsWatched}
          </h3>

          <p className="mt-3 text-zinc-400">
            Film visti
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <h3 className="text-5xl font-bold text-cyan-400">
            {watchlistCount}
          </h3>

          <p className="mt-3 text-zinc-400">
            Da vedere
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <h3 className="text-5xl font-bold text-blue-500">
            {seriesWatched}
          </h3>

          <p className="mt-3 text-zinc-400">
            Serie TV
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <h3 className="text-5xl font-bold text-yellow-400">
            {formattedTime}
          </h3>

          <p className="mt-3 text-zinc-400">
            Ore viste
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <h3 className="text-5xl font-bold text-green-500">
            {reviewsCount}
          </h3>

          <p className="mt-3 text-zinc-400">
            Recensioni
          </p>
        </div>
      </div>
    </section>
  );
}