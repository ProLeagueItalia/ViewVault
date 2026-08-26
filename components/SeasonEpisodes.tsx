"use client";

import { useRouter } from "next/navigation";
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

type EpisodeWatchEventRow = {
  season_number: number;
  episode_number: number;
};

type ToggleEpisodeResult = {
  is_watched: boolean;
  watched_count: number;
  total_count: number;
  progress_status: "watchlist" | "in_progress" | "watched";
};

type RecordEpisodeWatchResult = {
  watch_count: number;
  watched_count: number;
  total_count: number;
  progress_status: "watchlist" | "in_progress" | "watched";
};

type RemoveEpisodeWatchResult = {
  watch_count: number;
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
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [openSeason, setOpenSeason] = useState<number | null>(
    seasons[0]?.season_number ?? null
  );

  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(
    new Set()
  );

  const [watchCounts, setWatchCounts] = useState<Map<string, number>>(
    new Map()
  );

  const [isLoading, setIsLoading] = useState(true);
  const [savingEpisode, setSavingEpisode] = useState<string | null>(
    null
  );
  const [savingBulk, setSavingBulk] = useState<string | null>(null);
  const [savingRewatchBulk, setSavingRewatchBulk] =
    useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  const totalEpisodes = useMemo(
    () =>
      seasons.reduce(
        (total, season) => total + season.episodes.length,
        0
      ),
    [seasons]
  );

  useEffect(() => {
    async function loadWatchedEpisodes() {
      setIsLoading(true);
      setMessage("");
      setHasError(false);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Errore nel recupero dell'utente:",
          userError
        );

        setMessage(
          "Non è stato possibile controllare il tuo account."
        );
        setHasError(true);
        setIsLoading(false);
        return;
      }

      if (!user) {
        setWatchedEpisodes(new Set());
        setIsLoading(false);
        return;
      }

      const [
        watchedResponse,
        watchEventsResponse,
      ] = await Promise.all([
        supabase
          .from("watched_episodes")
          .select("season_number, episode_number")
          .eq("user_id", user.id)
          .eq("series_id", seriesId),

        supabase
          .from("episode_watch_events")
          .select("season_number, episode_number")
          .eq("user_id", user.id)
          .eq("series_id", seriesId),
      ]);

      if (watchedResponse.error) {
        console.error(
          "Errore nel recupero degli episodi visti:",
          watchedResponse.error
        );

        setMessage(
          "Non è stato possibile recuperare gli episodi visti."
        );
        setHasError(true);
        setIsLoading(false);
        return;
      }

      if (watchEventsResponse.error) {
        console.error(
          "Errore nel recupero delle visioni degli episodi:",
          watchEventsResponse.error
        );

        setMessage(
          "Non è stato possibile recuperare il numero di visioni."
        );
        setHasError(true);
        setIsLoading(false);
        return;
      }

      const rows =
        (watchedResponse.data as WatchedEpisodeRow[] | null) ?? [];

      const eventRows =
        (watchEventsResponse.data as
          | EpisodeWatchEventRow[]
          | null) ?? [];

      const watchedKeys = new Set(
        rows.map((row) =>
          createEpisodeKey(
            row.season_number,
            row.episode_number
          )
        )
      );

      const loadedWatchCounts = new Map<string, number>();

      for (const event of eventRows) {
        const episodeKey = createEpisodeKey(
          event.season_number,
          event.episode_number
        );

        loadedWatchCounts.set(
          episodeKey,
          (loadedWatchCounts.get(episodeKey) ?? 0) + 1
        );
      }

      /*
       * Un episodio presente in watched_episodes deve risultare
       * visto almeno una volta, anche in caso di dati storici.
       */
      for (const episodeKey of watchedKeys) {
        if (!loadedWatchCounts.has(episodeKey)) {
          loadedWatchCounts.set(episodeKey, 1);
        }
      }

      setWatchedEpisodes(watchedKeys);
      setWatchCounts(loadedWatchCounts);
      setIsLoading(false);
    }

    loadWatchedEpisodes();
  }, [seriesId, supabase]);

  async function toggleEpisode(
    seasonNumber: number,
    episodeNumber: number
  ) {
    if (savingEpisode) {
      return;
    }

    const episodeKey = createEpisodeKey(
      seasonNumber,
      episodeNumber
    );

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

    const { data, error } = await supabase.rpc(
      "toggle_watched_episode",
      {
        p_series_id: seriesId,
        p_season_number: seasonNumber,
        p_episode_number: episodeNumber,
        p_total_episodes: totalEpisodes,
      }
    );

    if (error) {
      console.error(
        "Errore durante l'aggiornamento dell'episodio:",
        error
      );

      setMessage(
        "Non è stato possibile aggiornare l'episodio."
      );
      setHasError(true);
      setSavingEpisode(null);
      return;
    }

    const result = (
      Array.isArray(data) ? data[0] : data
    ) as ToggleEpisodeResult | null;

    if (!result) {
      setMessage(
        "Il database non ha restituito il risultato dell'operazione."
      );
      setHasError(true);
      setSavingEpisode(null);
      return;
    }

    setWatchedEpisodes((currentEpisodes) => {
      const updatedEpisodes = new Set(currentEpisodes);

      if (result.is_watched) {
        updatedEpisodes.add(episodeKey);
      } else {
        updatedEpisodes.delete(episodeKey);
      }

      return updatedEpisodes;
    });

    setWatchCounts((currentCounts) => {
      const updatedCounts = new Map(currentCounts);

      if (result.is_watched) {
        updatedCounts.set(episodeKey, 1);
      } else {
        updatedCounts.delete(episodeKey);
      }

      return updatedCounts;
    });

    setMessage(
      result.is_watched
        ? "Episodio segnato come visto."
        : "Episodio segnato come non visto."
    );

    setSavingEpisode(null);

    /*
     * Aggiorna eventuali componenti server che leggono
     * series_progress, come badge e statistiche.
     */
    router.refresh();
  }

  async function recordEpisodeWatch(
    seasonNumber: number,
    episodeNumber: number
  ) {
    if (savingEpisode || savingBulk) {
      return;
    }

    const episodeKey = createEpisodeKey(
      seasonNumber,
      episodeNumber
    );

    setSavingEpisode(episodeKey);
    setMessage("");
    setHasError(false);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage(
        "Effettua il login per salvare le visioni."
      );
      setHasError(true);
      setSavingEpisode(null);
      return;
    }

    const { data, error } = await supabase.rpc(
      "record_episode_watch",
      {
        p_series_id: seriesId,
        p_season_number: seasonNumber,
        p_episode_number: episodeNumber,
        p_total_episodes: totalEpisodes,
      }
    );

    if (error) {
      console.error(
        "Errore durante la registrazione della visione:",
        error
      );

      setMessage(
        "Non è stato possibile registrare la visione."
      );
      setHasError(true);
      setSavingEpisode(null);
      return;
    }

    const result = (
      Array.isArray(data) ? data[0] : data
    ) as RecordEpisodeWatchResult | null;

    if (!result) {
      setMessage(
        "Il database non ha restituito il conteggio delle visioni."
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

    setWatchCounts((currentCounts) => {
      const updatedCounts = new Map(currentCounts);
      updatedCounts.set(episodeKey, result.watch_count);
      return updatedCounts;
    });

    setMessage(
      result.watch_count === 1
        ? "Episodio segnato come visto."
        : `Visione registrata. Visto ×${result.watch_count}.`
    );

    setSavingEpisode(null);
    router.refresh();
  }

  async function removeLastEpisodeWatch(
    seasonNumber: number,
    episodeNumber: number
  ) {
    const episodeKey = createEpisodeKey(
      seasonNumber,
      episodeNumber
    );

    const currentWatchCount =
      watchCounts.get(episodeKey) ?? 0;

    if (
      savingEpisode ||
      savingBulk ||
      currentWatchCount <= 1
    ) {
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
        "Effettua il login per modificare le visioni."
      );
      setHasError(true);
      setSavingEpisode(null);
      return;
    }

    const { data, error } = await supabase.rpc(
      "remove_last_episode_watch",
      {
        p_series_id: seriesId,
        p_season_number: seasonNumber,
        p_episode_number: episodeNumber,
      }
    );

    if (error) {
      console.error(
        "Errore durante l'annullamento dell'ultima visione:",
        error
      );

      setMessage(
        "Non è stato possibile annullare l'ultima visione."
      );
      setHasError(true);
      setSavingEpisode(null);
      return;
    }

    const result = (
      Array.isArray(data) ? data[0] : data
    ) as RemoveEpisodeWatchResult | null;

    if (!result) {
      setMessage(
        "Il database non ha restituito il nuovo conteggio."
      );
      setHasError(true);
      setSavingEpisode(null);
      return;
    }

    setWatchCounts((currentCounts) => {
      const updatedCounts = new Map(currentCounts);
      updatedCounts.set(episodeKey, result.watch_count);
      return updatedCounts;
    });

    setMessage("Ultima visione annullata.");
    setSavingEpisode(null);
    router.refresh();
  }

  async function setEpisodesBulk(
    episodes: Array<{
      season_number: number;
      episode_number: number;
    }>,
    watched: boolean,
    operationKey: string,
    successMessage: string
  ) {
    if (savingEpisode || savingBulk || episodes.length === 0) {
      return;
    }

    setSavingBulk(operationKey);
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
      setSavingBulk(null);
      return;
    }

    const { data, error } = await supabase.rpc(
      "set_watched_episodes_bulk",
      {
        p_series_id: seriesId,
        p_total_episodes: totalEpisodes,
        p_episodes: episodes,
        p_watched: watched,
      }
    );

    if (error) {
      console.error(
        "Errore durante l'aggiornamento multiplo degli episodi:",
        error
      );
      setMessage(
        "Non è stato possibile aggiornare gli episodi."
      );
      setHasError(true);
      setSavingBulk(null);
      return;
    }

    const result = (
      Array.isArray(data) ? data[0] : data
    ) as
      | {
          watched_count: number;
          total_count: number;
          progress_status:
            | "watchlist"
            | "in_progress"
            | "watched";
        }
      | null;

    if (!result) {
      setMessage(
        "Il database non ha restituito il risultato dell'operazione."
      );
      setHasError(true);
      setSavingBulk(null);
      return;
    }

    setWatchedEpisodes((currentEpisodes) => {
      const updatedEpisodes = new Set(currentEpisodes);

      for (const episode of episodes) {
        const episodeKey = createEpisodeKey(
          episode.season_number,
          episode.episode_number
        );

        if (watched) {
          updatedEpisodes.add(episodeKey);
        } else {
          updatedEpisodes.delete(episodeKey);
        }
      }

      return updatedEpisodes;
    });

    setWatchCounts((currentCounts) => {
      const updatedCounts = new Map(currentCounts);

      for (const episode of episodes) {
        const episodeKey = createEpisodeKey(
          episode.season_number,
          episode.episode_number
        );

        if (watched) {
          updatedCounts.set(
            episodeKey,
            Math.max(updatedCounts.get(episodeKey) ?? 0, 1)
          );
        } else {
          updatedCounts.delete(episodeKey);
        }
      }

      return updatedCounts;
    });

    setMessage(successMessage);
    setSavingBulk(null);
    router.refresh();
  }

  function getSeasonEpisodePayload(
    season: SeasonWithEpisodes
  ) {
    return season.episodes.map((episode) => ({
      season_number: season.season_number,
      episode_number: episode.episode_number,
    }));
  }

  const allEpisodePayload = useMemo(
    () =>
      seasons.flatMap((season) =>
        getSeasonEpisodePayload(season)
      ),
    [seasons]
  );

  function getEpisodeWatchCount(
    seasonNumber: number,
    episodeNumber: number
  ) {
    const episodeKey = createEpisodeKey(
      seasonNumber,
      episodeNumber
    );

    return (
      watchCounts.get(episodeKey) ??
      (watchedEpisodes.has(episodeKey) ? 1 : 0)
    );
  }

  function canRemoveBulkRewatch(
    episodes: Array<{
      season_number: number;
      episode_number: number;
    }>
  ) {
    return (
      episodes.length > 0 &&
      episodes.every(
        (episode) =>
          getEpisodeWatchCount(
            episode.season_number,
            episode.episode_number
          ) > 1
      )
    );
  }

  async function recordEpisodeWatchesBulk(
    episodes: Array<{
      season_number: number;
      episode_number: number;
    }>,
    operationKey: string,
    successMessage: string
  ) {
    if (
      savingEpisode ||
      savingBulk ||
      savingRewatchBulk ||
      episodes.length === 0
    ) {
      return;
    }

    setSavingRewatchBulk(operationKey);
    setMessage("");
    setHasError(false);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage(
        "Effettua il login per registrare il rewatch."
      );
      setHasError(true);
      setSavingRewatchBulk(null);
      return;
    }

    const { error } = await supabase.rpc(
      "record_episode_watches_bulk",
      {
        p_series_id: seriesId,
        p_total_episodes: totalEpisodes,
        p_episodes: episodes,
      }
    );

    if (error) {
      console.error(
        "Errore durante il rewatch multiplo:",
        error
      );

      setMessage(
        "Non è stato possibile registrare il rewatch."
      );
      setHasError(true);
      setSavingRewatchBulk(null);
      return;
    }

    setWatchedEpisodes((currentEpisodes) => {
      const updatedEpisodes = new Set(currentEpisodes);

      for (const episode of episodes) {
        updatedEpisodes.add(
          createEpisodeKey(
            episode.season_number,
            episode.episode_number
          )
        );
      }

      return updatedEpisodes;
    });

    setWatchCounts((currentCounts) => {
      const updatedCounts = new Map(currentCounts);

      for (const episode of episodes) {
        const episodeKey = createEpisodeKey(
          episode.season_number,
          episode.episode_number
        );

        updatedCounts.set(
          episodeKey,
          (updatedCounts.get(episodeKey) ?? 0) + 1
        );
      }

      return updatedCounts;
    });

    setMessage(successMessage);
    setHasError(false);
    setSavingRewatchBulk(null);
    router.refresh();
  }

  async function removeEpisodeWatchesBulk(
    episodes: Array<{
      season_number: number;
      episode_number: number;
    }>,
    operationKey: string,
    successMessage: string
  ) {
    if (
      savingEpisode ||
      savingBulk ||
      savingRewatchBulk ||
      episodes.length === 0 ||
      !canRemoveBulkRewatch(episodes)
    ) {
      return;
    }

    setSavingRewatchBulk(operationKey);
    setMessage("");
    setHasError(false);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage(
        "Effettua il login per modificare il rewatch."
      );
      setHasError(true);
      setSavingRewatchBulk(null);
      return;
    }

    const { error } = await supabase.rpc(
      "remove_last_episode_watches_bulk",
      {
        p_series_id: seriesId,
        p_episodes: episodes,
      }
    );

    if (error) {
      console.error(
        "Errore durante l'annullamento del rewatch multiplo:",
        error
      );

      setMessage(
        "Non è stato possibile annullare il rewatch."
      );
      setHasError(true);
      setSavingRewatchBulk(null);
      return;
    }

    setWatchCounts((currentCounts) => {
      const updatedCounts = new Map(currentCounts);

      for (const episode of episodes) {
        const episodeKey = createEpisodeKey(
          episode.season_number,
          episode.episode_number
        );

        updatedCounts.set(
          episodeKey,
          Math.max(
            (updatedCounts.get(episodeKey) ?? 1) - 1,
            1
          )
        );
      }

      return updatedCounts;
    });

    setMessage(successMessage);
    setHasError(false);
    setSavingRewatchBulk(null);
    router.refresh();
  }

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
                    ? "bg-amber-500 text-black"
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

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              setEpisodesBulk(
                allEpisodePayload,
                watchedCount < totalEpisodes,
                "series",
                watchedCount < totalEpisodes
                  ? "Tutta la serie è stata segnata come vista."
                  : "Tutta la serie è stata segnata come non vista."
              )
            }
            disabled={
              isLoading ||
              Boolean(savingEpisode) ||
              Boolean(savingBulk) ||
              Boolean(savingRewatchBulk) ||
              totalEpisodes === 0
            }
            className={`rounded-full px-5 py-3 text-sm font-bold transition ${
              watchedCount >= totalEpisodes && totalEpisodes > 0
                ? "border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-red-500 hover:text-red-300"
                : "bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {savingBulk === "series"
              ? "Salvataggio..."
              : watchedCount >= totalEpisodes && totalEpisodes > 0
                ? "↩ Segna tutta la serie come non vista"
                : "✓ Segna tutta la serie come vista"}
          </button>

          {watchedCount >= totalEpisodes &&
            totalEpisodes > 0 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    recordEpisodeWatchesBulk(
                      allEpisodePayload,
                      "rewatch-series",
                      "Rewatch dell'intera serie registrato."
                    )
                  }
                  disabled={
                    isLoading ||
                    Boolean(savingEpisode) ||
                    Boolean(savingBulk) ||
                    Boolean(savingRewatchBulk)
                  }
                  className="rounded-full border border-cyan-500/50 bg-cyan-500/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingRewatchBulk === "rewatch-series"
                    ? "Salvataggio..."
                    : "🔁 Rivedi tutta la serie"}
                </button>

                {canRemoveBulkRewatch(
                  allEpisodePayload
                ) && (
                  <button
                    type="button"
                    onClick={() =>
                      removeEpisodeWatchesBulk(
                        allEpisodePayload,
                        "undo-rewatch-series",
                        "Ultimo rewatch dell'intera serie annullato."
                      )
                    }
                    disabled={
                      isLoading ||
                      Boolean(savingEpisode) ||
                      Boolean(savingBulk) ||
                      Boolean(savingRewatchBulk)
                    }
                    className="rounded-full border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-bold text-zinc-300 transition hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingRewatchBulk === "undo-rewatch-series"
                      ? "Salvataggio..."
                      : "↩ Annulla rewatch serie"}
                  </button>
                )}
              </>
            )}
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

          const seasonProgress =
            season.episodes.length > 0
              ? Math.round(
                  (watchedSeasonEpisodes /
                    season.episodes.length) *
                    100
                )
              : 0;

          const seasonCompleted =
            season.episodes.length > 0 &&
            watchedSeasonEpisodes ===
              season.episodes.length;

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
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold">
                      {season.name}
                    </h3>

                    {seasonCompleted && (
                      <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white">
                        ✓ Completata
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-zinc-400">
                    {watchedSeasonEpisodes} di{" "}
                    {season.episodes.length} episodi visti
                  </p>

                  <div className="mt-3 h-2 max-w-xl overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        seasonCompleted
                          ? "bg-green-600"
                          : "bg-[#7C3AED]"
                      }`}
                      style={{
                        width: `${seasonProgress}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-bold text-zinc-400">
                    {seasonProgress}%
                  </span>

                  <span className="text-2xl text-zinc-300">
                    {isOpen ? "−" : "+"}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-zinc-800 p-5 md:p-6">
                  <div className="mb-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setEpisodesBulk(
                          getSeasonEpisodePayload(season),
                          !seasonCompleted,
                          `season-${season.season_number}`,
                          seasonCompleted
                            ? `${season.name} è stata segnata come non vista.`
                            : `${season.name} è stata segnata come vista.`
                        )
                      }
                      disabled={
                        isLoading ||
                        Boolean(savingEpisode) ||
                        Boolean(savingBulk) ||
                        Boolean(savingRewatchBulk) ||
                        season.episodes.length === 0
                      }
                      className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                        seasonCompleted
                          ? "border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-red-500 hover:text-red-300"
                          : "bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {savingBulk ===
                      `season-${season.season_number}`
                        ? "Salvataggio..."
                        : seasonCompleted
                          ? "↩ Segna stagione come non vista"
                          : "✓ Segna stagione come vista"}
                    </button>

                    {seasonCompleted && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            recordEpisodeWatchesBulk(
                              getSeasonEpisodePayload(season),
                              `rewatch-season-${season.season_number}`,
                              `Rewatch di ${season.name} registrato.`
                            )
                          }
                          disabled={
                            isLoading ||
                            Boolean(savingEpisode) ||
                            Boolean(savingBulk) ||
                            Boolean(savingRewatchBulk)
                          }
                          className="rounded-full border border-cyan-500/50 bg-cyan-500/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingRewatchBulk ===
                          `rewatch-season-${season.season_number}`
                            ? "Salvataggio..."
                            : "🔁 Rivedi stagione"}
                        </button>

                        {canRemoveBulkRewatch(
                          getSeasonEpisodePayload(season)
                        ) && (
                          <button
                            type="button"
                            onClick={() =>
                              removeEpisodeWatchesBulk(
                                getSeasonEpisodePayload(season),
                                `undo-rewatch-season-${season.season_number}`,
                                `Ultimo rewatch di ${season.name} annullato.`
                              )
                            }
                            disabled={
                              isLoading ||
                              Boolean(savingEpisode) ||
                              Boolean(savingBulk) ||
                              Boolean(savingRewatchBulk)
                            }
                            className="rounded-full border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-bold text-zinc-300 transition hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingRewatchBulk ===
                            `undo-rewatch-season-${season.season_number}`
                              ? "Salvataggio..."
                              : "↩ Annulla rewatch stagione"}
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="space-y-4">
                    {season.episodes.map((episode) => {
                      const episodeKey = createEpisodeKey(
                        season.season_number,
                        episode.episode_number
                      );

                      const isWatched =
                        watchedEpisodes.has(episodeKey);

                      const episodeWatchCount =
                        watchCounts.get(episodeKey) ??
                        (isWatched ? 1 : 0);

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

                          <div className="flex min-w-[170px] flex-col gap-2">
                            {isWatched ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    recordEpisodeWatch(
                                      season.season_number,
                                      episode.episode_number
                                    )
                                  }
                                  disabled={
                                    isLoading ||
                                    Boolean(savingEpisode) ||
                                    Boolean(savingBulk)
                                  }
                                  title="Aggiungi una nuova visione"
                                  className="rounded-full bg-green-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isLoading
                                    ? "Controllo..."
                                    : isSaving
                                      ? "Salvataggio..."
                                      : `✓ Visto ×${Math.max(
                                          episodeWatchCount,
                                          1
                                        )}`}
                                </button>

                                {episodeWatchCount > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeLastEpisodeWatch(
                                        season.season_number,
                                        episode.episode_number
                                      )
                                    }
                                    disabled={
                                      isLoading ||
                                      Boolean(savingEpisode) ||
                                      Boolean(savingBulk) ||
                                      Boolean(savingRewatchBulk)
                                    }
                                    title="Annulla l'ultima visione"
                                    className="rounded-full border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-bold text-zinc-300 transition hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    ↩ −1 visione
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleEpisode(
                                      season.season_number,
                                      episode.episode_number
                                    )
                                  }
                                  disabled={
                                    isLoading ||
                                    Boolean(savingEpisode) ||
                                    Boolean(savingBulk)
                                  }
                                  className="rounded-full border border-violet-500/40 bg-violet-500/10 px-5 py-3 text-sm font-bold text-violet-300 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Segna non visto
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  toggleEpisode(
                                    season.season_number,
                                    episode.episode_number
                                  )
                                }
                                disabled={
                                  isLoading ||
                                  Boolean(savingEpisode) ||
                                  Boolean(savingBulk) ||
                                  Boolean(savingRewatchBulk)
                                }
                                className="rounded-full bg-zinc-800 px-5 py-3 text-sm font-bold text-zinc-300 transition hover:bg-[#7C3AED] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isLoading
                                  ? "Controllo..."
                                  : isSaving
                                    ? "Salvataggio..."
                                    : "Segna visto"}
                              </button>
                            )}
                          </div>
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