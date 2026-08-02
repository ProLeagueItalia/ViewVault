import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "../../lib/supabase/server";
import { getMovie, getPosterUrl } from "../../lib/tmdb";

type VaultStatus = "watched" | "watchlist";

type VaultItem = {
  id: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  status: VaultStatus;
  rating: number | null;
  review: string | null;
  created_at: string | null;
};

type MovieDetails = {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  runtime: number | null;
  vote_average: number;
};

export default async function VaultPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: vaultItems, error } = await supabase
    .from("vault_items")
    .select(
      "id, tmdb_id, media_type, status, rating, review, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Errore nel recupero del Vault:", error);
  }

  const movieItems =
    (vaultItems as VaultItem[] | null)?.filter(
      (item) => item.media_type === "movie"
    ) ?? [];

  const movieResults = await Promise.allSettled(
    movieItems.map(async (item) => {
      const movie = (await getMovie(
        String(item.tmdb_id)
      )) as MovieDetails;

      return {
        vaultItem: item,
        movie,
      };
    })
  );

  const movies = movieResults
    .filter(
      (
        result
      ): result is PromiseFulfilledResult<{
        vaultItem: VaultItem;
        movie: MovieDetails;
      }> => result.status === "fulfilled"
    )
    .map((result) => result.value);

  const watchedCount = movies.filter(
    ({ vaultItem }) => vaultItem.status === "watched"
  ).length;

  const watchlistCount = movies.filter(
    ({ vaultItem }) => vaultItem.status === "watchlist"
  ).length;

  return (
    <main className="min-h-screen bg-[#0d0d0d] px-6 pb-20 pt-28 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-[#8b5cf6]">
            Archivio personale
          </p>

          <h1 className="text-4xl font-bold md:text-5xl">
            Il mio <span className="text-[#7c3aed]">Vault</span>
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-zinc-400">
            Tutti i film che hai salvato nel tuo archivio personale.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="inline-flex rounded-full border border-zinc-800 bg-[#151515] px-5 py-3">
              <span className="font-bold text-[#a78bfa]">
                {movies.length}
              </span>

              <span className="ml-2 text-zinc-400">
                {movies.length === 1 ? "film salvato" : "film salvati"}
              </span>
            </div>

            <div className="inline-flex rounded-full border border-green-900/50 bg-green-950/30 px-5 py-3">
              <span className="font-bold text-green-400">
                {watchedCount}
              </span>

              <span className="ml-2 text-zinc-400">
                {watchedCount === 1 ? "visto" : "visti"}
              </span>
            </div>

            <div className="inline-flex rounded-full border border-violet-900/50 bg-violet-950/30 px-5 py-3">
              <span className="font-bold text-violet-400">
                {watchlistCount}
              </span>

              <span className="ml-2 text-zinc-400">
                da vedere
              </span>
            </div>
          </div>
        </section>

        {movies.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-zinc-700 bg-[#151515] px-6 py-20 text-center">
            <p className="text-4xl">🎬</p>

            <h2 className="mt-5 text-2xl font-bold">
              Il tuo Vault è ancora vuoto
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-zinc-400">
              Torna alla Home e aggiungi il primo film al tuo archivio.
            </p>

            <Link
              href="/"
              className="mt-7 inline-block rounded-full bg-[#7c3aed] px-7 py-3 font-bold transition hover:bg-[#6d28d9]"
            >
              Scopri i film
            </Link>
          </section>
        ) : (
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {movies.map(({ vaultItem, movie }) => {
              const year = movie.release_date
                ? movie.release_date.slice(0, 4)
                : "Anno non disponibile";

              const runtime = movie.runtime
                ? `${movie.runtime} min`
                : "Durata non disponibile";

              const isWatched = vaultItem.status === "watched";

              return (
                <article
                  key={vaultItem.id}
                  className="overflow-hidden rounded-3xl border border-zinc-800 bg-[#151515] transition hover:-translate-y-1 hover:border-[#7c3aed]"
                >
                  <Link href={`/film/${movie.id}`} className="block">
                    <div className="relative h-96 overflow-hidden bg-zinc-900">
                      <img
                        src={getPosterUrl(movie.poster_path)}
                        alt={movie.title}
                        className="h-full w-full object-cover transition duration-500 hover:scale-105"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

                      <span
                        className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold ${
                          isWatched
                            ? "bg-green-600 text-white"
                            : "bg-[#7c3aed] text-white"
                        }`}
                      >
                        {isWatched ? "✓ Visto" : "👀 Da vedere"}
                      </span>

                      <span className="absolute right-3 top-3 rounded-full bg-black/75 px-3 py-1 text-xs font-bold text-[#f4c542]">
                        ⭐ {movie.vote_average.toFixed(1)}
                      </span>
                    </div>

                    <div className="p-5">
                      <h2 className="line-clamp-1 text-xl font-bold">
                        {movie.title}
                      </h2>

                      <p className="mt-2 text-sm text-zinc-400">
                        {year} • {runtime}
                      </p>

                      <div className="mt-5 rounded-full bg-[#7c3aed]/15 px-4 py-2 text-center text-sm font-bold text-[#a78bfa]">
                        Apri scheda
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}