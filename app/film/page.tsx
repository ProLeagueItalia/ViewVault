import Link from "next/link";
import {
  getLocale,
  getTranslations,
} from "next-intl/server";

import AppHeader from "../../components/AppHeader";
import BackButton from "../../components/BackButton";
import MovieCard from "../../components/MovieCard";

import {
  discoverMovies,
  findActorByName,
  getMovieGenres,
  getNowPlayingMovies,
  getPopularMovies,
  getPosterUrl,
  getTopRatedMovies,
  getTrendingMovies,
  type MovieSortOption,
  type TMDBGenre,
  type TMDBMovie,
} from "../../lib/tmdb";

type FilmPageProps = {
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

const validSortOptions: MovieSortOption[] = [
  "popularity.desc",
  "vote_average.desc",
  "primary_release_date.desc",
  "primary_release_date.asc",
  "title.asc",
  "title.desc",
];

export default async function FilmPage({
  searchParams,
}: FilmPageProps) {
  const t = await getTranslations(
    "MoviesPage"
  );

  const tc = await getTranslations(
    "Catalog"
  );

  const locale = await getLocale();

  const params =
    await Promise.resolve(searchParams);

  /*
   * PAGINA
   */

  const requestedPage = Number(
    params.page ?? "1"
  );

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
  let actorDisplayName =
    actorQuery;

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
      | MovieSortOption
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

  let trendingMovies: TMDBMovie[] = [];
  let popularMovies: TMDBMovie[] = [];
  let topRatedMovies: TMDBMovie[] = [];
  let nowPlayingMovies: TMDBMovie[] = [];
  let catalogMovies: TMDBMovie[] = [];
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
        await findActorByName(
          actorQuery
        );

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
      genres =
        await getMovieGenres();
    }

    /*
     * ATTORE NON TROVATO
     */

    else if (actorNotFound) {
      genres =
        await getMovieGenres();
    }

    /*
     * CON FILTRI
     */

    else if (hasActiveFilters) {
      const [
        catalogResponse,
        genreResponse,
      ] = await Promise.all([
        discoverMovies({
          page: currentPage,
          genreId,
          yearFrom,
          yearTo,
          actorId,
          minVote,
          sortBy,
        }),

        getMovieGenres(),
      ]);

      catalogMovies =
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
        nowPlayingResponse,
        catalogResponse,
        genreResponse,
      ] = await Promise.all([
        getTrendingMovies(),
        getPopularMovies(1),
        getTopRatedMovies(1),
        getNowPlayingMovies(),

        discoverMovies({
          page: currentPage,
          sortBy,
        }),

        getMovieGenres(),
      ]);

      trendingMovies =
        trendingResponse.slice(
          0,
          8
        );

      popularMovies =
        popularResponse.results.slice(
          0,
          8
        );

      topRatedMovies =
        topRatedResponse.results.slice(
          0,
          8
        );

      nowPlayingMovies =
        nowPlayingResponse.slice(
          0,
          8
        );

      catalogMovies =
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
      "Errore nel caricamento del catalogo Film:",
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
    sortBy !==
    "popularity.desc"
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

    return `/film?${nextParams.toString()}#catalogo`;
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

  /*
   * ETICHETTA ORDINAMENTO
   */

  function getSortLabel(
    sort: MovieSortOption
  ) {
    if (
      sort ===
      "vote_average.desc"
    ) {
      return tc(
        "highestRated"
      );
    }

    if (
      sort ===
      "primary_release_date.desc"
    ) {
      return tc("newest");
    }

    if (
      sort ===
      "primary_release_date.asc"
    ) {
      return tc("oldest");
    }

    if (
      sort === "title.asc"
    ) {
      return tc("titleAZ");
    }

    if (
      sort === "title.desc"
    ) {
      return tc("titleZA");
    }

    return tc("mostPopular");
  }

  const formattedTotalResults =
    new Intl.NumberFormat(
      locale
    ).format(totalResults);

  return (
    <>
      <AppHeader />

      <main className="min-h-screen bg-[#0D0D0D] pb-24 text-white">
        {/* PULSANTE INDIETRO */}
        <div className="mx-auto max-w-7xl px-6 pt-6">
          <BackButton fallbackHref="/" />
        </div>

        {/* HERO */}

        <section className="border-b border-zinc-800 bg-gradient-to-b from-[#17101F] via-[#0D0D0D] to-[#0D0D0D]">
          <div className="mx-auto max-w-7xl px-6 pb-16 pt-16">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-bold text-violet-300">
                🎬 {t("catalogLabel")}
              </span>

              <h1 className="mt-6 text-5xl font-black tracking-tight md:text-7xl">
                {t("heroPrefix")}{" "}
                <span className="text-[#7C3AED]">
                  {t(
                    "heroHighlight"
                  )}
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
                {t(
                  "heroDescription"
                )}
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
                  htmlFor="film-search"
                  className="sr-only"
                >
                  {t(
                    "searchLabel"
                  )}
                </label>

                <input
                  id="film-search"
                  name="q"
                  type="search"
                  placeholder={t(
                    "searchPlaceholder"
                  )}
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-full border border-zinc-700 bg-zinc-900/90 px-6 py-4 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-[#7C3AED] focus:ring-4 focus:ring-violet-500/10"
                />

                <button
                  type="submit"
                  className="rounded-full bg-[#7C3AED] px-8 py-4 font-bold text-white transition hover:bg-[#6D28D9] hover:shadow-[0_0_25px_rgba(124,58,237,0.35)]"
                >
                  {tc("search")}
                </button>
              </form>

              <a
                href="#filtri"
                className="inline-flex items-center justify-center rounded-full border border-[#7C3AED] bg-[#7C3AED]/10 px-8 py-4 font-bold text-[#C4B5FD] transition hover:bg-[#7C3AED] hover:text-white"
              >
                🎛 {tc("filters")}
              </a>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6">
          {hasError ? (
            <section className="mt-16 rounded-3xl border border-red-500/30 bg-red-500/10 p-12 text-center">
              <p className="text-5xl">
                🎬
              </p>

              <h2 className="mt-5 text-2xl font-bold text-red-200">
                {t(
                  "unavailableTitle"
                )}
              </h2>

              <p className="mt-3 text-zinc-400">
                {t(
                  "unavailableDescription"
                )}
              </p>
            </section>
          ) : (
            <>
              {/* SEZIONI EDITORIALI */}

              {!hasActiveFilters && (
                <>
                  <MovieSection
                    eyebrow={t(
                      "trendingEyebrow"
                    )}
                    title={t(
                      "trendingTitle"
                    )}
                    description={t(
                      "trendingDescription"
                    )}
                    movies={
                      trendingMovies
                    }
                    movieLabel={t(
                      "movie"
                    )}
                    durationLabel={t(
                      "durationInDetails"
                    )}
                    notAvailableLabel={tc(
                      "notAvailable"
                    )}
                  />

                  <MovieSection
                    eyebrow={t(
                      "popularEyebrow"
                    )}
                    title={t(
                      "popularTitle"
                    )}
                    description={t(
                      "popularDescription"
                    )}
                    movies={
                      popularMovies
                    }
                    movieLabel={t(
                      "movie"
                    )}
                    durationLabel={t(
                      "durationInDetails"
                    )}
                    notAvailableLabel={tc(
                      "notAvailable"
                    )}
                  />

                  <MovieSection
                    eyebrow={t(
                      "topRatedEyebrow"
                    )}
                    title={t(
                      "topRatedTitle"
                    )}
                    description={t(
                      "topRatedDescription"
                    )}
                    movies={
                      topRatedMovies
                    }
                    movieLabel={t(
                      "movie"
                    )}
                    durationLabel={t(
                      "durationInDetails"
                    )}
                    notAvailableLabel={tc(
                      "notAvailable"
                    )}
                  />

                  <MovieSection
                    eyebrow={t(
                      "nowPlayingEyebrow"
                    )}
                    title={t(
                      "nowPlayingTitle"
                    )}
                    description={t(
                      "nowPlayingDescription"
                    )}
                    movies={
                      nowPlayingMovies
                    }
                    movieLabel={t(
                      "movie"
                    )}
                    durationLabel={t(
                      "durationInDetails"
                    )}
                    notAvailableLabel={tc(
                      "notAvailable"
                    )}
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
                    {tc("explore")}
                  </p>

                  <h2 className="mt-2 text-3xl font-black md:text-4xl">
                    {tc(
                      "filterCatalog"
                    )}
                  </h2>

                  <p className="mt-3 max-w-3xl text-zinc-400">
                    {tc(
                      "filterDescription"
                    )}
                  </p>
                </div>

                <form
                  action="/film#catalogo"
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
                        {tc("genre")}
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
                          {tc(
                            "allGenres"
                          )}
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
                        {tc("from")}
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
                          {tc(
                            "anyYear"
                          )}
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
                        {tc("to")}
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
                          {tc(
                            "anyYear"
                          )}
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
                        {tc("actor")}
                      </label>

                      <input
                        id="actor"
                        name="actor"
                        type="search"
                        defaultValue={
                          actorQuery
                        }
                        placeholder={tc(
                          "actorExample"
                        )}
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
                        {tc(
                          "minimumRating"
                        )}
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
                          {tc(
                            "anyRating"
                          )}
                        </option>

                        <option value="8">
                          {tc(
                            "ratingOrHigher",
                            {
                              rating:
                                8,
                            }
                          )}
                        </option>

                        <option value="7">
                          {tc(
                            "ratingOrHigher",
                            {
                              rating:
                                7,
                            }
                          )}
                        </option>

                        <option value="6">
                          {tc(
                            "ratingOrHigher",
                            {
                              rating:
                                6,
                            }
                          )}
                        </option>

                        <option value="5">
                          {tc(
                            "ratingOrHigher",
                            {
                              rating:
                                5,
                            }
                          )}
                        </option>
                      </select>
                    </div>

                    {/* ORDINA */}

                    <div>
                      <label
                        htmlFor="sort"
                        className="mb-2 block text-sm font-bold text-zinc-300"
                      >
                        {tc("sortBy")}
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
                          {tc(
                            "mostPopular"
                          )}
                        </option>

                        <option value="vote_average.desc">
                          {tc(
                            "highestRated"
                          )}
                        </option>

                        <option value="primary_release_date.desc">
                          {tc(
                            "newest"
                          )}
                        </option>

                        <option value="primary_release_date.asc">
                          {tc(
                            "oldest"
                          )}
                        </option>

                        <option value="title.asc">
                          {tc(
                            "titleAZ"
                          )}
                        </option>

                        <option value="title.desc">
                          {tc(
                            "titleZA"
                          )}
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* ERRORE INTERVALLO */}

                  {hasInvalidYearRange && (
                    <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-300">
                      {tc(
                        "invalidYearRangeShort"
                      )}
                    </div>
                  )}

                  {/* ATTORE NON TROVATO */}

                  {actorNotFound && (
                    <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm font-semibold text-amber-300">
                      {tc(
                        "actorNotFoundShort",
                        {
                          actor:
                            actorQuery,
                        }
                      )}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="rounded-full bg-[#7C3AED] px-7 py-3 font-bold text-white transition hover:bg-[#6D28D9]"
                    >
                      {tc(
                        "applyFilters"
                      )}
                    </button>

                    {hasActiveFilters && (
                      <Link
                        href="/film"
                        className="rounded-full border border-zinc-700 bg-zinc-900 px-7 py-3 font-bold text-zinc-300 transition hover:border-[#7C3AED] hover:text-white"
                      >
                        {tc(
                          "resetFilters"
                        )}
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
                        ? tc(
                            "results"
                          )
                        : tc(
                            "catalog"
                          )}
                    </p>

                    <h2 className="mt-2 text-3xl font-black md:text-4xl">
                      {hasActiveFilters
                        ? tc(
                            "filteredResults"
                          )
                        : currentGenre
                          ? currentGenre.name
                          : t(
                              "allMovies"
                            )}
                    </h2>

                    {hasActiveFilters &&
                      !hasInvalidYearRange &&
                      !actorNotFound && (
                        <p className="mt-3 max-w-2xl text-zinc-400">
                          {t(
                            "filteredDescription"
                          )}
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
                          📅{" "}
                          {tc(
                            "fromBadge",
                            {
                              year: yearFrom,
                            }
                          )}
                        </span>
                      )}

                      {yearTo && (
                        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-300">
                          📅{" "}
                          {tc(
                            "toBadge",
                            {
                              year: yearTo,
                            }
                          )}
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
                          {tc(
                            "resultsCount",
                            {
                              count:
                                formattedTotalResults,
                            }
                          )}
                        </p>

                        <p className="mt-1">
                          {tc(
                            "pageOf",
                            {
                              page:
                                currentPage,
                              total:
                                totalPages,
                            }
                          )}
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
                      {tc(
                        "invalidYearRangeTitle"
                      )}
                    </h3>

                    <p className="mt-3 text-zinc-400">
                      {tc(
                        "invalidYearRangeDescription"
                      )}
                    </p>

                    <a
                      href="#filtri"
                      className="mt-6 inline-block rounded-full bg-[#7C3AED] px-6 py-3 font-bold text-white transition hover:bg-[#6D28D9]"
                    >
                      {tc(
                        "fixFilters"
                      )}
                    </a>
                  </div>
                ) : actorNotFound ? (
                  /* ATTORE NON TROVATO */

                  <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 px-6 py-16 text-center">
                    <p className="text-5xl">
                      🎭
                    </p>

                    <h3 className="mt-5 text-2xl font-bold text-amber-200">
                      {tc(
                        "actorNotFoundTitle"
                      )}
                    </h3>

                    <p className="mx-auto mt-3 max-w-xl text-zinc-400">
                      {tc(
                        "actorNotFoundDescription",
                        {
                          actor:
                            actorQuery,
                        }
                      )}
                    </p>

                    <a
                      href="#filtri"
                      className="mt-6 inline-block rounded-full bg-[#7C3AED] px-6 py-3 font-bold text-white transition hover:bg-[#6D28D9]"
                    >
                      {tc(
                        "editActor"
                      )}
                    </a>
                  </div>
                ) : catalogMovies.length >
                  0 ? (
                  /* FILM */

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {catalogMovies.map(
                      (movie) => (
                        <FilmCard
                          key={
                            movie.id
                          }
                          movie={
                            movie
                          }
                          movieLabel={t(
                            "movie"
                          )}
                          durationLabel={t(
                            "durationInDetails"
                          )}
                          notAvailableLabel={tc(
                            "notAvailable"
                          )}
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
                      {t(
                        "noMoviesFound"
                      )}
                    </h3>

                    <p className="mt-3 text-zinc-400">
                      {tc(
                        "noResultsDescription"
                      )}
                    </p>

                    <Link
                      href="/film"
                      className="mt-6 inline-block rounded-full bg-[#7C3AED] px-6 py-3 font-bold text-white transition hover:bg-[#6D28D9]"
                    >
                      {tc(
                        "showAll"
                      )}
                    </Link>
                  </div>
                )}

                {/* PAGINAZIONE */}

                {!hasInvalidYearRange &&
                  !actorNotFound &&
                  catalogMovies.length >
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
                          {tc(
                            "previousPage"
                          )}
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
                          {tc(
                            "nextPage"
                          )}
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

function MovieSection({
  eyebrow,
  title,
  description,
  movies,
  movieLabel,
  durationLabel,
  notAvailableLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  movies: TMDBMovie[];
  movieLabel: string;
  durationLabel: string;
  notAvailableLabel: string;
}) {
  if (movies.length === 0) {
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
        {movies.map((movie) => (
          <FilmCard
            key={movie.id}
            movie={movie}
            movieLabel={
              movieLabel
            }
            durationLabel={
              durationLabel
            }
            notAvailableLabel={
              notAvailableLabel
            }
          />
        ))}
      </div>
    </section>
  );
}

/*
 * CARD FILM
 */

function FilmCard({
  movie,
  movieLabel,
  durationLabel,
  notAvailableLabel,
}: {
  movie: TMDBMovie;
  movieLabel: string;
  durationLabel: string;
  notAvailableLabel: string;
}) {
  const year =
    movie.release_date
      ? movie.release_date.slice(
          0,
          4
        )
      : notAvailableLabel;

  const rating =
    movie.vote_average > 0
      ? `⭐ ${movie.vote_average.toFixed(
          1
        )}`
      : notAvailableLabel;

  return (
    <MovieCard
      id={movie.id}
      title={movie.title}
      year={year}
      rating={rating}
      image={getPosterUrl(
        movie.poster_path
      )}
      mediaType="movie"
      tag={movieLabel}
      genre={movieLabel}
      duration={durationLabel}
    />
  );
}