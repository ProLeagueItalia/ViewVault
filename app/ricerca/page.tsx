import BackButton from "../../components/BackButton";
import MovieCard from "../../components/MovieCard";

import {
  getPosterUrl,
  searchMoviesAndSeries,
  type TMDBSearchResult,
} from "../../lib/tmdb";

type SearchPageProps = {
  searchParams:
    | Promise<{
        q?: string;
      }>
    | {
        q?: string;
      };
};

export default async function SearchPage({
  searchParams,
}: SearchPageProps) {
  const params = await Promise.resolve(searchParams);
  const query = params.q?.trim() ?? "";

  let results: TMDBSearchResult[] = [];
  let hasError = false;

  if (query) {
    try {
      results = await searchMoviesAndSeries(query);
    } catch (error) {
      console.error("Errore durante la ricerca:", error);
      hasError = true;
    }
  }

  return (
    <main className="min-h-screen bg-[#0D0D0D] px-6 pb-20 pt-28 text-white">
      <section className="mx-auto max-w-7xl">

        <div className="mb-10">
          <BackButton />
        </div>

        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-300">
            🔎 Ricerca ViewVault
          </span>

          <h1 className="mt-6 text-4xl font-black tracking-tight md:text-6xl">
            Trova il tuo prossimo
            <span className="text-[#7C3AED]"> titolo</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-400 md:text-lg">
            Cerca un film o una serie TV, apri la scheda e aggiungilo al Vault
            come visto oppure da vedere.
          </p>
        </div>

        <form
          action="/ricerca"
          method="GET"
          className="mx-auto mt-10 flex max-w-3xl flex-col gap-3 sm:flex-row"
        >
          <label htmlFor="media-search" className="sr-only">
            Cerca un film o una serie TV
          </label>

          <input
            id="media-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Cerca un film o una serie TV..."
            autoComplete="off"
            className="min-w-0 flex-1 rounded-full border border-zinc-700 bg-zinc-900 px-6 py-4 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-[#7C3AED] focus:ring-4 focus:ring-violet-500/10"
          />

          <button
            type="submit"
            className="rounded-full bg-[#7C3AED] px-8 py-4 font-bold text-white transition hover:bg-[#6D28D9] hover:shadow-[0_0_25px_rgba(124,58,237,0.35)]"
          >
            Cerca
          </button>
        </form>

        {!query && (
          <div className="mx-auto mt-16 max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900/70 p-10 text-center">
            <div className="text-5xl">🎬📺</div>

            <h2 className="mt-5 text-2xl font-bold">
              Cosa stai cercando?
            </h2>

            <p className="mt-3 text-zinc-400">
              Inserisci il titolo di un film o di una serie TV.
            </p>
          </div>
        )}

        {hasError && (
          <div className="mx-auto mt-12 max-w-2xl rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-center">
            <h2 className="text-xl font-bold text-red-300">
              Ricerca momentaneamente non disponibile
            </h2>

            <p className="mt-2 text-sm text-red-200/70">
              Non è stato possibile contattare TMDB.
            </p>
          </div>
        )}

        {query && !hasError && (
          <div className="mt-16">
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7C3AED]">
                  Risultati
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  Ricerca per "{query}"
                </h2>
              </div>

              <p className="text-sm text-zinc-400">
                {results.length} risultati trovati
              </p>
            </div>

            {results.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {results.map((item) => {
                  const year = item.date
                    ? item.date.slice(0, 4)
                    : "Anno non disponibile";

                  return (
                    <MovieCard
                      key={`${item.media_type}-${item.id}`}
                      id={item.id}
                      title={item.title}
                      year={year}
                      rating={
                        item.vote_average
                          ? `⭐ ${item.vote_average.toFixed(1)}`
                          : "N.D."
                      }
                      image={getPosterUrl(item.poster_path)}
                      mediaType={item.media_type}
                      tag={item.media_type === "tv" ? "Serie TV" : "Film"}
                      genre={item.media_type === "tv" ? "Serie TV" : "Film"}
                      duration={
                        item.media_type === "tv"
                          ? "Episodi nella scheda"
                          : "Durata nella scheda"
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-12 text-center">
                <div className="text-5xl">🕵️</div>

                <h3 className="mt-5 text-2xl font-bold">
                  Nessun risultato trovato
                </h3>

                <p className="mt-3 text-zinc-400">
                  Controlla il titolo oppure prova con una parola diversa.
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}