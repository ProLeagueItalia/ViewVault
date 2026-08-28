const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

export type MediaType = "movie" | "tv";

export type TMDBMovie = {
  id: number; 
  title: string;
  release_date: string;
  vote_average: number;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
};

export type TMDBSeries = {
  id: number;
  name: string;
  first_air_date: string;
  vote_average: number;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;

  /*
   * Questi campi sono utili quando
   * recuperiamo le serie dai crediti
   * di un attore.
   */
  genre_ids?: number[];
  popularity?: number;
};

export type TMDBSearchResult = {
  id: number;
  media_type: MediaType;
  title: string;
  date: string;
  vote_average: number;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
};

export type TMDBMoviePage = {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
};

export type TMDBSeriesPage = {
  page: number;
  results: TMDBSeries[];
  total_pages: number;
  total_results: number;
};

export type TMDBGenre = {
  id: number;
  name: string;
};

/*
 * PERSONA TMDB
 *
 * Ci serve per trasformare il nome
 * dell'attore nel suo ID TMDB.
 */

export type TMDBPerson = {
  id: number;
  name: string;
  original_name?: string;
  profile_path: string | null;
  known_for_department?: string;
  popularity?: number;
};

export type MovieSortOption =
  | "popularity.desc"
  | "vote_average.desc"
  | "primary_release_date.desc"
  | "primary_release_date.asc"
  | "title.asc"
  | "title.desc";

export type SeriesSortOption =
  | "popularity.desc"
  | "vote_average.desc"
  | "first_air_date.desc"
  | "first_air_date.asc"
  | "name.asc"
  | "name.desc";

/*
 * FILTRI FILM
 */

export type DiscoverMovieFilters = {
  page?: number;
  genreId?: number;
  yearFrom?: number;
  yearTo?: number;
  actorId?: number;
  minVote?: number;
  sortBy?: MovieSortOption;
};

/*
 * FILTRI SERIE TV
 *
 * Per ora rimangono invariati.
 */

export type DiscoverSeriesFilters = {
  page?: number;
  genreId?: number;
  yearFrom?: number;
  yearTo?: number;
  minVote?: number;
  sortBy?: SeriesSortOption;
};

type TMDBMovieResponse = {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
};

type TMDBSeriesResponse = {
  page: number;
  results: TMDBSeries[];
  total_pages: number;
  total_results: number;
};

type TMDBGenreResponse = {
  genres: TMDBGenre[];
};

type TMDBPersonResponse = {
  page: number;
  results: TMDBPerson[];
  total_pages: number;
  total_results: number;
};

type TMDBMultiMovieResult = TMDBMovie & {
  media_type: "movie";
};

type TMDBMultiSeriesResult = TMDBSeries & {
  media_type: "tv";
};

type TMDBPersonResult = {
  id: number;
  media_type: "person";
};

type TMDBMultiResult =
  | TMDBMultiMovieResult
  | TMDBMultiSeriesResult
  | TMDBPersonResult;

type TMDBMultiResponse = {
  page: number;
  results: TMDBMultiResult[];
  total_pages: number;
  total_results: number;
};

/*
 * CONTROLLO API KEY
 */

function checkApiKey() {
  if (!API_KEY) {
    throw new Error(
      "TMDB_API_KEY non è configurata nel file .env.local."
    );
  }
}

/*
 * FETCH GENERICO FILM
 */

