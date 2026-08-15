"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
      setMessage(
        "Effettua il login per gestire questa serie."
      );
      setHasError(true);
      return null;
    }

    return user;
  }

  async function addToWatchlist() {
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

    const { error } = await supabase
      .from("vault_items")
      .upsert(
        {
          user_id: user.id,
          tmdb_id: seriesId,
          media_type: "tv",
          status: "watchlist",
        },
        {
          onConflict:
            "user_id,tmdb_id,media_type",
        }
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

      setMessage(
        "Non è stato possibile aggiungere la serie al Vault."
      );
      setHasError(true);
      setIsSaving(false);
      return;
    }

    setStatus("watchlist");
    setMessage(
      "Serie aggiunta alla lista Da vedere."
    );

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

      setMessage(
        "Non è stato possibile aggiornare i Preferiti."
      );
      setHasError(true);
      setIsSaving(false);
      return;
    }

    setIsFavorite(newFavoriteValue);

    setMessage(
      newFavoriteValue
        ? "Serie aggiunta ai Preferiti."
        : "Serie rimossa dai Preferiti."
    );

    setIsSaving(false);
    router.refresh();
  }

  async function removeFromVault() {
    if (isSaving) {
      return;
    }

    const confirmed = window.confirm(
      "Vuoi rimuovere questa serie dal Vault? Verranno eliminati anche il progresso e gli episodi salvati."
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

    const { error: episodesError } = await supabase
      .from("watched_episodes")
      .delete()
      .eq("user_id", user.id)
      .eq("series_id", seriesId);

    if (episodesError) {
      console.error(
        "Errore durante la rimozione degli episodi:",
        {
          message: episodesError.message,
          details: episodesError.details,
          hint: episodesError.hint,
          code: episodesError.code,
        }
      );

      setMessage(
        "Non è stato possibile eliminare gli episodi salvati."
      );
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
      console.error(
        "Errore durante la rimozione del progresso:",
        {
          message: progressError.message,
          details: progressError.details,
          hint: progressError.hint,
          code: progressError.code,
        }
      );

      setMessage(
        "Non è stato possibile eliminare il progresso della serie."
      );
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
      console.error(
        "Errore durante la rimozione della serie dal Vault:",
        {
          message: vaultError.message,
          details: vaultError.details,
          hint: vaultError.hint,
          code: vaultError.code,
        }
      );

      setMessage(
        "Non è stato possibile rimuovere la serie dal Vault."
      );
      setHasError(true);
      setIsSaving(false);
      return;
    }

    setStatus(null);
    setIsFavorite(false);

    setMessage("Serie rimossa dal Vault.");

    setIsSaving(false);
    router.refresh();
  }

  const statusLabel =
    status === "watched"
      ? "✓ Vista"
      : status === "in_progress"
        ? "🕒 In corso"
        : status === "watchlist"
          ? "👀 Da vedere"
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
            {isSaving
              ? "Salvataggio..."
              : "+ Aggiungi al Vault"}
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
              {isFavorite
                ? "❤️ Nei Preferiti"
                : "♡ Aggiungi ai Preferiti"}
            </button>

            <button
              type="button"
              onClick={removeFromVault}
              disabled={isSaving}
              className="rounded-full border border-zinc-700 px-6 py-4 font-semibold text-zinc-300 transition hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "Attendi..."
                : "Rimuovi"}
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