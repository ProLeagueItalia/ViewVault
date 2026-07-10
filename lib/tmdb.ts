const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

export type TMDBMovie = {
  id: number;
  title: string;
  release_date: string;
  vote_average: number;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
};

export async function getNowPlayingMovies(): Promise<TMDBMovie[]> {
  const res = await fetch(
    `${BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=it-IT&page=1`,
    { next: { revalidate: 3600 } }
  );

  if (!res.ok) {
    throw new Error("Errore nel recupero dei film.");
  }

  const data = await res.json();
  return data.results;
}

export async function getMovie(id: string) {
  const res = await fetch(
    `${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=it-IT`,
    { next: { revalidate: 3600 } }
  );

  if (!res.ok) throw new Error("Film non trovato");

  return res.json();
}

export async function getMovieCredits(id: string) {
  const res = await fetch(
    `${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}&language=it-IT`,
    { next: { revalidate: 3600 } }
  );

  return res.json();
}

export async function getMovieVideos(id: string) {
  const res = await fetch(
    `${BASE_URL}/movie/${id}/videos?api_key=${API_KEY}&language=it-IT`,
    { next: { revalidate: 3600 } }
  );

  return res.json();
}

export function getPosterUrl(path: string | null) {
  if (!path) return "/viewvault-logo.svg";
  return `${IMAGE_BASE}${path}`;
}