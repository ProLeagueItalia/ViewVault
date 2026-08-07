"use client";

import {
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from "react";

import { createClient } from "../lib/supabase/client";

type MediaType = "movie" | "tv";

type FavoriteButtonProps = {
  tmdbId: number;
  mediaType: MediaType;
  className?: string;
};

type VaultFavoriteRow = {
  id: string;
  is_favorite: boolean;
};

export default function FavoriteButton({
  tmdbId,
  mediaType,
  className = "",
}: FavoriteButtonProps) {
  const supabase = useMemo(() => createClient(), []);

  const [vaultId, setVaultId] = useState<string | null>(
    null
  );

  const [isFavorite, setIsFavorite] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    async function loadFavoriteStatus() {
      setIsChecking(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setVaultId(null);
        setIsFavorite(false);
        setIsChecking(false);
        return;
      }

      const { data, error } = await supabase
        .from("vault_items")
        .select("id, is_favorite")
        .eq("user_id", user.id)
        .eq("tmdb_id", tmdbId)
        .eq("media_type", mediaType)
        .maybeSingle();

      if (error) {
        console.error(
          "Errore nel recupero dello stato Preferito:",
          {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          }
        );

        setIsChecking(false);
        return;
      }

      const vaultRow =
        data as VaultFavoriteRow | null;

      setVaultId(vaultRow?.id ?? null);
      setIsFavorite(
        vaultRow?.is_favorite ?? false
      );

      setIsChecking(false);
    }

    loadFavoriteStatus();
  }, [mediaType, supabase, tmdbId]);

  function runHeartAnimation() {
    setIsAnimating(true);

    window.setTimeout(() => {
      setIsAnimating(false);
    }, 260);
  }

  async function toggleFavorite(
    event: MouseEvent<HTMLButtonElement>
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (isSaving || isChecking) {
      return;
    }

    setIsSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      window.alert(
        "Effettua il login per usare i Preferiti."
      );

      setIsSaving(false);
      return;
    }

    const newFavoriteValue = !isFavorite;

    if (vaultId) {
      const { error } = await supabase
        .from("vault_items")
        .update({
          is_favorite: newFavoriteValue,
        })
        .eq("id", vaultId)
        .eq("user_id", user.id);

      if (error) {
        console.error(
          "Errore durante l'aggiornamento del Preferito:",
          {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          }
        );

        window.alert(
          "Non è stato possibile aggiornare i Preferiti."
        );

        setIsSaving(false);
        return;
      }

      setIsFavorite(newFavoriteValue);
      runHeartAnimation();
      setIsSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("vault_items")
      .insert({
        user_id: user.id,
        tmdb_id: tmdbId,
        media_type: mediaType,
        status: "watchlist",
        is_favorite: true,
      })
      .select("id, is_favorite")
      .single();

    if (error) {
      console.error(
        "Errore durante l'aggiunta ai Preferiti:",
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
      );

      window.alert(
        "Non è stato possibile aggiungere il contenuto ai Preferiti."
      );

      setIsSaving(false);
      return;
    }

    const newVaultRow =
      data as VaultFavoriteRow;

    setVaultId(newVaultRow.id);
    setIsFavorite(true);
    runHeartAnimation();
    setIsSaving(false);
  }

  const buttonStateClass = isFavorite
    ? "border-red-400/70 bg-red-600 text-white shadow-[0_0_18px_rgba(220,38,38,0.45)]"
    : "border-white/35 bg-black/70 text-white hover:border-red-400 hover:bg-black/85 hover:text-red-400";

  const animationClass = isAnimating
    ? "scale-125 rotate-[-8deg]"
    : "scale-100 rotate-0";

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      disabled={isChecking || isSaving}
      title={
        isFavorite
          ? "Rimuovi dai Preferiti"
          : "Aggiungi ai Preferiti"
      }
      aria-label={
        isFavorite
          ? "Rimuovi dai Preferiti"
          : "Aggiungi ai Preferiti"
      }
      aria-pressed={isFavorite}
      className={`flex h-10 w-10 items-center justify-center rounded-full border text-2xl shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${buttonStateClass} ${className}`}
    >
      <span
        className={`inline-flex transition-transform duration-200 ${animationClass}`}
        aria-hidden="true"
      >
        {isChecking || isSaving
          ? "•"
          : isFavorite
            ? "♥"
            : "♡"}
      </span>
    </button>
  );
}