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

export type DiscoverMovieFilters = {
  page?: number;
  genreId?: number;
  year?: number;
  minVote?: number;
  sortBy?: MovieSortOption;
};

export type DiscoverSeriesFilters = {
  page?: number;
  genreId?: number;
  year?: number;
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

function checkApiKey() {
  if (!API_KEY) {
    throw new Error(
      "TMDB_API_KEY non è configurata nel file .env.local."
    );
  }
}

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
  return fetchMovieList("/movie/popular", page);
}

export async function getTopRatedMovies(
  page = 1
): Promise<TMDBMoviePage> {
  return fetchMovieList("/movie/top_rated", page);
}

export async function getUpcomingMovies(
  page = 1
): Promise<TMDBMoviePage> {
  return fetchMovieList("/movie/upcoming", page);
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

export async function discoverMovies(
  filters: DiscoverMovieFilters = {}
): Promise<TMDBMoviePage> {
  const {
    page = 1,
    genreId,
    year,
    minVote,
    sortBy = "popularity.desc",
  } = filters;

  const extraParams: Record<string, string> = {
    sort_by: sortBy,
    "vote_count.gte": "20",
  };

  if (genreId) {
    extraParams.with_genres = String(genreId);
  }

  if (year) {
    extraParams.primary_release_year =
      String(year);
  }

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
  return fetchSeriesList("/tv/popular", page);
}

export async function getTopRatedSeries(
  page = 1
): Promise<TMDBSeriesPage> {
  return fetchSeriesList("/tv/top_rated", page);
}

export async function getAiringTodaySeries(
  page = 1
): Promise<TMDBSeriesPage> {
  return fetchSeriesList(
    "/tv/airing_today",
    page
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

export async function discoverSeries(
  filters: DiscoverSeriesFilters = {}
): Promise<TMDBSeriesPage> {
  const {
    page = 1,
    genreId,
    year,
    minVote,
    sortBy = "popularity.desc",
  } = filters;

  const extraParams: Record<string, string> = {
    sort_by: sortBy,
    "vote_count.gte": "20",
  };

  if (genreId) {
    extraParams.with_genres =
      String(genreId);
  }

  if (year) {
    extraParams.first_air_date_year =
      String(year);
  }

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
          poster_path: result.poster_path,
          backdrop_path:
            result.backdrop_path,
          overview: result.overview ?? "",
        };
      }

      return {
        id: result.id,
        media_type: "tv",
        title: result.name,
        date: result.first_air_date ?? "",
        vote_average:
          result.vote_average ?? 0,
        poster_path: result.poster_path,
        backdrop_path:
          result.backdrop_path,
        overview: result.overview ?? "",
      };
    });
}

/*
 * DETTAGLIO FILM
 */

export async function getMovie(id: string) {
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
    throw new Error("Film non trovato.");
  }

  return res.json();
}

export async function getMovieCredits(id: string) {
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

export async function getMovieVideos(id: string) {
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

export async function getSeries(id: string) {
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