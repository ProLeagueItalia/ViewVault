"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { createClient } from "../lib/supabase/client";

type MediaType = "movie" | "tv";
type VaultStatus = "watched" | "watchlist";

type ProgressStatus =
  | "watchlist"
  | "in_progress"
  | "watched"
  | null;

type VaultCardActionsProps = {
  vaultId: string;
  tmdbId: number;
  mediaType: MediaType;
  vaultStatus: VaultStatus;
  progressStatus: ProgressStatus;
  onStatusChange: (newStatus: VaultStatus) => void;
  onRemoved: () => void;
};

export default function VaultCardActions({
  vaultId,
  tmdbId,
  mediaType,
  vaultStatus,
  progressStatus,
  onStatusChange,
  onRemoved,
}: VaultCardActionsProps) {
  const supabase = useMemo(() => createClient(), []);

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  const isSeries = mediaType === "tv";

  const href = isSeries
    ? `/serie/${tmdbId}`
    : `/film/${tmdbId}`;

  async function getUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      setMessage(
        "Effettua il login per modificare il Vault."
      );
      setHasError(true);
      return null;
    }

    return user;
  }

  async function updateMovieStatus(
    newStatus: VaultStatus
  ) {
    if (isSaving || isSeries) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setHasError(false);

    const user = await getUser();

    if (!user) {
      setIsSaving(false);
      return;
    }

    const { error } = await supabase
      .from("vault_items")
      .update({
        status: newStatus,
      })
      .eq("id", vaultId)
      .eq("user_id", user.id)
      .eq("tmdb_id", tmdbId)
      .eq("media_type", "movie");

    if (error) {
      console.error(
        "Errore durante l'aggiornamento del film:",
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
      );

      setMessage(
        "Non è stato possibile aggiornare il film."
      );
      setHasError(true);
      setIsSaving(false);
      return;
    }

    onStatusChange(newStatus);

    setMessage(
      newStatus === "watched"
        ? "Film segnato come visto."
        : "Film segnato come da vedere."
    );

    setIsSaving(false);
  }

  async function removeFromVault() {
    if (isSaving) {
      return;
    }

    const confirmed = window.confirm(
      isSeries
        ? "Vuoi rimuovere questa serie dal Vault? Verranno eliminati anche il progresso e gli episodi salvati."
        : "Vuoi rimuovere questo film dal Vault?"
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setHasError(false);

    const user = await getUser();

    if (!user) {
      setIsSaving(false);
      return;
    }

    if (isSeries) {
      const { error: episodesError } = await supabase
        .from("watched_episodes")
        .delete()
        .eq("user_id", user.id)
        .eq("series_id", tmdbId);

      if (episodesError) {
        console.error(
          "Errore nell'eliminazione degli episodi:",
          episodesError
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
        .eq("series_id", tmdbId);

      if (progressError) {
        console.error(
          "Errore nell'eliminazione del progresso:",
          progressError
        );

        setMessage(
          "Non è stato possibile eliminare il progresso della serie."
        );
        setHasError(true);
        setIsSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from("vault_items")
      .delete()
      .eq("id", vaultId)
      .eq("user_id", user.id);

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

      setMessage(
        "Non è stato possibile rimuovere il contenuto."
      );
      setHasError(true);
      setIsSaving(false);
      return;
    }

    onRemoved();
    setIsSaving(false);
  }

  return (
    <div className="border-t border-zinc-800 p-4">
      {isSeries ? (
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={href}
            className={`rounded-full px-4 py-3 text-center text-sm font-bold transition ${
              progressStatus === "watched"
                ? "bg-green-600 text-white hover:bg-green-700"
                : progressStatus === "in_progress"
                  ? "bg-amber-500 text-black hover:bg-amber-400"
                  : "bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
            }`}
          >
            {progressStatus === "watched"
              ? "✓ Completata"
              : progressStatus === "in_progress"
                ? "▶ Continua"
                : "▶ Apri episodi"}
          </Link>

          <button
            type="button"
            onClick={removeFromVault}
            disabled={isSaving}
            className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-zinc-300 transition hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Attendi..." : "Rimuovi"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              updateMovieStatus(
                vaultStatus === "watched"
                  ? "watchlist"
                  : "watched"
              )
            }
            disabled={isSaving}
            className={`rounded-full px-4 py-3 text-sm font-bold transition ${
              vaultStatus === "watched"
                ? "border border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20"
                : "bg-green-600 text-white hover:bg-green-700"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {isSaving
              ? "Salvataggio..."
              : vaultStatus === "watched"
                ? "👀 Segna come da vedere"
                : "✓ Segna come visto"}
          </button>

          <button
            type="button"
            onClick={removeFromVault}
            disabled={isSaving}
            className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-zinc-300 transition hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Attendi..." : "Rimuovi"}
          </button>
        </div>
      )}

      {message && (
        <p
          className={`mt-3 text-center text-xs ${
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