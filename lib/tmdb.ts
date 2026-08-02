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

type TMDBMovieResponse = {
  page: number;
  results: TMDBMovie[];
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

function checkApiKey() {
  if (!API_KEY) {
    throw new Error(
      "TMDB_API_KEY non è configurata nel file .env.local."
    );
  }
}

export async function getNowPlayingMovies(): Promise<TMDBMovie[]> {
  checkApiKey();

  const params = new URLSearchParams({
    api_key: API_KEY as string,
    language: "it-IT",
    page: "1",
  });

  const res = await fetch(
    `${BASE_URL}/movie/now_playing?${params.toString()}`,
    {
      next: {
        revalidate: 3600,
      },
    }
  );

  if (!res.ok) {
    throw new Error("Errore nel recupero dei film.");
  }

  const data = (await res.json()) as TMDBMovieResponse;

  return data.results;
}

/**
 * Ricerca solo film.
 * La manteniamo per compatibilità con il codice già esistente.
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
    throw new Error("Errore durante la ricerca dei film.");
  }

  const data = (await res.json()) as TMDBMovieResponse;

  return data.results;
}

/**
 * Ricerca combinata di film e serie TV.
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

  const data = (await res.json()) as TMDBMultiResponse;

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
          vote_average: result.vote_average ?? 0,
          poster_path: result.poster_path,
          backdrop_path: result.backdrop_path,
          overview: result.overview ?? "",
        };
      }

      return {
        id: result.id,
        media_type: "tv",
        title: result.name,
        date: result.first_air_date ?? "",
        vote_average: result.vote_average ?? 0,
        poster_path: result.poster_path,
        backdrop_path: result.backdrop_path,
        overview: result.overview ?? "",
      };
    });
}

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
    throw new Error("Errore nel recupero del cast.");
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
    throw new Error("Errore nel recupero dei video.");
  }

  return res.json();
}

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
    throw new Error("Serie TV non trovata.");
  }

  return res.json();
}

export async function getSeriesCredits(id: string) {
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

export async function getSeriesVideos(id: string) {
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

export function getPosterUrl(path: string | null) {
  if (!path) {
    return "/viewvault-logo.svg";
  }

  return `${IMAGE_BASE}${path}`;
}