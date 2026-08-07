"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "../lib/supabase/client";

export type MovieVaultStatus =
  | "watched"
  | "watchlist"
  | null;

type MovieVaultActionsProps = {
  movieId: number;
  initialStatus: MovieVaultStatus;
  initialFavorite?: boolean;
};

export default function MovieVaultActions({
  movieId,
  initialStatus,
  initialFavorite = false,
}: MovieVaultActionsProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [status, setStatus] =
    useState<MovieVaultStatus>(initialStatus);

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
        "Effettua il login per gestire questo film."
      );
      setHasError(true);
      return null;
    }

    return user;
  }

  async function saveStatus(
    newStatus: "watched" | "watchlist"
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

      setMessage(
        "Non è stato possibile aggiornare il Vault."
      );
      setHasError(true);
      setIsSaving(false);
      return;
    }

    setStatus(newStatus);

    setMessage(
      newStatus === "watched"
        ? "Film segnato come visto."
        : "Film aggiunto alla lista Da vedere."
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
        ? "Film aggiunto ai Preferiti."
        : "Film rimosso dai Preferiti."
    );

    setIsSaving(false);
    router.refresh();
  }

  async function removeFromVault() {
    if (isSaving) {
      return;
    }

    const confirmed = window.confirm(
      "Vuoi rimuovere questo film dal Vault?"
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

      setMessage(
        "Non è stato possibile rimuovere il film."
      );
      setHasError(true);
      setIsSaving(false);
      return;
    }

    setStatus(null);
    setIsFavorite(false);
    setMessage("Film rimosso dal Vault.");
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
              ? "Salvataggio..."
              : "+ Aggiungi al Vault"}
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
                ? "Salvataggio..."
                : "✓ Segna come visto"}
            </button>

            <span className="flex items-center justify-center rounded-full border border-violet-500/40 bg-violet-500/15 px-6 py-4 font-semibold text-violet-300">
              👀 Nel Vault · Da vedere
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
              Rimuovi
            </button>
          </>
        )}

        {status === "watched" && (
          <>
            <span className="flex items-center justify-center rounded-full bg-green-600 px-8 py-4 text-lg font-semibold text-white shadow-[0_0_30px_rgba(22,163,74,0.35)]">
              ✓ Visto
            </span>

            <button
              type="button"
              onClick={() => saveStatus("watchlist")}
              disabled={isSaving}
              className="rounded-full border border-violet-500/50 bg-violet-500/10 px-6 py-4 font-semibold text-violet-300 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "Salvataggio..."
                : "Segna come da vedere"}
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
                ? "❤️ Nei Preferiti"
                : "♡ Aggiungi ai Preferiti"}
            </button>

            <button
              type="button"
              onClick={removeFromVault}
              disabled={isSaving}
              className="rounded-full border border-zinc-700 px-6 py-4 font-semibold text-zinc-300 transition hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Rimuovi
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