async function fetchMovieList(
  endpoint: string,
  page = 1,
  extraParams: Record<string, string> = {}
): Promise<TMDBMoviePage> {
  checkApiKey();

  const params = new URLSearchParams({
    api_key: API_KEY as string,
    language: "it-IT",
    page: String(page),
    include_adult: "false",
    ...extraParams,
  });

  const res = await fetch(
    `${BASE_URL}${endpoint}?${params.toString()}`,
    {
      next: {
        revalidate: 3600,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      `Errore TMDB durante il recupero di ${endpoint}.`
    );
  }

  const data =
    (await res.json()) as TMDBMovieResponse;

  return {
    page: data.page,
    results: data.results ?? [],
    total_pages: data.total_pages ?? 0,
    total_results: data.total_results ?? 0,
  };
}

/*
 * FETCH GENERICO SERIE TV
 */

async function fetchSeriesList(
  endpoint: string,
  page = 1,
  extraParams: Record<string, string> = {}
): Promise<TMDBSeriesPage> {
  checkApiKey();

  const params = new URLSearchParams({
    api_key: API_KEY as string,
    language: "it-IT",
    page: String(page),
    include_adult: "false",
    ...extraParams,
  });

  const res = await fetch(
    `${BASE_URL}${endpoint}?${params.toString()}`,
    {
      next: {
        revalidate: 3600,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      `Errore TMDB durante il recupero di ${endpoint}.`
    );
  }

  const data =
    (await res.json()) as TMDBSeriesResponse;

  return {
    page: data.page,
    results: data.results ?? [],
    total_pages: data.total_pages ?? 0,
    total_results: data.total_results ?? 0,
  };
}

/*
 * FILM - CATALOGO
 */

export async function getPopularMovies(
  page = 1
): Promise<TMDBMoviePage> {
  return fetchMovieList(
    "/movie/popular",
    page
  );
}

export async function getTopRatedMovies(
  page = 1
): Promise<TMDBMoviePage> {
  return fetchMovieList(
    "/movie/top_rated",
    page
  );
}

export async function getUpcomingMovies(
  page = 1
): Promise<TMDBMoviePage> {
  return fetchMovieList(
    "/movie/upcoming",
    page
  );
}

export async function getTrendingMovies(): Promise<
  TMDBMovie[]
> {
  checkApiKey();

  const params = new URLSearchParams({
    api_key: API_KEY as string,
    language: "it-IT",
  });

  const res = await fetch(
    `${BASE_URL}/trending/movie/week?${params.toString()}`,
    {
      next: {
        revalidate: 3600,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      "Errore nel recupero dei film di tendenza."
    );
  }

  const data =
    (await res.json()) as TMDBMovieResponse;

  return data.results ?? [];
}

/*
 * GENERI FILM
 */

export async function getMovieGenres(): Promise<
  TMDBGenre[]
> {
  checkApiKey();

  const params = new URLSearchParams({
    api_key: API_KEY as string,
    language: "it-IT",
  });

  const res = await fetch(
    `${BASE_URL}/genre/movie/list?${params.toString()}`,
    {
      next: {
        revalidate: 86400,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      "Errore nel recupero dei generi cinematografici."
    );
  }

  const data =
    (await res.json()) as TMDBGenreResponse;

  return data.genres ?? [];
}

/*
 * RICERCA PERSONE
 *
 * Questa funzione cerca una persona
 * all'interno del database TMDB.
 */

export async function searchPeople(
  query: string
): Promise<TMDBPerson[]> {
  checkApiKey();

  const cleanQuery = query.trim();

  if (!cleanQuery) {
    return [];
  }

  const params = new URLSearchParams({
    api_key: API_KEY as string,
    language: "it-IT",
    query: cleanQuery,
    page: "1",
    include_adult: "false",
  });

  const res = await fetch(
    `${BASE_URL}/search/person?${params.toString()}`,
    {
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(
      "Errore durante la ricerca dell'attore."
    );
  }

  const data =
    (await res.json()) as TMDBPersonResponse;

  return data.results ?? [];
}

/*
 * TROVA ATTORE DAL NOME
 *
 * L'utente potrà scrivere per esempio:
 *
 * Leonardo DiCaprio
 * Tom Hanks
 * Brad Pitt
 *
 * ViewVault cercherà la persona su TMDB
 * e ricaverà automaticamente il suo ID.
 */

export async function findActorByName(
  query: string
): Promise<TMDBPerson | null> {
  const cleanQuery = query.trim();

  if (!cleanQuery) {
    return null;
  }

  const people =
    await searchPeople(cleanQuery);

  if (people.length === 0) {
    return null;
  }

  const normalizedQuery =
    cleanQuery.toLocaleLowerCase("it-IT");

  /*
   * Prima proviamo a trovare
   * una corrispondenza esatta.
   */

  const exactMatch =
    people.find(
      (person) =>
        person.name
          .toLocaleLowerCase("it-IT") ===
        normalizedQuery
    );

  if (exactMatch) {
    return exactMatch;
  }

  /*
   * Se non troviamo una corrispondenza
   * esatta prendiamo il risultato
   * più rilevante restituito da TMDB.
   */

  return people[0] ?? null;
}

/*
 * DISCOVER FILM
 */

export async function discoverMovies(
  filters: DiscoverMovieFilters = {}
): Promise<TMDBMoviePage> {
  const {
    page = 1,
    genreId,
    yearFrom,
    yearTo,
    actorId,
    minVote,
    sortBy = "popularity.desc",
  } = filters;

  const extraParams: Record<string, string> = {
    sort_by: sortBy,
    "vote_count.gte": "20",
  };

  /*
   * GENERE
   */

  if (genreId) {
    extraParams.with_genres =
      String(genreId);
  }

  /*
   * ANNO DA
   */

  if (yearFrom) {
    extraParams[
      "primary_release_date.gte"
    ] = `${yearFrom}-01-01`;
  }

  /*
   * ANNO A
   */

  if (yearTo) {
    extraParams[
      "primary_release_date.lte"
    ] = `${yearTo}-12-31`;
  }

  /*
   * ATTORE
   *
   * TMDB usa with_cast per filtrare
   * i film in cui compare una persona
   * specifica nel cast.
   */

  if (actorId) {
    extraParams.with_cast =
      String(actorId);
  }

  /*
   * VOTO MINIMO
   */

  if (
    typeof minVote === "number" &&
    Number.isFinite(minVote)
  ) {
    extraParams["vote_average.gte"] =
      String(minVote);
  }

  return fetchMovieList(
    "/discover/movie",
    page,
    extraParams
  );
}

/*
 * FILM AL CINEMA
 */

export async function getNowPlayingMovies(): Promise<
  TMDBMovie[]
> {
  const data = await fetchMovieList(
    "/movie/now_playing",
    1
  );

  return data.results;
}

/*
 * SERIE TV - CATALOGO
 */

export async function getPopularSeries(
  page = 1
): Promise<TMDBSeriesPage> {
  return fetchSeriesList(
    "/tv/popular",
    page
  );
}

export async function getTopRatedSeries(
  page = 1
): Promise<TMDBSeriesPage> {
  return fetchSeriesList(
    "/tv/top_rated",
    page
  );
}

export async function getAiringTodaySeries(
  page = 1
): Promise<TMDBSeriesPage> {
  return fetchSeriesList(
    "/tv/airing_today",
    page
  );
}

/*
 * NUOVE SERIE TV
 *
 * Recupera serie TV realmente nuove,
 * basandosi sulla data della prima messa in onda.
 *
 * Consideriamo "nuove" le serie che hanno
 * debuttato negli ultimi 12 mesi.
 */

export async function getNewSeries(
  page = 1
): Promise<TMDBSeriesPage> {
  const today = new Date();

  const twelveMonthsAgo = new Date(today);
  twelveMonthsAgo.setFullYear(
    twelveMonthsAgo.getFullYear() - 1
  );

  const formatDate = (date: Date) => {
    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  return fetchSeriesList(
    "/discover/tv",
    page,
    {
      sort_by: "first_air_date.desc",
      "first_air_date.gte":
        formatDate(twelveMonthsAgo),
      "first_air_date.lte":
        formatDate(today),
      "vote_count.gte": "10",
    }
  );
}

export async function getTrendingSeries(): Promise<
  TMDBSeries[]
> {
  checkApiKey();

  const params = new URLSearchParams({
    api_key: API_KEY as string,
    language: "it-IT",
  });

  const res = await fetch(
    `${BASE_URL}/trending/tv/week?${params.toString()}`,
    {
      next: {
        revalidate: 3600,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      "Errore nel recupero delle serie TV di tendenza."
    );
  }

  const data =
    (await res.json()) as TMDBSeriesResponse;

  return data.results ?? [];
}

/*
 * GENERI SERIE TV
 */

export async function getSeriesGenres(): Promise<
  TMDBGenre[]
> {
  checkApiKey();

  const params = new URLSearchParams({
    api_key: API_KEY as string,
    language: "it-IT",
  });

  const res = await fetch(
    `${BASE_URL}/genre/tv/list?${params.toString()}`,
    {
      next: {
        revalidate: 86400,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      "Errore nel recupero dei generi delle serie TV."
    );
  }

  const data =
    (await res.json()) as TMDBGenreResponse;

  return data.genres ?? [];
}

/*
 * DISCOVER SERIE TV
 */

export async function discoverSeries(
  filters: DiscoverSeriesFilters = {}
): Promise<TMDBSeriesPage> {
  const {
    page = 1,
    genreId,
    yearFrom,
    yearTo,
    minVote,
    sortBy = "popularity.desc",
  } = filters;

  const extraParams: Record<string, string> = {
    sort_by: sortBy,
    "vote_count.gte": "20",
  };

  /*
   * GENERE
   */

  if (genreId) {
    extraParams.with_genres =
      String(genreId);
  }

  /*
   * ANNO DA
   */

  if (yearFrom) {
    extraParams[
      "first_air_date.gte"
    ] = `${yearFrom}-01-01`;
  }

  /*
   * ANNO A
   */

  if (yearTo) {
    extraParams[
      "first_air_date.lte"
    ] = `${yearTo}-12-31`;
  }

  /*
   * VOTO MINIMO
   */

  if (
    typeof minVote === "number" &&
    Number.isFinite(minVote)
  ) {
    extraParams["vote_average.gte"] =
      String(minVote);
  }

  return fetchSeriesList(
    "/discover/tv",
    page,
    extraParams
  );
}


/*
 * SERIE TV DI UN ATTORE
 *
 * TMDB non supporta with_cast direttamente
 * dentro /discover/tv.
 *
 * Per questo recuperiamo i crediti combinati
 * della persona e conserviamo soltanto
 * i contenuti di tipo TV.
 */

type TMDBCombinedTvCredit = TMDBSeries & {
  media_type: "tv";
};

type TMDBCombinedMovieCredit = {
  id: number;
  media_type: "movie";
};

type TMDBCombinedCredit =
  | TMDBCombinedTvCredit
  | TMDBCombinedMovieCredit;

type TMDBCombinedCreditsResponse = {
  cast?: TMDBCombinedCredit[];
};

export async function getSeriesByActor(
  actorId: number
): Promise<TMDBSeries[]> {
  checkApiKey();

  const params = new URLSearchParams({
    api_key: API_KEY as string,
    language: "it-IT",
  });

  const res = await fetch(
    `${BASE_URL}/person/${actorId}/combined_credits?${params.toString()}`,
    {
      next: {
        revalidate: 3600,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      "Errore nel recupero delle serie TV dell'attore."
    );
  }

  const data =
    (await res.json()) as TMDBCombinedCreditsResponse;

  const series =
    data.cast?.filter(
      (
        credit
      ): credit is TMDBCombinedTvCredit =>
        credit.media_type === "tv"
    ) ?? [];

  const uniqueSeries =
    new Map<number, TMDBSeries>();

  for (const item of series) {
    if (!uniqueSeries.has(item.id)) {
      uniqueSeries.set(
        item.id,
        {
          id: item.id,
          name: item.name,
          first_air_date:
            item.first_air_date ?? "",
          vote_average:
            item.vote_average ?? 0,
          poster_path:
            item.poster_path ?? null,
          backdrop_path:
            item.backdrop_path ?? null,
          overview:
            item.overview ?? "",
          genre_ids:
            item.genre_ids ?? [],
          popularity:
            item.popularity ?? 0,
        }
      );
    }
  }

  return Array.from(
    uniqueSeries.values()
  );
}
/*
 * RICERCA SOLO FILM
 */

export async function searchMovies(
  query: string
): Promise<TMDBMovie[]> {
  checkApiKey();

  const cleanQuery = query.trim();

  if (!cleanQuery) {
    return [];
  }

  const params = new URLSearchParams({
    api_key: API_KEY as string,
    language: "it-IT",
    query: cleanQuery,
    page: "1",
    include_adult: "false",
  });

  const res = await fetch(
    `${BASE_URL}/search/movie?${params.toString()}`,
    {
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(
      "Errore durante la ricerca dei film."
    );
  }

  const data =
    (await res.json()) as TMDBMovieResponse;

  return data.results;
}

/*
 * RICERCA FILM + SERIE TV
 */

export async function searchMoviesAndSeries(
  query: string
): Promise<TMDBSearchResult[]> {
  checkApiKey();

  const cleanQuery = query.trim();

  if (!cleanQuery) {
    return [];
  }

  const params = new URLSearchParams({
    api_key: API_KEY as string,
    language: "it-IT",
    query: cleanQuery,
    page: "1",
    include_adult: "false",
  });

  const res = await fetch(
    `${BASE_URL}/search/multi?${params.toString()}`,
    {
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(
      "Errore durante la ricerca di film e serie TV."
    );
  }

  const data =
    (await res.json()) as TMDBMultiResponse;

  return data.results
    .filter(
      (
        result
      ): result is
        | TMDBMultiMovieResult
        | TMDBMultiSeriesResult =>
        result.media_type === "movie" ||
        result.media_type === "tv"
    )
    .map((result): TMDBSearchResult => {
      if (result.media_type === "movie") {
        return {
          id: result.id,
          media_type: "movie",
          title: result.title,
          date: result.release_date ?? "",
          vote_average:
            result.vote_average ?? 0,
          poster_path:
            result.poster_path,
          backdrop_path:
            result.backdrop_path,
          overview:
            result.overview ?? "",
        };
      }

      return {
        id: result.id,
        media_type: "tv",
        title: result.name,
        date:
          result.first_air_date ?? "",
        vote_average:
          result.vote_average ?? 0,
        poster_path:
          result.poster_path,
        backdrop_path:
          result.backdrop_path,
        overview:
          result.overview ?? "",
      };
    });
}

/*
 * DETTAGLIO FILM
 */

export async function getMovie(
  id: string
) {
  checkApiKey();

  const params = new URLSearchParams({
    api_key: API_KEY as string,
    language: "it-IT",
  });

  const res = await fetch(
    `${BASE_URL}/movie/${id}?${params.toString()}`,
    {
      next: {
        revalidate: 3600,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      "Film non trovato."
    );
  }

  return res.json();
}

export async function getMovieCredits(
  id: string
) {
  checkApiKey();

  const params = new URLSearchParams({
    api_key: API_KEY as string,
    language: "it-IT",
  });

  const res = await fetch(
    `${BASE_URL}/movie/${id}/credits?${params.toString()}`,
    {
      next: {
        revalidate: 3600,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      "Errore nel recupero del cast."
    );
  }

  return res.json();
}

export async function getMovieVideos(
  id: string
) {
  checkApiKey();

  const params = new URLSearchParams({
    api_key: API_KEY as string,
    language: "it-IT",
  });

  const res = await fetch(
    `${BASE_URL}/movie/${id}/videos?${params.toString()}`,
    {
      next: {
        revalidate: 3600,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      "Errore nel recupero dei video."
    );
  }

  return res.json();
}

/*
 * DETTAGLIO SERIE TV
 */

export async function getSeries(
  id: string
) {
  checkApiKey();

  const params = new URLSearchParams({
    api_key: API_KEY as string,
    language: "it-IT",
  });

  const res = await fetch(
    `${BASE_URL}/tv/${id}?${params.toString()}`,
    {
      next: {
        revalidate: 3600,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      "Serie TV non trovata."
    );
  }

  return res.json();
}

export async function getSeriesCredits(
  id: string
) {
  checkApiKey();

  const params = new URLSearchParams({
    api_key: API_KEY as string,
    language: "it-IT",
  });

  const res = await fetch(
    `${BASE_URL}/tv/${id}/credits?${params.toString()}`,
    {
      next: {
        revalidate: 3600,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      "Errore nel recupero del cast della serie TV."
    );
  }

  return res.json();
}

export async function getSeriesVideos(
  id: string
) {
  checkApiKey();

  const params = new URLSearchParams({
    api_key: API_KEY as string,
    language: "it-IT",
  });

  const res = await fetch(
    `${BASE_URL}/tv/${id}/videos?${params.toString()}`,
    {
      next: {
        revalidate: 3600,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      "Errore nel recupero dei video della serie TV."
    );
  }

  return res.json();
}

export async function getSeriesSeason(
  seriesId: string,
  seasonNumber: number
) {
  checkApiKey();

  const params = new URLSearchParams({
    api_key: API_KEY as string,
    language: "it-IT",
  });

  const res = await fetch(
    `${BASE_URL}/tv/${seriesId}/season/${seasonNumber}?${params.toString()}`,
    {
      next: {
        revalidate: 3600,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      `Errore nel recupero della stagione ${seasonNumber}.`
    );
  }

  return res.json();
}

/*
 * IMMAGINI
 */

export function getPosterUrl(
  path: string | null
) {
  if (!path) {
    return "/viewvault-logo.svg";
  }

  return `${IMAGE_BASE}${path}`;
}

/*
 * TRENDING GLOBALE
 *
 * Recupera i contenuti più popolari del momento
 * su TMDB mescolando Film e Serie TV.
 */

export type TMDBTrendingItem = {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  date: string;
  vote_average: number;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  popularity: number;
};

type TMDBTrendingResponse = {
  page: number;
  results: Array<
    | (TMDBMovie & {
        media_type: "movie";
        popularity?: number;
      })
    | (TMDBSeries & {
        media_type: "tv";
        popularity?: number;
      })
    | {
        id: number;
        media_type: "person";
      }
  >;
};

export async function getTrendingAll(
  language = "it-IT"
): Promise<TMDBTrendingItem[]> {
  checkApiKey();

  const params = new URLSearchParams({
    api_key: API_KEY as string,
    language,
  });

  const res = await fetch(
    `${BASE_URL}/trending/all/day?${params.toString()}`,
    {
      next: {
        revalidate: 3600,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      "Errore nel recupero dei contenuti più visti del momento."
    );
  }

  const data =
    (await res.json()) as TMDBTrendingResponse;

  return data.results
    .filter(
      (
        item
      ): item is
        | (TMDBMovie & {
            media_type: "movie";
            popularity?: number;
          })
        | (TMDBSeries & {
            media_type: "tv";
            popularity?: number;
          }) =>
        item.media_type === "movie" ||
        item.media_type === "tv"
    )
    .map((item): TMDBTrendingItem => {
      if (item.media_type === "movie") {
        return {
          id: item.id,
          media_type: "movie",
          title: item.title,
          date: item.release_date ?? "",
          vote_average: item.vote_average ?? 0,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          overview: item.overview ?? "",
          popularity: item.popularity ?? 0,
        };
      }

      return {
        id: item.id,
        media_type: "tv",
        title: item.name,
        date: item.first_air_date ?? "",
        vote_average: item.vote_average ?? 0,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        overview: item.overview ?? "",
        popularity: item.popularity ?? 0,
      };
    });
}
export type TMDBWatchProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number;
};

export type TMDBWatchProvidersCountry = {
  link?: string;
  flatrate?: TMDBWatchProvider[];
  rent?: TMDBWatchProvider[];
  buy?: TMDBWatchProvider[];
};

type TMDBWatchProvidersResponse = {
  id: number;
  results: Record<
    string,
    TMDBWatchProvidersCountry
  >;
};

export async function getMovieWatchProviders(
  id: string,
  countryCode = "IT"
): Promise<TMDBWatchProvidersCountry | null> {
  checkApiKey();

  const params = new URLSearchParams({
    api_key: API_KEY as string,
  });

  const res = await fetch(
    `${BASE_URL}/movie/${id}/watch/providers?${params.toString()}`,
    {
      next: {
        revalidate: 21600,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      "Errore nel recupero dei provider del film."
    );
  }

  const data =
    (await res.json()) as TMDBWatchProvidersResponse;

  return data.results?.[countryCode] ?? null;
}

export async function getSeriesWatchProviders(
  id: string,
  countryCode = "IT"
): Promise<TMDBWatchProvidersCountry | null> {
  checkApiKey();

  const params = new URLSearchParams({
    api_key: API_KEY as string,
  });

  const res = await fetch(
    `${BASE_URL}/tv/${id}/watch/providers?${params.toString()}`,
    {
      next: {
        revalidate: 21600,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      "Errore nel recupero dei provider della serie TV."
    );
  }

  const data =
    (await res.json()) as TMDBWatchProvidersResponse;

  return data.results?.[countryCode] ?? null;
}