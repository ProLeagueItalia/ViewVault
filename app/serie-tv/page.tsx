import Link from "next/link";

import AppHeader from "../../components/AppHeader";
import MovieCard from "../../components/MovieCard";

import {
  discoverSeries,
  findActorByName,
  getAiringTodaySeries,
  getPopularSeries,
  getPosterUrl,
  getSeriesByActor,
  getSeriesGenres,
  getTopRatedSeries,
  getTrendingSeries,
  type SeriesSortOption,
  type TMDBGenre,
  type TMDBSeries,
} from "../../lib/tmdb";

type SeriesPageProps = {
  searchParams:
    | Promise<{
        page?: string;
        genre?: string;
        yearFrom?: string;
        yearTo?: string;
        actor?: string;
        vote?: string;
        sort?: string;
      }>
    | {
        page?: string;
        genre?: string;
        yearFrom?: string;
        yearTo?: string;
        actor?: string;
        vote?: string;
        sort?: string;
      };
};

const validSortOptions: SeriesSortOption[] = [
  "popularity.desc",
  "vote_average.desc",
  "first_air_date.desc",
  "first_air_date.asc",
  "name.asc",
  "name.desc",
];

const ITEMS_PER_PAGE = 20;

export default async function SeriesPage({
  searchParams,
}: SeriesPageProps) {
  const params =
    await Promise.resolve(searchParams);

  /*
   * PAGINA
   */

  const requestedPage =
    Number(params.page ?? "1");

  const currentPage =
    Number.isFinite(requestedPage) &&
    requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

  /*
   * GENERE
   */

  const rawGenre =
    params.genre?.trim() ?? "";

  const parsedGenre =
    Number(rawGenre);

  const genreId =
    rawGenre &&
    Number.isFinite(parsedGenre) &&
    parsedGenre > 0
      ? parsedGenre
      : undefined;

  /*
   * ANNO DA
   */

  const rawYearFrom =
    params.yearFrom?.trim() ?? "";

  const parsedYearFrom =
    Number(rawYearFrom);

  const yearFrom =
    rawYearFrom &&
    Number.isFinite(parsedYearFrom) &&
    parsedYearFrom >= 1900 &&
    parsedYearFrom <= 2100
      ? parsedYearFrom
      : undefined;

  /*
   * ANNO A
   */

  const rawYearTo =
    params.yearTo?.trim() ?? "";

  const parsedYearTo =
    Number(rawYearTo);

  const yearTo =
    rawYearTo &&
    Number.isFinite(parsedYearTo) &&
    parsedYearTo >= 1900 &&
    parsedYearTo <= 2100
      ? parsedYearTo
      : undefined;

  /*
   * INTERVALLO ANNI
   */

  const hasInvalidYearRange =
    yearFrom !== undefined &&
    yearTo !== undefined &&
    yearFrom > yearTo;

  /*
   * ATTORE
   */

  const actorQuery =
    params.actor?.trim() ?? "";

  let actorId: number | undefined;
  let actorDisplayName = actorQuery;
  let actorNotFound = false;

  /*
   * VOTO MINIMO
   */

  const rawVote =
    params.vote?.trim() ?? "";

  const parsedVote =
    Number(rawVote);

  const minVote =
    rawVote &&
    Number.isFinite(parsedVote) &&
    parsedVote >= 0 &&
    parsedVote <= 10
      ? parsedVote
      : undefined;

  /*
   * ORDINAMENTO
   */

  const requestedSort =
    params.sort as
      | SeriesSortOption
      | undefined;

  const sortBy =
    requestedSort &&
    validSortOptions.includes(
      requestedSort
    )
      ? requestedSort
      : "popularity.desc";

  /*
   * FILTRI ATTIVI
   */

  const hasActiveFilters =
    genreId !== undefined ||
    yearFrom !== undefined ||
    yearTo !== undefined ||
    actorQuery.length > 0 ||
    minVote !== undefined ||
    sortBy !== "popularity.desc";

  /*
   * DATI
   */

  let trendingSeries: TMDBSeries[] = [];
  let popularSeries: TMDBSeries[] = [];
  let topRatedSeries: TMDBSeries[] = [];
  let airingTodaySeries: TMDBSeries[] = [];
  let catalogSeries: TMDBSeries[] = [];
  let genres: TMDBGenre[] = [];

  let totalPages = 1;
  let totalResults = 0;
  let hasError = false;

  try {
    /*
     * Se è stato inserito un attore,
     * cerchiamo prima il suo ID TMDB.
     */

    if (actorQuery) {
      const actor =
        await findActorByName(actorQuery);

      if (actor) {
        actorId = actor.id;
        actorDisplayName = actor.name;
      } else {
        actorNotFound = true;
      }
    }

    /*
     * INTERVALLO NON VALIDO
     */

    if (hasInvalidYearRange) {
      genres = await getSeriesGenres();
    }

    /*
     * ATTORE NON TROVATO
     */

    else if (actorNotFound) {
      genres = await getSeriesGenres();
    }

    /*
     * CON FILTRO ATTORE
     *
     * TMDB non permette with_cast direttamente
     * su /discover/tv, quindi recuperiamo tutte
     * le serie dell'attore e applichiamo qui
     * gli altri filtri.
     */

    else if (actorId) {
      const [
        actorSeries,
        genreResponse,
      ] = await Promise.all([
        getSeriesByActor(actorId),
        getSeriesGenres(),
      ]);

      genres = genreResponse;

      let filteredSeries =
        actorSeries.filter((series) => {
          /*
           * GENERE
           */

          if (
            genreId !== undefined &&
            !series.genre_ids?.includes(
              genreId
            )
          ) {
            return false;
          }

          /*
           * ANNO
           */

          const seriesYear =
            getSeriesYear(
              series.first_air_date
            );

          if (
            yearFrom !== undefined &&
            (seriesYear === null ||
              seriesYear < yearFrom)
          ) {
            return false;
          }

          if (
            yearTo !== undefined &&
            (seriesYear === null ||
              seriesYear > yearTo)
          ) {
            return false;
          }

          /*
           * VOTO
           */

          if (
            minVote !== undefined &&
            series.vote_average <
              minVote
          ) {
            return false;
          }

          return true;
        });

      /*
       * ORDINAMENTO LOCALE
       */

      filteredSeries =
        sortSeriesLocally(
          filteredSeries,
          sortBy
        );

      totalResults =
        filteredSeries.length;

      totalPages = Math.max(
        1,
        Math.ceil(
          totalResults /
            ITEMS_PER_PAGE
        )
      );

      const safeCurrentPage =
        Math.min(
          currentPage,
          totalPages
        );

      const startIndex =
        (safeCurrentPage - 1) *
        ITEMS_PER_PAGE;

      catalogSeries =
        filteredSeries.slice(
          startIndex,
          startIndex +
            ITEMS_PER_PAGE
        );
    }

    /*
     * CON FILTRI SENZA ATTORE
     */

    else if (hasActiveFilters) {
      const [
        catalogResponse,
        genreResponse,
      ] = await Promise.all([
        discoverSeries({
          page: currentPage,
          genreId,
          yearFrom,
          yearTo,
          minVote,
          sortBy,
        }),

        getSeriesGenres(),
      ]);

      catalogSeries =
        catalogResponse.results;

      totalPages = Math.min(
        catalogResponse.total_pages,
        500
      );

      totalResults =
        catalogResponse.total_results;

      genres = genreResponse;
    }

    /*
     * SENZA FILTRI
     */

    else {
      const [
        trendingResponse,
        popularResponse,
        topRatedResponse,
        airingTodayResponse,
        catalogResponse,
        genreResponse,
      ] = await Promise.all([
        getTrendingSeries(),
        getPopularSeries(1),
        getTopRatedSeries(1),
        getAiringTodaySeries(1),

        discoverSeries({
          page: currentPage,
          sortBy,
        }),

        getSeriesGenres(),
      ]);

      trendingSeries =
        trendingResponse.slice(0, 8);

      popularSeries =
        popularResponse.results.slice(
          0,
          8
        );

      topRatedSeries =
        topRatedResponse.results.slice(
          0,
          8
        );

      airingTodaySeries =
        airingTodayResponse.results.slice(
          0,
          8
        );

      catalogSeries =
        catalogResponse.results;

      totalPages = Math.min(
        catalogResponse.total_pages,
        500
      );

      totalResults =
        catalogResponse.total_results;

      genres = genreResponse;
    }
  } catch (error) {
    console.error(
      "Errore nel caricamento del catalogo Serie TV:",
      error
    );

    hasError = true;
  }

  /*
   * GENERE ATTUALE
   */

  const currentGenre =
    genres.find(
      (genre) =>
        genre.id === genreId
    );

  /*
   * PARAMETRI PAGINAZIONE
   */

  const paginationBaseParams =
    new URLSearchParams();

  if (genreId) {
    paginationBaseParams.set(
      "genre",
      String(genreId)
    );
  }

  if (yearFrom) {
    paginationBaseParams.set(
      "yearFrom",
      String(yearFrom)
    );
  }

  if (yearTo) {
    paginationBaseParams.set(
      "yearTo",
      String(yearTo)
    );
  }

  if (actorQuery) {
    paginationBaseParams.set(
      "actor",
      actorQuery
    );
  }

  if (minVote !== undefined) {
    paginationBaseParams.set(
      "vote",
      String(minVote)
    );
  }

  if (
    sortBy !== "popularity.desc"
  ) {
    paginationBaseParams.set(
      "sort",
      sortBy
    );
  }

  function buildPageHref(
    page: number
  ) {
    const nextParams =
      new URLSearchParams(
        paginationBaseParams
      );

    nextParams.set(
      "page",
      String(page)
    );

    return `/serie-tv?${nextParams.toString()}#catalogo`;
  }

  /*
   * ANNI DISPONIBILI
   */

  const currentYear =
    new Date().getFullYear();

  const years = Array.from(
    {
      length:
        currentYear - 1899,
    },
    (_, index) =>
      currentYear - index
  );

  return (
    <>
      <AppHeader />

      <main className="min-h-screen bg-[#0D0D0D] pb-24 text-white">
        {/* HERO */}

        <section className="border-b border-zinc-800 bg-gradient-to-b from-[#10131F] via-[#0D0D0D] to-[#0D0D0D]">
          <div className="mx-auto max-w-7xl px-6 pb-16 pt-16">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-bold text-violet-300">
                📺 Catalogo Serie TV
              </span>

              <h1 className="mt-6 text-5xl font-black tracking-tight md:text-7xl">
                Trova la tua prossima{" "}
                <span className="text-[#7C3AED]">
                  serie
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
                Scopri le serie del momento,
                sfoglia quelle più popolari e
                tieni sotto controllo tutto ciò
                che vuoi vedere o che hai già
                iniziato.
              </p>
            </div>

            {/* RICERCA */}

            <div className="mt-10 flex max-w-4xl flex-col gap-3 lg:flex-row">
              <form
                action="/ricerca"
                method="GET"
                className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row"
              >
                <label
                  htmlFor="series-search"
                  className="sr-only"
                >
                  Cerca una serie TV
                </label>

                <input
                  id="series-search"
                  name="q"
                  type="search"
                  placeholder="🔎 Cerca una serie TV..."
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-full border border-zinc-700 bg-zinc-900/90 px-6 py-4 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-[#7C3AED] focus:ring-4 focus:ring-violet-500/10"
                />

                <button
                  type="submit"
                  className="rounded-full bg-[#7C3AED] px-8 py-4 font-bold text-white transition hover:bg-[#6D28D9] hover:shadow-[0_0_25px_rgba(124,58,237,0.35)]"
                >
                  Cerca
                </button>
              </form>

              <a
                href="#filtri"
                className="inline-flex items-center justify-center rounded-full border border-[#7C3AED] bg-[#7C3AED]/10 px-8 py-4 font-bold text-[#C4B5FD] transition hover:bg-[#7C3AED] hover:text-white"
              >
                🎛 Filtri
              </a>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6">
          {hasError ? (
            <section className="mt-16 rounded-3xl border border-red-500/30 bg-red-500/10 p-12 text-center">
              <p className="text-5xl">
                📺
              </p>

              <h2 className="mt-5 text-2xl font-bold text-red-200">
                Catalogo momentaneamente non disponibile
              </h2>

              <p className="mt-3 text-zinc-400">
                Non è stato possibile recuperare
                le serie TV da TMDB. Riprova tra
                poco.
              </p>
            </section>
          ) : (
            <>
              {/* SEZIONI EDITORIALI */}

              {!hasActiveFilters && (
                <>
                  <SeriesSection
                    eyebrow="Il momento"
                    title="🔥 Serie di tendenza"
                    description="Le serie TV che stanno attirando più attenzione questa settimana."
                    series={
                      trendingSeries
                    }
                  />

                  <SeriesSection
                    eyebrow="Le più seguite"
                    title="📺 Serie popolari"
                    description="Le serie più popolari e cercate del momento."
                    series={
                      popularSeries
                    }
                  />

                  <SeriesSection
                    eyebrow="Da non perdere"
                    title="⭐ Più votate"
                    description="Le serie TV con alcune delle valutazioni più alte."
                    series={
                      topRatedSeries
                    }
                  />

                  <SeriesSection
                    eyebrow="Oggi"
                    title="📡 In onda oggi"
                    description="Le serie con nuovi episodi trasmessi oggi."
                    series={
                      airingTodaySeries
                    }
                  />
                </>
              )}

              {/* FILTRI */}

              <section
                id="filtri"
                className={
                  hasActiveFilters
                    ? "mt-12 scroll-mt-28"
                    : "mt-20 scroll-mt-28"
                }
              >
                <div className="mb-7">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#8B5CF6]">
                    Esplora
                  </p>

                  <h2 className="mt-2 text-3xl font-black md:text-4xl">
                    Filtra il catalogo
                  </h2>

                  <p className="mt-3 max-w-3xl text-zinc-400">
                    Restringi la selezione per
                    genere, intervallo di anni,
                    attore, voto minimo oppure
                    cambia l&apos;ordinamento.
                  </p>
                </div>

                <form
                  action="/serie-tv#catalogo"
                  method="GET"
                  className="rounded-3xl border border-zinc-800 bg-[#151515] p-5 md:p-6"
                >
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    {/* GENERE */}

                    <div>
                      <label
                        htmlFor="genre"
                        className="mb-2 block text-sm font-bold text-zinc-300"
                      >
                        Genere
                      </label>

                      <select
                        id="genre"
                        name="genre"
                        defaultValue={
                          genreId
                            ? String(
                                genreId
                              )
                            : ""
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-4 text-white outline-none transition focus:border-[#7C3AED]"
                      >
                        <option value="">
                          Tutti i generi
                        </option>

                        {genres.map(
                          (genre) => (
                            <option
                              key={
                                genre.id
                              }
                              value={
                                genre.id
                              }
                            >
                              {
                                genre.name
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {/* ANNO DA */}

                    <div>
                      <label
                        htmlFor="yearFrom"
                        className="mb-2 block text-sm font-bold text-zinc-300"
                      >
                        Dal
                      </label>

                      <select
                        id="yearFrom"
                        name="yearFrom"
                        defaultValue={
                          yearFrom
                            ? String(
                                yearFrom
                              )
                            : ""
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-4 text-white outline-none transition focus:border-[#7C3AED]"
                      >
                        <option value="">
                          Qualsiasi anno
                        </option>

                        {years.map(
                          (itemYear) => (
                            <option
                              key={
                                itemYear
                              }
                              value={
                                itemYear
                              }
                            >
                              {
                                itemYear
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {/* ANNO A */}

                    <div>
                      <label
                        htmlFor="yearTo"
                        className="mb-2 block text-sm font-bold text-zinc-300"
                      >
                        Al
                      </label>

                      <select
                        id="yearTo"
                        name="yearTo"
                        defaultValue={
                          yearTo
                            ? String(
                                yearTo
                              )
                            : ""
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-4 text-white outline-none transition focus:border-[#7C3AED]"
                      >
                        <option value="">
                          Qualsiasi anno
                        </option>

                        {years.map(
                          (itemYear) => (
                            <option
                              key={
                                itemYear
                              }
                              value={
                                itemYear
                              }
                            >
                              {
                                itemYear
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {/* ATTORE */}

                    <div>
                      <label
                        htmlFor="actor"
                        className="mb-2 block text-sm font-bold text-zinc-300"
                      >
                        Attore
                      </label>

                      <input
                        id="actor"
                        name="actor"
                        type="search"
                        defaultValue={
                          actorQuery
                        }
                        placeholder="Es. Pedro Pascal"
                        autoComplete="off"
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-[#7C3AED]"
                      />
                    </div>

                    {/* VOTO */}

                    <div>
                      <label
                        htmlFor="vote"
                        className="mb-2 block text-sm font-bold text-zinc-300"
                      >
                        Voto minimo
                      </label>

                      <select
                        id="vote"
                        name="vote"
                        defaultValue={
                          minVote !==
                          undefined
                            ? String(
                                minVote
                              )
                            : ""
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-4 text-white outline-none transition focus:border-[#7C3AED]"
                      >
                        <option value="">
                          Qualsiasi voto
                        </option>

                        <option value="8">
                          ⭐ 8 o superiore
                        </option>

                        <option value="7">
                          ⭐ 7 o superiore
                        </option>

                        <option value="6">
                          ⭐ 6 o superiore
                        </option>

                        <option value="5">
                          ⭐ 5 o superiore
                        </option>
                      </select>
                    </div>

                    {/* ORDINA */}

                    <div>
                      <label
                        htmlFor="sort"
                        className="mb-2 block text-sm font-bold text-zinc-300"
                      >
                        Ordina per
                      </label>

                      <select
                        id="sort"
                        name="sort"
                        defaultValue={
                          sortBy
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-4 text-white outline-none transition focus:border-[#7C3AED]"
                      >
                        <option value="popularity.desc">
                          Più popolari
                        </option>

                        <option value="vote_average.desc">
                          Più votate
                        </option>

                        <option value="first_air_date.desc">
                          Più recenti
                        </option>

                        <option value="first_air_date.asc">
                          Più vecchie
                        </option>

                        <option value="name.asc">
                          Titolo A-Z
                        </option>

                        <option value="name.desc">
                          Titolo Z-A
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* ERRORE INTERVALLO */}

                  {hasInvalidYearRange && (
                    <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-300">
                      ⚠️ L&apos;anno iniziale non
                      può essere successivo
                      all&apos;anno finale.
                    </div>
                  )}

                  {/* ATTORE NON TROVATO */}

                  {actorNotFound && (
                    <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm font-semibold text-amber-300">
                      🎭 Nessun attore trovato
                      con il nome &quot;
                      {actorQuery}&quot;.
                      Controlla il nome e riprova.
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="rounded-full bg-[#7C3AED] px-7 py-3 font-bold text-white transition hover:bg-[#6D28D9]"
                    >
                      🎛 Applica filtri
                    </button>

                    {hasActiveFilters && (
                      <Link
                        href="/serie-tv"
                        className="rounded-full border border-zinc-700 bg-zinc-900 px-7 py-3 font-bold text-zinc-300 transition hover:border-[#7C3AED] hover:text-white"
                      >
                        Reset filtri
                      </Link>
                    )}
                  </div>
                </form>
              </section>

              {/* CATALOGO */}

              <section
                id="catalogo"
                className="mt-12 scroll-mt-28"
              >
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#8B5CF6]">
                      {hasActiveFilters
                        ? "Risultati"
                        : "Catalogo"}
                    </p>

                    <h2 className="mt-2 text-3xl font-black md:text-4xl">
                      {hasActiveFilters
                        ? "Risultati filtrati"
                        : currentGenre
                          ? currentGenre.name
                          : "Tutte le serie TV"}
                    </h2>

                    {hasActiveFilters &&
                      !hasInvalidYearRange &&
                      !actorNotFound && (
                        <p className="mt-3 max-w-2xl text-zinc-400">
                          Ecco le serie che
                          corrispondono ai filtri
                          che hai selezionato.
                        </p>
                      )}

                    {/* BADGE FILTRI */}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {currentGenre && (
                        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-sm font-semibold text-violet-300">
                          🎭{" "}
                          {
                            currentGenre.name
                          }
                        </span>
                      )}

                      {yearFrom && (
                        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-300">
                          📅 Dal {yearFrom}
                        </span>
                      )}

                      {yearTo && (
                        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-300">
                          📅 Al {yearTo}
                        </span>
                      )}

                      {actorQuery &&
                        !actorNotFound && (
                          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-sm font-semibold text-violet-300">
                            🎬{" "}
                            {
                              actorDisplayName
                            }
                          </span>
                        )}

                      {minVote !==
                        undefined && (
                        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-300">
                          ⭐ {minVote}+
                        </span>
                      )}

                      {sortBy !==
                        "popularity.desc" && (
                        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-300">
                          ↕{" "}
                          {getSortLabel(
                            sortBy
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {!hasInvalidYearRange &&
                    !actorNotFound && (
                      <div className="rounded-2xl border border-zinc-800 bg-[#151515] px-5 py-3 text-sm text-zinc-400">
                        <p>
                          <span className="font-bold text-white">
                            {totalResults.toLocaleString(
                              "it-IT"
                            )}
                          </span>{" "}
                          risultati
                        </p>

                        <p className="mt-1">
                          Pagina{" "}
                          {currentPage} di{" "}
                          {totalPages}
                        </p>
                      </div>
                    )}
                </div>

                {/* INTERVALLO ERRATO */}

                {hasInvalidYearRange ? (
                  <div className="rounded-3xl border border-red-500/30 bg-red-500/10 px-6 py-16 text-center">
                    <p className="text-5xl">
                      📅
                    </p>

                    <h3 className="mt-5 text-2xl font-bold text-red-200">
                      Intervallo anni non valido
                    </h3>

                    <p className="mt-3 text-zinc-400">
                      Hai selezionato un anno
                      iniziale successivo
                      all&apos;anno finale.
                    </p>

                    <a
                      href="#filtri"
                      className="mt-6 inline-block rounded-full bg-[#7C3AED] px-6 py-3 font-bold text-white transition hover:bg-[#6D28D9]"
                    >
                      Correggi i filtri
                    </a>
                  </div>
                ) : actorNotFound ? (
                  /* ATTORE NON TROVATO */

                  <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 px-6 py-16 text-center">
                    <p className="text-5xl">
                      🎭
                    </p>

                    <h3 className="mt-5 text-2xl font-bold text-amber-200">
                      Attore non trovato
                    </h3>

                    <p className="mx-auto mt-3 max-w-xl text-zinc-400">
                      Non abbiamo trovato
                      &quot;{actorQuery}&quot;
                      nel database. Prova a
                      controllare il nome
                      dell&apos;attore.
                    </p>

                    <a
                      href="#filtri"
                      className="mt-6 inline-block rounded-full bg-[#7C3AED] px-6 py-3 font-bold text-white transition hover:bg-[#6D28D9]"
                    >
                      Modifica attore
                    </a>
                  </div>
                ) : catalogSeries.length >
                  0 ? (
                  /* SERIE */

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {catalogSeries.map(
                      (series) => (
                        <SeriesCard
                          key={
                            series.id
                          }
                          series={
                            series
                          }
                        />
                      )
                    )}
                  </div>
                ) : (
                  /* NESSUN RISULTATO */

                  <div className="rounded-3xl border border-dashed border-zinc-700 bg-[#151515] px-6 py-16 text-center">
                    <p className="text-5xl">
                      🕵️
                    </p>

                    <h3 className="mt-5 text-2xl font-bold">
                      Nessuna serie trovata
                    </h3>

                    <p className="mt-3 text-zinc-400">
                      Prova a modificare uno
                      dei filtri selezionati.
                    </p>

                    <Link
                      href="/serie-tv"
                      className="mt-6 inline-block rounded-full bg-[#7C3AED] px-6 py-3 font-bold text-white transition hover:bg-[#6D28D9]"
                    >
                      Mostra tutto
                    </Link>
                  </div>
                )}

                {/* PAGINAZIONE */}

                {!hasInvalidYearRange &&
                  !actorNotFound &&
                  catalogSeries.length >
                    0 && (
                    <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
                      {currentPage >
                        1 && (
                        <Link
                          href={buildPageHref(
                            currentPage -
                              1
                          )}
                          className="rounded-full border border-zinc-700 bg-zinc-900 px-6 py-3 font-bold text-zinc-200 transition hover:border-[#7C3AED] hover:text-white"
                        >
                          ← Pagina precedente
                        </Link>
                      )}

                      <span className="rounded-full bg-[#7C3AED]/15 px-5 py-3 text-sm font-bold text-[#A78BFA]">
                        {currentPage} /{" "}
                        {totalPages}
                      </span>

                      {currentPage <
                        totalPages && (
                        <Link
                          href={buildPageHref(
                            currentPage +
                              1
                          )}
                          className="rounded-full bg-[#7C3AED] px-6 py-3 font-bold text-white transition hover:bg-[#6D28D9]"
                        >
                          Pagina successiva →
                        </Link>
                      )}
                    </div>
                  )}
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}

/*
 * SEZIONE EDITORIALE
 */

function SeriesSection({
  eyebrow,
  title,
  description,
  series,
}: {
  eyebrow: string;
  title: string;
  description: string;
  series: TMDBSeries[];
}) {
  if (series.length === 0) {
    return null;
  }

  return (
    <section className="mt-16">
      <div className="mb-7">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#8B5CF6]">
          {eyebrow}
        </p>

        <h2 className="mt-2 text-3xl font-black md:text-4xl">
          {title}
        </h2>

        <p className="mt-2 max-w-2xl text-zinc-400">
          {description}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {series.map((item) => (
          <SeriesCard
            key={item.id}
            series={item}
          />
        ))}
      </div>
    </section>
  );
}

/*
 * CARD SERIE
 */

function SeriesCard({
  series,
}: {
  series: TMDBSeries;
}) {
  const year =
    series.first_air_date
      ? series.first_air_date.slice(
          0,
          4
        )
      : "N/D";

  const rating =
    series.vote_average > 0
      ? `⭐ ${series.vote_average.toFixed(
          1
        )}`
      : "N.D.";

  return (
    <MovieCard
      id={series.id}
      title={series.name}
      year={year}
      rating={rating}
      image={getPosterUrl(
        series.poster_path
      )}
      mediaType="tv"
      tag="Serie TV"
      genre="Serie TV"
      duration="Episodi nella scheda"
    />
  );
}

/*
 * ANNO SERIE
 */

function getSeriesYear(
  firstAirDate: string
) {
  if (!firstAirDate) {
    return null;
  }

  const year =
    Number(
      firstAirDate.slice(
        0,
        4
      )
    );

  return Number.isFinite(year)
    ? year
    : null;
}

/*
 * ORDINAMENTO LOCALE
 *
 * Serve soprattutto quando stiamo
 * filtrando le serie di un attore.
 */

function sortSeriesLocally(
  series: TMDBSeries[],
  sort: SeriesSortOption
) {
  const cloned = [...series];

  if (
    sort === "vote_average.desc"
  ) {
    return cloned.sort(
      (a, b) =>
        b.vote_average -
        a.vote_average
    );
  }

  if (
    sort ===
    "first_air_date.desc"
  ) {
    return cloned.sort(
      (a, b) =>
        getDateValue(
          b.first_air_date
        ) -
        getDateValue(
          a.first_air_date
        )
    );
  }

  if (
    sort ===
    "first_air_date.asc"
  ) {
    return cloned.sort(
      (a, b) =>
        getDateValue(
          a.first_air_date
        ) -
        getDateValue(
          b.first_air_date
        )
    );
  }

  if (sort === "name.asc") {
    return cloned.sort(
      (a, b) =>
        a.name.localeCompare(
          b.name,
          "it"
        )
    );
  }

  if (sort === "name.desc") {
    return cloned.sort(
      (a, b) =>
        b.name.localeCompare(
          a.name,
          "it"
        )
    );
  }

  /*
   * POPOLARITÀ
   */

  return cloned.sort(
    (a, b) =>
      (b.popularity ?? 0) -
      (a.popularity ?? 0)
  );
}

function getDateValue(
  date: string
) {
  if (!date) {
    return 0;
  }

  const value =
    new Date(date).getTime();

  return Number.isFinite(value)
    ? value
    : 0;
}

/*
 * ETICHETTA ORDINAMENTO
 */

function getSortLabel(
  sort: SeriesSortOption
) {
  if (
    sort === "vote_average.desc"
  ) {
    return "Più votate";
  }

  if (
    sort ===
    "first_air_date.desc"
  ) {
    return "Più recenti";
  }

  if (
    sort ===
    "first_air_date.asc"
  ) {
    return "Più vecchie";
  }

  if (sort === "name.asc") {
    return "Titolo A-Z";
  }

  if (sort === "name.desc") {
    return "Titolo Z-A";
  }

  return "Più popolari";
}