"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { createClient } from "../lib/supabase/client";

export type SeriesVaultStatus =
  | "watchlist"
  | "in_progress"
  | "watched"
  | null;

type SeriesVaultActionsProps = {
  seriesId: number;
  initialStatus: SeriesVaultStatus;
  initialFavorite?: boolean;
};

export default function SeriesVaultActions({
  seriesId,
  initialStatus,
  initialFavorite = false,
}: SeriesVaultActionsProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("SeriesVaultActions");

  const [status, setStatus] =
    useState<SeriesVaultStatus>(initialStatus);
  const [isFavorite, setIsFavorite] =
    useState(initialFavorite);
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

  async function addToWatchlist() {
    if (isSaving) return;

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
          tmdb_id: seriesId,
          media_type: "tv",
          status: "watchlist",
        },
        { onConflict: "user_id,tmdb_id,media_type" }
      );

    if (error) {
      console.error(
        "Errore durante l'aggiunta della serie al Vault:",
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
      );
      setMessage(t("addError"));
      setHasError(true);
      setIsSaving(false);
      return;
    }

    setStatus("watchlist");
    setMessage(t("addedToWatchlist"));
    setIsSaving(false);
    router.refresh();
  }

  async function toggleFavorite() {
    if (isSaving || status === null) return;

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
      .update({ is_favorite: newFavoriteValue })
      .eq("user_id", user.id)
      .eq("tmdb_id", seriesId)
      .eq("media_type", "tv");

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
      setMessage(t("favoriteError"));
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
    if (isSaving) return;

    const confirmed = window.confirm(t("removeConfirm"));
    if (!confirmed) return;

    setIsSaving(true);
    setMessage("");
    setHasError(false);

    const user = await getAuthenticatedUser();
    if (!user) {
      setIsSaving(false);
      return;
    }

    const { error: episodesError } = await supabase
      .from("watched_episodes")
      .delete()
      .eq("user_id", user.id)
      .eq("series_id", seriesId);

    if (episodesError) {
      console.error("Errore durante la rimozione degli episodi:", episodesError);
      setMessage(t("episodesDeleteError"));
      setHasError(true);
      setIsSaving(false);
      return;
    }

    const { error: progressError } = await supabase
      .from("series_progress")
      .delete()
      .eq("user_id", user.id)
      .eq("series_id", seriesId);

    if (progressError) {
      console.error("Errore durante la rimozione del progresso:", progressError);
      setMessage(t("progressDeleteError"));
      setHasError(true);
      setIsSaving(false);
      return;
    }

    const { error: vaultError } = await supabase
      .from("vault_items")
      .delete()
      .eq("user_id", user.id)
      .eq("tmdb_id", seriesId)
      .eq("media_type", "tv");

    if (vaultError) {
      console.error("Errore durante la rimozione della serie dal Vault:", vaultError);
      setMessage(t("removeError"));
      setHasError(true);
      setIsSaving(false);
      return;
    }

    setStatus(null);
    setIsFavorite(false);
    setMessage(t("removedFromVault"));
    setIsSaving(false);
    router.refresh();
  }

  const statusLabel =
    status === "watched"
      ? t("statusWatched")
      : status === "in_progress"
        ? t("statusInProgress")
        : status === "watchlist"
          ? t("statusWatchlist")
          : null;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {status === null && (
          <button
            type="button"
            onClick={addToWatchlist}
            disabled={isSaving}
            className="rounded-full bg-[#7C3AED] px-8 py-4 text-lg font-semibold text-white shadow-[0_0_30px_rgba(124,58,237,0.45)] transition hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? t("saving") : t("addToVault")}
          </button>
        )}

        {status !== null && (
          <>
            <span
              className={`flex items-center justify-center rounded-full px-6 py-4 font-semibold ${
                status === "watched"
                  ? "bg-green-600 text-white"
                  : status === "in_progress"
                    ? "bg-amber-500 text-black"
                    : "border border-violet-500/40 bg-violet-500/15 text-violet-300"
              }`}
            >
              {statusLabel}
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
              {isFavorite ? t("inFavorites") : t("addToFavorites")}
            </button>

            <button
              type="button"
              onClick={removeFromVault}
              disabled={isSaving}
              className="rounded-full border border-zinc-700 px-6 py-4 font-semibold text-zinc-300 transition hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? t("wait") : t("remove")}
            </button>
          </>
        )}
      </div>

      {message && (
        <p className={`mt-4 text-sm ${hasError ? "text-red-400" : "text-green-400"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
