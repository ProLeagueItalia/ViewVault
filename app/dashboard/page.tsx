import Link from "next/link";
import { redirect } from "next/navigation";

import BackButton from "../../components/BackButton";
import { createClient } from "../../lib/supabase/server";

import {
  getMovie,
  getPosterUrl,
  getSeries,
} from "../../lib/tmdb";

type VaultItem = {
  id: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  status: "watched" | "watchlist" | string;
  rating: number | null;
  review: string | null;
  is_favorite: boolean;
  created_at: string | null;
};

type SeriesProgress = {
  series_id: number;
  total_episodes: number;
  watched_episodes: number;
  status: "watchlist" | "in_progress" | "watched";
  updated_at: string | null;
};

type MovieDetails = {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
};

type SeriesDetails = {
  id: number;
  name: string;
  first_air_date: string;
  poster_path: string | null;
};

type RecentContent = {
  vaultId: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  year: string;
  posterUrl: string;
  status: string;
  createdAt: string | null;
};

type ActiveSeries = {
  seriesId: number;
  title: string;
  year: string;
  posterUrl: string;
  watchedEpisodes: number;
  totalEpisodes: number;
  percentage: number;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // PROFILO VIEWVAULT
  // Questa è la fonte principale per nome e avatar.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Errore nel recupero del profilo Dashboard:", {
      message: profileError.message,
      details: profileError.details,
      hint: profileError.hint,
      code: profileError.code,
    });
  }

  const [
    vaultResponse,
    progressResponse,
    watchedEpisodesResponse,
  ] = await Promise.all([
    supabase
      .from("vault_items")
      .select(
        "id, tmdb_id, media_type, status, rating, review, is_favorite, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("series_progress")
      .select(
        "series_id, total_episodes, watched_episodes, status, updated_at"
      )
      .eq("user_id", user.id)
      .order("updated_at", {
        ascending: false,
      }),

    supabase
      .from("watched_episodes")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("user_id", user.id),
  ]);

  if (vaultResponse.error) {
    console.error("Errore nel recupero del Vault:", {
      message: vaultResponse.error.message,
      details: vaultResponse.error.details,
      hint: vaultResponse.error.hint,
      code: vaultResponse.error.code,
    });
  }

  if (progressResponse.error) {
    console.error(
      "Errore nel recupero dei progressi delle serie:",
      {
        message: progressResponse.error.message,
        details: progressResponse.error.details,
        hint: progressResponse.error.hint,
        code: progressResponse.error.code,
      }
    );
  }

  if (watchedEpisodesResponse.error) {
    console.error("Errore nel conteggio degli episodi:", {
      message: watchedEpisodesResponse.error.message,
      details: watchedEpisodesResponse.error.details,
      hint: watchedEpisodesResponse.error.hint,
      code: watchedEpisodesResponse.error.code,
    });
  }

  const vaultItems =
    (vaultResponse.data as VaultItem[] | null) ?? [];

  const seriesProgress =
    (progressResponse.data as SeriesProgress[] | null) ?? [];

  const filmsWatched = vaultItems.filter(
    (item) =>
      item.media_type === "movie" &&
      item.status === "watched"
  ).length;

  const completedSeries = seriesProgress.filter(
    (item) => item.status === "watched"
  ).length;

  const seriesInProgress = seriesProgress.filter(
    (item) => item.status === "in_progress"
  ).length;

  const watchedEpisodes =
    watchedEpisodesResponse.count ?? 0;

  const favoritesCount = vaultItems.filter(
    (item) => item.is_favorite
  ).length;

  const stats = [
    {
      label: "Film visti",
      value: String(filmsWatched),
      icon: "🎬",
      description: "Film completati",
    },
    {
      label: "Preferiti",
      value: String(favoritesCount),
      icon: "❤️",
      description: "Film e serie del cuore",
    },
    {
      label: "Serie completate",
      value: String(completedSeries),
      icon: "✅",
      description: "Tutti gli episodi visti",
    },
    {
      label: "Serie in corso",
      value: String(seriesInProgress),
      icon: "🕒",
      description: "Serie già iniziate",
    },
    {
      label: "Episodi visti",
      value: String(watchedEpisodes),
      icon: "📺",
      description: "Puntate completate",
    },
  ];

  const recentVaultItems = vaultItems.slice(0, 6);

  const recentResults = await Promise.allSettled(
    recentVaultItems.map(
      async (item): Promise<RecentContent> => {
        if (item.media_type === "movie") {
          const movie = (await getMovie(
            String(item.tmdb_id)
          )) as MovieDetails;

          return {
            vaultId: item.id,
            tmdbId: movie.id,
            mediaType: "movie",
            title: movie.title,
            year: movie.release_date
              ? movie.release_date.slice(0, 4)
              : "N/D",
            posterUrl: getPosterUrl(movie.poster_path),
            status: item.status,
            createdAt: item.created_at,
          };
        }

        const series = (await getSeries(
          String(item.tmdb_id)
        )) as SeriesDetails;

        return {
          vaultId: item.id,
          tmdbId: series.id,
          mediaType: "tv",
          title: series.name,
          year: series.first_air_date
            ? series.first_air_date.slice(0, 4)
            : "N/D",
          posterUrl: getPosterUrl(series.poster_path),
          status: item.status,
          createdAt: item.created_at,
        };
      }
    )
  );

  const recentContents = recentResults
    .filter(
      (
        result
      ): result is PromiseFulfilledResult<RecentContent> =>
        result.status === "fulfilled"
    )
    .map((result) => result.value);

  const inProgressRows = seriesProgress
    .filter((item) => item.status === "in_progress")
    .slice(0, 4);

  const activeSeriesResults =
    await Promise.allSettled(
      inProgressRows.map(
        async (
          progressItem
        ): Promise<ActiveSeries> => {
          const series = (await getSeries(
            String(progressItem.series_id)
          )) as SeriesDetails;

          const percentage =
            progressItem.total_episodes > 0
              ? Math.round(
                  (progressItem.watched_episodes /
                    progressItem.total_episodes) *
                    100
                )
              : 0;

          return {
            seriesId: series.id,
            title: series.name,
            year: series.first_air_date
              ? series.first_air_date.slice(0, 4)
              : "N/D",
            posterUrl: getPosterUrl(series.poster_path),
            watchedEpisodes:
              progressItem.watched_episodes,
            totalEpisodes:
              progressItem.total_episodes,
            percentage,
          };
        }
      )
    );

  const activeSeries = activeSeriesResults
    .filter(
      (
        result
      ): result is PromiseFulfilledResult<ActiveSeries> =>
        result.status === "fulfilled"
    )
    .map((result) => result.value);

  // IDENTITÀ UTENTE
  // Prima utilizziamo il profilo ViewVault.
  // I metadata Auth restano solo come fallback.
  const metadata = user.user_metadata ?? {};

  const displayName =
    profile?.display_name ||
    profile?.username ||
    metadata.full_name ||
    metadata.name ||
    metadata.user_name ||
    metadata.preferred_username ||
    user.email?.split("@")[0] ||
    "Utente";

  const avatarUrl =
    profile?.avatar_url ||
    metadata.avatar_url ||
    metadata.picture ||
    null;

  return (
    <main className="min-h-screen bg-[#0D0D0D] px-6 pb-16 pt-28 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <BackButton fallbackHref="/" />
        </div>

        <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-[#8B5CF6]">
              Dashboard personale
            </p>

            <h1 className="text-4xl font-bold md:text-5xl">
              Ciao,{" "}
              <span className="text-[#7C3AED]">
                {displayName}
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-lg text-zinc-400">
              Bentornato nel tuo Vault. Qui trovi i progressi
              reali dei tuoi film, delle serie TV e degli
              episodi completati.
            </p>
          </div>

          <article className="flex items-center gap-4 rounded-3xl border border-zinc-800 bg-[#151515] p-4 pr-6">
            {avatarUrl ? (
              <div
                className="h-16 w-16 shrink-0 rounded-full border-2 border-[#7C3AED] bg-cover bg-center"
                style={{
                  backgroundImage: `url("${avatarUrl}")`,
                }}
                aria-label={`Avatar di ${displayName}`}
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[#7C3AED] bg-[#7C3AED]/20 text-2xl font-bold text-[#A78BFA]">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate font-bold">
                {displayName}
              </p>

              <p className="max-w-64 truncate text-sm text-zinc-400">
                {user.email}
              </p>

              <span className="mt-2 inline-block rounded-full bg-[#7C3AED]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#A78BFA]">
                Account attivo
              </span>
            </div>
          </article>
        </section>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {stats.map((stat) => (
            <article
              key={stat.label}
              className="rounded-3xl border border-zinc-800 bg-[#151515] p-6 shadow-lg transition hover:-translate-y-1 hover:border-[#7C3AED]"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="text-3xl">
                  {stat.icon}
                </span>

                <span className="rounded-full bg-[#7C3AED]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#A78BFA]">
                  Personale
                </span>
              </div>

              <p className="text-4xl font-bold">
                {stat.value}
              </p>

              <p className="mt-2 font-semibold text-zinc-300">
                {stat.label}
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                {stat.description}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-3">
          <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-6 lg:col-span-2">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-[#8B5CF6]">
                  Attività
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  Ultimi contenuti aggiunti
                </h2>
              </div>

              <Link
                href="/vault"
                className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold transition hover:border-[#7C3AED]"
              >
                Vedi tutto
              </Link>
            </div>

            {recentContents.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {recentContents.map((content) => {
                  const href =
                    content.mediaType === "movie"
                      ? `/film/${content.tmdbId}`
                      : `/serie/${content.tmdbId}`;

                  const statusLabel =
                    content.status === "watched"
                      ? "✓ Visto"
                      : "Da vedere";

                  return (
                    <Link
                      key={`${content.mediaType}-${content.vaultId}`}
                      href={href}
                      className="flex gap-4 rounded-2xl border border-zinc-800 bg-black/20 p-4 transition hover:border-[#7C3AED] hover:bg-zinc-900"
                    >
                      <img
                        src={content.posterUrl}
                        alt={content.title}
                        className="h-28 w-20 shrink-0 rounded-xl object-cover"
                      />

                      <div className="min-w-0 py-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#A78BFA]">
                          {content.mediaType === "movie"
                            ? "Film"
                            : "Serie TV"}
                        </span>

                        <h3 className="mt-1 line-clamp-2 font-bold">
                          {content.title}
                        </h3>

                        <p className="mt-1 text-sm text-zinc-500">
                          {content.year}
                        </p>

                        <span
                          className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${
                            content.status === "watched"
                              ? "bg-green-600/20 text-green-400"
                              : "bg-[#7C3AED]/15 text-[#A78BFA]"
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-52 items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-black/20 px-6 text-center">
                <div>
                  <p className="text-lg font-semibold">
                    Il tuo Vault è ancora vuoto
                  </p>

                  <p className="mt-2 text-zinc-500">
                    Cerca un film o una serie TV e aggiungi
                    il primo contenuto.
                  </p>

                  <Link
                    href="/ricerca"
                    className="mt-5 inline-block rounded-full bg-[#7C3AED] px-6 py-3 text-sm font-bold transition hover:bg-[#6D28D9]"
                  >
                    Cerca contenuti
                  </Link>
                </div>
              </div>
            )}
          </article>

          <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#8B5CF6]">
              Accesso rapido
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              Le tue liste
            </h2>

            <div className="mt-6 space-y-3">
              <Link
                href="/vault"
                className="block w-full rounded-2xl bg-[#7C3AED] px-5 py-4 text-left font-bold transition hover:bg-[#6D28D9]"
              >
                🎞️ Il mio Vault
              </Link>

              <Link
                href="/vault"
                className="block w-full rounded-2xl bg-zinc-900 px-5 py-4 text-left font-bold transition hover:bg-zinc-800"
              >
                ❤️ Preferiti ({favoritesCount})
              </Link>

              <Link
                href="/vault"
                className="block w-full rounded-2xl bg-zinc-900 px-5 py-4 text-left font-bold transition hover:bg-zinc-800"
              >
                📌 Da vedere
              </Link>

              <Link
                href="/ricerca"
                className="block w-full rounded-2xl bg-zinc-900 px-5 py-4 text-left font-bold transition hover:bg-zinc-800"
              >
                🔎 Cerca contenuti
              </Link>
            </div>
          </article>
        </section>

        <section className="mt-10">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#8B5CF6]">
              Continua
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              Serie TV in corso
            </h2>
          </div>

          {activeSeries.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {activeSeries.map((series) => (
                <Link
                  key={series.seriesId}
                  href={`/serie/${series.seriesId}`}
                  className="overflow-hidden rounded-3xl border border-zinc-800 bg-[#151515] transition hover:-translate-y-1 hover:border-[#7C3AED]"
                >
                  <div className="relative h-72 overflow-hidden">
                    <img
                      src={series.posterUrl}
                      alt={series.title}
                      className="h-full w-full object-cover transition duration-500 hover:scale-105"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

                    <span className="absolute right-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-black">
                      🕒 {series.percentage}%
                    </span>
                  </div>

                  <div className="p-5">
                    <h3 className="line-clamp-1 text-lg font-bold">
                      {series.title}
                    </h3>

                    <p className="mt-1 text-sm text-zinc-500">
                      {series.year}
                    </p>

                    <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
                      <span>
                        {series.watchedEpisodes} di{" "}
                        {series.totalEpisodes} episodi
                      </span>

                      <span>{series.percentage}%</span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-[#7C3AED]"
                        style={{
                          width: `${series.percentage}%`,
                        }}
                      />
                    </div>

                    <div className="mt-4 rounded-full bg-[#7C3AED]/15 px-4 py-2 text-center text-sm font-bold text-[#A78BFA]">
                      Continua
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-700 bg-[#151515] p-10 text-center">
              <p className="text-3xl">📺</p>

              <h3 className="mt-4 text-xl font-bold">
                Nessuna serie in corso
              </h3>

              <p className="mt-2 text-zinc-500">
                Segna il primo episodio visto e la serie
                comparirà automaticamente qui.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}