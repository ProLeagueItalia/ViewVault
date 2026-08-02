"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "../lib/supabase/client";

type Episode = {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  air_date: string | null;
  runtime: number | null;
  still_path: string | null;
};

export type SeasonWithEpisodes = {
  id: number;
  name: string;
  season_number: number;
  episodes: Episode[];
};

type WatchedEpisodeRow = {
  season_number: number;
  episode_number: number;
};

type SeasonEpisodesProps = {
  seriesId: number;
  seasons: SeasonWithEpisodes[];
};

function createEpisodeKey(
  seasonNumber: number,
  episodeNumber: number
) {
  return `${seasonNumber}-${episodeNumber}`;
}

export default function SeasonEpisodes({
  seriesId,
  seasons,
}: SeasonEpisodesProps) {
  const supabase = useMemo(() => createClient(), []);

  const [openSeason, setOpenSeason] = useState<number | null>(
    seasons[0]?.season_number ?? null
  );

  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(
    new Set()
  );

  const [isLoading, setIsLoading] = useState(true);
  const [savingEpisode, setSavingEpisode] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    async function loadWatchedEpisodes() {
      setIsLoading(true);
      setMessage("");
      setHasError(false);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("watched_episodes")
        .select("season_number, episode_number")
        .eq("user_id", user.id)
        .eq("series_id", seriesId);

      if (error) {
        console.error(
          "Errore nel recupero degli episodi visti:",
          error
        );

        setMessage(
          "Non è stato possibile recuperare gli episodi visti."
        );
        setHasError(true);
        setIsLoading(false);
        return;
      }

      const rows = (data as WatchedEpisodeRow[] | null) ?? [];

      const watchedKeys = new Set(
        rows.map((row) =>
          createEpisodeKey(
            row.season_number,
            row.episode_number
          )
        )
      );

      setWatchedEpisodes(watchedKeys);
      setIsLoading(false);
    }

    loadWatchedEpisodes();
  }, [seriesId, supabase]);

  async function toggleEpisode(
    seasonNumber: number,
    episodeNumber: number
  ) {
    const episodeKey = createEpisodeKey(
      seasonNumber,
      episodeNumber
    );

    if (savingEpisode) {
      return;
    }

    setSavingEpisode(episodeKey);
    setMessage("");
    setHasError(false);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage(
        "Effettua il login per salvare gli episodi visti."
      );
      setHasError(true);
      setSavingEpisode(null);
      return;
    }

    const isAlreadyWatched =
      watchedEpisodes.has(episodeKey);

    if (isAlreadyWatched) {
      const { error } = await supabase
        .from("watched_episodes")
        .delete()
        .eq("user_id", user.id)
        .eq("series_id", seriesId)
        .eq("season_number", seasonNumber)
        .eq("episode_number", episodeNumber);

      if (error) {
        console.error(
          "Errore nella rimozione dell'episodio:",
          error
        );

        setMessage(
          "Non è stato possibile togliere la spunta."
        );
        setHasError(true);
        setSavingEpisode(null);
        return;
      }

      setWatchedEpisodes((currentEpisodes) => {
        const updatedEpisodes = new Set(currentEpisodes);
        updatedEpisodes.delete(episodeKey);
        return updatedEpisodes;
      });

      setMessage("Episodio segnato come non visto.");
      setSavingEpisode(null);
      return;
    }

    const { error } = await supabase
      .from("watched_episodes")
      .insert({
        user_id: user.id,
        series_id: seriesId,
        season_number: seasonNumber,
        episode_number: episodeNumber,
      });

    if (error) {
      console.error(
        "Errore nel salvataggio dell'episodio:",
        error
      );

      setMessage(
        "Non è stato possibile salvare l'episodio."
      );
      setHasError(true);
      setSavingEpisode(null);
      return;
    }

    setWatchedEpisodes((currentEpisodes) => {
      const updatedEpisodes = new Set(currentEpisodes);
      updatedEpisodes.add(episodeKey);
      return updatedEpisodes;
    });

    setMessage("Episodio segnato come visto.");
    setSavingEpisode(null);
  }

  const totalEpisodes = seasons.reduce(
    (total, season) => total + season.episodes.length,
    0
  );

  const watchedCount = watchedEpisodes.size;

  const progress =
    totalEpisodes > 0
      ? Math.round((watchedCount / totalEpisodes) * 100)
      : 0;

  const seriesStatus =
    watchedCount === 0
      ? "Da vedere"
      : watchedCount >= totalEpisodes && totalEpisodes > 0
        ? "Vista"
        : "In corso";

  return (
    <section className="mt-16">
      <div className="rounded-3xl border border-zinc-800 bg-black/40 p-6 backdrop-blur-md md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7C3AED]">
              Il tuo progresso
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              📺 Stagioni ed episodi
            </h2>

            <p className="mt-3 text-zinc-400">
              {watchedCount} episodi visti su {totalEpisodes}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                seriesStatus === "Vista"
                  ? "bg-green-600 text-white"
                  : seriesStatus === "In corso"
                    ? "bg-blue-600 text-white"
                    : "bg-[#7C3AED] text-white"
              }`}
            >
              {seriesStatus === "Vista"
                ? "✓ Vista"
                : seriesStatus === "In corso"
                  ? "🕒 In corso"
                  : "Da vedere"}
            </span>

            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-bold text-zinc-200">
              {progress}%
            </span>
          </div>
        </div>

        <div className="mt-6 h-3 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-[#7C3AED] transition-all duration-500"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>

      {message && (
        <p
          className={`mt-4 text-center text-sm ${
            hasError ? "text-red-400" : "text-green-400"
          }`}
        >
          {message}
        </p>
      )}

      <div className="mt-8 space-y-5">
        {seasons.map((season) => {
          const isOpen =
            openSeason === season.season_number;

          const watchedSeasonEpisodes =
            season.episodes.filter((episode) =>
              watchedEpisodes.has(
                createEpisodeKey(
                  season.season_number,
                  episode.episode_number
                )
              )
            ).length;

          const seasonCompleted =
            season.episodes.length > 0 &&
            watchedSeasonEpisodes === season.episodes.length;

          return (
            <article
              key={season.id}
              className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80"
            >
              <button
                type="button"
                onClick={() =>
                  setOpenSeason(
                    isOpen ? null : season.season_number
                  )
                }
                className="flex w-full items-center justify-between gap-5 p-6 text-left transition hover:bg-zinc-800/70"
              >
                <div>
                  <h3 className="text-xl font-bold">
                    {season.name}
                  </h3>

                  <p className="mt-2 text-sm text-zinc-400">
                    {watchedSeasonEpisodes} di{" "}
                    {season.episodes.length} episodi visti
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {seasonCompleted && (
                    <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white">
                      ✓ Completata
                    </span>
                  )}

                  <span className="text-2xl text-zinc-300">
                    {isOpen ? "−" : "+"}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-zinc-800 p-5 md:p-6">
                  <div className="space-y-4">
                    {season.episodes.map((episode) => {
                      const episodeKey = createEpisodeKey(
                        season.season_number,
                        episode.episode_number
                      );

                      const isWatched =
                        watchedEpisodes.has(episodeKey);

                      const isSaving =
                        savingEpisode === episodeKey;

                      const stillUrl = episode.still_path
                        ? `https://image.tmdb.org/t/p/w500${episode.still_path}`
                        : "/viewvault-logo.svg";

                      return (
                        <div
                          key={episode.id}
                          className="grid gap-5 rounded-2xl border border-zinc-800 bg-[#151515] p-4 md:grid-cols-[190px_1fr_auto] md:items-center"
                        >
                          <img
                            src={stillUrl}
                            alt={episode.name}
                            className="aspect-video w-full rounded-xl object-cover"
                          />

                          <div>
                            <p className="text-sm font-semibold text-[#A78BFA]">
                              Episodio {episode.episode_number}
                            </p>

                            <h4 className="mt-1 text-lg font-bold">
                              {episode.name ||
                                `Episodio ${episode.episode_number}`}
                            </h4>

                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">
                              {episode.overview ||
                                "Descrizione non disponibile."}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
                              {episode.air_date && (
                                <span>
                                  {episode.air_date}
                                </span>
                              )}

                              {episode.runtime && (
                                <span>
                                  {episode.runtime} min
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              toggleEpisode(
                                season.season_number,
                                episode.episode_number
                              )
                            }
                            disabled={isLoading || Boolean(savingEpisode)}
                            className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                              isWatched
                                ? "bg-green-600 text-white hover:bg-green-700"
                                : "bg-zinc-800 text-zinc-300 hover:bg-[#7C3AED] hover:text-white"
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {isLoading
                              ? "Controllo..."
                              : isSaving
                                ? "Salvataggio..."
                                : isWatched
                                  ? "✓ Visto"
                                  : "Segna visto"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}