"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "../lib/supabase/client";

type MediaType = "movie" | "tv";

type MovieCardProps = {
  id?: number;
  title: string;
  year: string;
  rating: string;
  image: string;
  tag?: string;
  genre?: string;
  duration?: string;
  mediaType?: MediaType;
};

type VaultStatus = "watched" | "watchlist" | null;

export default function MovieCard({
  id,
  title,
  year,
  rating,
  image,
  tag,
  genre,
  duration,
  mediaType = "movie",
}: MovieCardProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [status, setStatus] = useState<VaultStatus>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  const isSeries = mediaType === "tv";

  const mediaLabel = isSeries ? "Serie TV" : "Film";
  const defaultGenre = isSeries ? "Serie TV" : "Cinema";
  const defaultDuration = isSeries ? "Episodi nella scheda" : "120 min";

  const href = id
    ? isSeries
      ? `/serie/${id}`
      : `/film/${id}`
    : "#";

  useEffect(() => {
    async function checkVaultStatus() {
      if (!id) {
        setIsChecking(false);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setStatus(null);
        setIsChecking(false);
        return;
      }

      const { data, error } = await supabase
        .from("vault_items")
        .select("status")
        .eq("user_id", user.id)
        .eq("tmdb_id", id)
        .eq("media_type", mediaType)
        .maybeSingle();

      if (error) {
        console.error("Errore nel controllo del Vault:", error);
        setIsChecking(false);
        return;
      }

      if (data?.status === "watched" || data?.status === "watchlist") {
        setStatus(data.status);
      } else {
        setStatus(null);
      }

      setIsChecking(false);
    }

    checkVaultStatus();
  }, [id, mediaType, supabase]);

  async function saveStatus(newStatus: Exclude<VaultStatus, null>) {
    if (!id || isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setHasError(false);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage(
        `Effettua il login per salvare ${
          isSeries ? "la serie TV" : "il film"
        }.`
      );
      setHasError(true);
      setIsSaving(false);
      return;
    }

    if (status === newStatus) {
      const { error } = await supabase
        .from("vault_items")
        .delete()
        .eq("user_id", user.id)
        .eq("tmdb_id", id)
        .eq("media_type", mediaType);

      if (error) {
        console.error("Errore durante la rimozione dal Vault:", error);
        setMessage(
          `Non è stato possibile rimuovere ${
            isSeries ? "la serie TV" : "il film"
          } dal Vault.`
        );
        setHasError(true);
        setIsSaving(false);
        return;
      }

      setStatus(null);
      setMessage(
        `${isSeries ? "Serie TV rimossa" : "Film rimosso"} dal Vault.`
      );
      setIsSaving(false);
      router.refresh();
      return;
    }

    let saveError = null;

    if (status) {
      const { error } = await supabase
        .from("vault_items")
        .update({
          status: newStatus,
        })
        .eq("user_id", user.id)
        .eq("tmdb_id", id)
        .eq("media_type", mediaType);

      saveError = error;
    } else {
      const { error } = await supabase.from("vault_items").insert({
        user_id: user.id,
        tmdb_id: id,
        media_type: mediaType,
        status: newStatus,
      });

      saveError = error;
    }

    if (saveError) {
      console.error("Errore durante il salvataggio:", saveError);
      setMessage("Non è stato possibile aggiornare il Vault.");
      setHasError(true);
      setIsSaving(false);
      return;
    }

    setStatus(newStatus);

    if (newStatus === "watched") {
      setMessage(
        isSeries
          ? "Serie TV segnata come vista."
          : "Film segnato come visto."
      );
    } else {
      setMessage(
        isSeries
          ? "Serie TV aggiunta alla lista Da vedere."
          : "Film aggiunto alla lista Da vedere."
      );
    }

    setIsSaving(false);
    router.refresh();
  }

  return (
    <article className="group overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 transition hover:-translate-y-2 hover:border-[#7C3AED] hover:shadow-[0_0_30px_rgba(124,58,237,0.25)]">
      <Link href={href} className="block">
        <div className="relative h-72 w-full overflow-hidden bg-zinc-800">
          <span className="absolute left-3 top-3 z-10 rounded-full bg-[#7C3AED] px-3 py-1 text-xs font-bold text-white">
            {tag ?? mediaLabel}
          </span>

          <span className="absolute right-3 top-3 z-10 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-[#F4C542]">
            {rating}
          </span>

          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

          <div className="absolute bottom-4 left-4 right-4 rounded-full bg-white/10 py-2 text-center text-sm font-semibold text-white backdrop-blur-md transition group-hover:bg-[#7C3AED]">
            Apri scheda
          </div>
        </div>

        <div className="px-4 pt-4">
          <h3 className="line-clamp-1 text-lg font-bold">
            {title}
          </h3>

          <p className="mt-1 text-sm text-zinc-400">
            {year} • {genre ?? defaultGenre} •{" "}
            {duration ?? defaultDuration}
          </p>
        </div>
      </Link>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => saveStatus("watched")}
            disabled={!id || isChecking || isSaving}
            className={`rounded-full px-3 py-3 text-sm font-bold transition ${
              status === "watched"
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-zinc-800 text-zinc-300 hover:bg-green-600 hover:text-white"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {isChecking
              ? "Controllo..."
              : isSaving
                ? "Salvataggio..."
                : status === "watched"
                  ? "✓ Visto"
                  : "Visto"}
          </button>

          <button
            type="button"
            onClick={() => saveStatus("watchlist")}
            disabled={!id || isChecking || isSaving}
            className={`rounded-full px-3 py-3 text-sm font-bold transition ${
              status === "watchlist"
                ? "bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
                : "bg-zinc-800 text-zinc-300 hover:bg-[#7C3AED] hover:text-white"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {isChecking
              ? "Controllo..."
              : isSaving
                ? "Salvataggio..."
                : status === "watchlist"
                  ? "✓ Da vedere"
                  : "Da vedere"}
          </button>
        </div>

        {message && (
          <p
            className={`mt-3 text-center text-xs ${
              hasError ? "text-red-400" : "text-green-400"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </article>
  );
}