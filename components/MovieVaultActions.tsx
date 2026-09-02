"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { createClient } from "../lib/supabase/client";

export type MovieVaultStatus =
  | "watched"
  | "watchlist"
  | null;

type MovieVaultActionsProps = {
  movieId: number;
  initialStatus: MovieVaultStatus;
  initialFavorite?: boolean;
  initialWatchCount?: number;
};

type RecordMovieWatchResult = {
  watch_count: number;
};

type RemoveMovieWatchResult = {
  watch_count: number;
};

export default function MovieVaultActions({
  movieId,
  initialStatus,
  initialFavorite = false,
  initialWatchCount = 0,
}: MovieVaultActionsProps) {
  const router = useRouter();
  const t = useTranslations("MovieVaultActions");
  const supabase = useMemo(() => createClient(), []);

  const [status, setStatus] =
    useState<MovieVaultStatus>(initialStatus);

  const [isFavorite, setIsFavorite] =
    useState(initialFavorite);

  const [watchCount, setWatchCount] =
    useState(initialWatchCount);

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  async function getAuthenticatedUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      setMessage(t("loginRequired"));
      setHasError(true);
      return null;
    }

    return user;
  }

  async function recordWatch(
    successMessage: string
  ) {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setHasError(false);

    const user = await getAuthenticatedUser();

    if (!user) {
      setIsSaving(false);
      return;
    }

    const { data, error } = await supabase.rpc(
      "record_movie_watch",
      {
        p_movie_id: movieId,
      }
    );

    if (error) {
      console.error(
        "Errore durante la registrazione della visione:",
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
      );

      setMessage(t("recordWatchError"));
      setHasError(true);
      setIsSaving(false);
      return;
    }

    const result = (
      Array.isArray(data) ? data[0] : data
    ) as RecordMovieWatchResult | null;

    if (!result) {
      setMessage(t("watchCountDatabaseError"));
      setHasError(true);
      setIsSaving(false);
      return;
    }

    setStatus("watched");
    setWatchCount(result.watch_count);
    setMessage(successMessage);
    setHasError(false);
    setIsSaving(false);

    router.refresh();
  }

  async function saveStatus(
    newStatus: "watched" | "watchlist"
  ) {
    if (isSaving) {
      return;
    }

    /*
     * Quando il film viene segnato come visto,
     * registriamo una vera visione in watch_events.
     */
    if (newStatus === "watched") {
      await recordWatch(t("movieMarkedWatched"));
      return;
    }

    setIsSaving(true);
    setMessage("");
    setHasError(false);

    const user = await getAuthenticatedUser();

    if (!user) {
      setIsSaving(false);
      return;
    }

    const { error } = await supabase
      .from("vault_items")
      .upsert(
        {
          user_id: user.id,
          tmdb_id: movieId,
          media_type: "movie",
          status: newStatus,
        },
        {
          onConflict:
            "user_id,tmdb_id,media_type",
        }
      );

    if (error) {
      console.error(
        "Errore durante l'aggiornamento del Vault:",
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
      );

      setMessage(t("vaultUpdateError"));
      setHasError(true);
      setIsSaving(false);
      return;
    }

    setStatus(newStatus);
    setMessage(t("movieAddedWatchlist"));

    setIsSaving(false);
    router.refresh();
  }

  async function removeLastWatch() {
    if (isSaving || watchCount <= 1) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setHasError(false);

    const user = await getAuthenticatedUser();

    if (!user) {
      setIsSaving(false);
      return;
    }

    const { data, error } = await supabase.rpc(
      "remove_last_movie_watch",
      {
        p_movie_id: movieId,
      }
    );

    if (error) {
      console.error(
        "Errore durante la rimozione dell'ultima visione:",
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
      );

      setMessage(t("removeLastWatchError"));
      setHasError(true);
      setIsSaving(false);
      return;
    }

    const result = (
      Array.isArray(data) ? data[0] : data
    ) as RemoveMovieWatchResult | null;

    if (!result) {
      setMessage(t("newWatchCountDatabaseError"));
      setHasError(true);
      setIsSaving(false);
      return;
    }

    setWatchCount(result.watch_count);
    setMessage(t("lastWatchRemoved"));
    setHasError(false);
    setIsSaving(false);

    router.refresh();
  }

  async function toggleFavorite() {
    if (isSaving || status === null) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setHasError(false);

    const user = await getAuthenticatedUser();

    if (!user) {
      setIsSaving(false);
      return;
    }

    const newFavoriteValue = !isFavorite;

    const { error } = await supabase
      .from("vault_items")
      .update({
        is_favorite: newFavoriteValue,
      })
      .eq("user_id", user.id)
      .eq("tmdb_id", movieId)
      .eq("media_type", "movie");

    if (error) {
      console.error(
        "Errore durante l'aggiornamento dei Preferiti:",
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
      );

      setMessage(t("favoriteUpdateError"));
      setHasError(true);
      setIsSaving(false);
      return;
    }

    setIsFavorite(newFavoriteValue);

    setMessage(
      newFavoriteValue
        ? t("addedToFavorites")
        : t("removedFromFavorites")
    );

    setIsSaving(false);
    router.refresh();
  }

  async function removeFromVault() {
    if (isSaving) {
      return;
    }

    const confirmed = window.confirm(
      t("confirmRemove")
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setHasError(false);

    const user = await getAuthenticatedUser();

    if (!user) {
      setIsSaving(false);
      return;
    }

    const { error } = await supabase
      .from("vault_items")
      .delete()
      .eq("user_id", user.id)
      .eq("tmdb_id", movieId)
      .eq("media_type", "movie");

    if (error) {
      console.error(
        "Errore durante la rimozione dal Vault:",
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
      );

      setMessage(t("removeMovieError"));
      setHasError(true);
      setIsSaving(false);
      return;
    }

    /*
     * Le visioni storiche in watch_events non vengono
     * cancellate: rimuovere il film dal Vault non
     * cancella la cronologia dei rewatch.
     */
    setStatus(null);
    setIsFavorite(false);
    setMessage(t("movieRemoved"));
    setIsSaving(false);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {status === null && (
          <button
            type="button"
            onClick={() => saveStatus("watchlist")}
            disabled={isSaving}
            className="rounded-full bg-[#7C3AED] px-8 py-4 text-lg font-semibold text-white shadow-[0_0_30px_rgba(124,58,237,0.45)] transition hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? t("saving")
              : t("addToVault")}
          </button>
        )}

        {status === "watchlist" && (
          <>
            <button
              type="button"
              onClick={() => saveStatus("watched")}
              disabled={isSaving}
              className="rounded-full bg-green-600 px-8 py-4 text-lg font-semibold text-white shadow-[0_0_30px_rgba(22,163,74,0.35)] transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? t("saving")
                : t("markAsWatched")}
            </button>

            <span className="flex items-center justify-center rounded-full border border-violet-500/40 bg-violet-500/15 px-6 py-4 font-semibold text-violet-300">
              {t("inVaultWatchlist")}
            </span>

            <button
              type="button"
              onClick={toggleFavorite}
              disabled={isSaving}
              className={`rounded-full border px-6 py-4 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isFavorite
                  ? "border-red-500/50 bg-red-500/15 text-red-300 hover:bg-red-500/25"
                  : "border-zinc-700 text-zinc-300 hover:border-red-500 hover:text-red-300"
              }`}
            >
              {isFavorite
                ? t("inFavorites")
                : t("addToFavorites")}
            </button>

            <button
              type="button"
              onClick={removeFromVault}
              disabled={isSaving}
              className="rounded-full border border-zinc-700 px-6 py-4 font-semibold text-zinc-300 transition hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("remove")}
            </button>
          </>
        )}

        {status === "watched" && (
          <>
            <button
              type="button"
              onClick={() =>
                recordWatch(t("newWatchRecorded"))
              }
              disabled={isSaving}
              title={t("addNewWatch")}
              className="flex items-center justify-center rounded-full bg-green-600 px-8 py-4 text-lg font-semibold text-white shadow-[0_0_30px_rgba(22,163,74,0.35)] transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? t("saving")
                : t("watchedCount", {
                    count: Math.max(watchCount, 1),
                  })}
            </button>

            {watchCount > 1 && (
              <button
                type="button"
                onClick={removeLastWatch}
                disabled={isSaving}
                title={t("undoLastWatchTitle")}
                className="rounded-full border border-zinc-700 px-6 py-4 font-semibold text-zinc-300 transition hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("undoLastWatch")}
              </button>
            )}

            <button
              type="button"
              onClick={() => saveStatus("watchlist")}
              disabled={isSaving}
              className="rounded-full border border-violet-500/50 bg-violet-500/10 px-6 py-4 font-semibold text-violet-300 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? t("saving")
                : t("markAsWatchlist")}
            </button>

            <button
              type="button"
              onClick={toggleFavorite}
              disabled={isSaving}
              className={`rounded-full border px-6 py-4 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isFavorite
                  ? "border-red-500/50 bg-red-500/15 text-red-300 hover:bg-red-500/25"
                  : "border-zinc-700 text-zinc-300 hover:border-red-500 hover:text-red-300"
              }`}
            >
              {isFavorite
                ? t("inFavorites")
                : t("addToFavorites")}
            </button>

            <button
              type="button"
              onClick={removeFromVault}
              disabled={isSaving}
              className="rounded-full border border-zinc-700 px-6 py-4 font-semibold text-zinc-300 transition hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("remove")}
            </button>
          </>
        )}
      </div>

      {message && (
        <p
          className={`mt-4 text-sm ${
            hasError
              ? "text-red-400"
              : "text-green-400"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
