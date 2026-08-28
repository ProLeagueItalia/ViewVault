"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "../lib/supabase/client";
import FavoriteButton from "./FavoriteButton";

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

type SeriesProgressStatus =
  | "watchlist"
  | "in_progress"
  | "watched"
  | null;

type SeriesProgressRow = {
  status: "watchlist" | "in_progress" | "watched";
  total_episodes: number;
  watched_episodes: number;
};

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

  const [status, setStatus] =
    useState<VaultStatus>(null);

  const [
    seriesProgressStatus,
    setSeriesProgressStatus,
  ] = useState<SeriesProgressStatus>(null);

  const [seriesProgress, setSeriesProgress] =
    useState({
      watchedEpisodes: 0,
      totalEpisodes: 0,
    });

  const [isChecking, setIsChecking] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  const isSeries = mediaType === "tv";

  const mediaLabel = isSeries ? "Serie TV" : "Film";
  const defaultGenre = isSeries
    ? "Serie TV"
    : "Cinema";

  const defaultDuration = isSeries
    ? "Episodi nella scheda"
    : "120 min";

  const href = id
    ? isSeries
      ? `/serie/${id}`
      : `/film/${id}`
    : "#";

  useEffect(() => {
    async function checkMediaStatus() {
      if (!id) {
        setIsChecking(false);
        return;
      }

      setIsChecking(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setStatus(null);
        setSeriesProgressStatus(null);
        setIsChecking(false);
        return;
      }

      const {
        data: vaultData,
        error: vaultError,
      } = await supabase
        .from("vault_items")
        .select("status")
        .eq("user_id", user.id)
        .eq("tmdb_id", id)
        .eq("media_type", mediaType)
        .maybeSingle();

      if (vaultError) {
        console.error(
          "Errore nel controllo del Vault:",
          {
            message: vaultError.message,
            details: vaultError.details,
            hint: vaultError.hint,
            code: vaultError.code,
          }
        );
      }

      if (
        vaultData?.status === "watched" ||
        vaultData?.status === "watchlist"
      ) {
        setStatus(vaultData.status);
      } else {
        setStatus(null);
      }

      if (isSeries) {
        const {
          data: progressData,
          error: progressError,
        } = await supabase
          .from("series_progress")
          .select(
            "status, total_episodes, watched_episodes"
          )
          .eq("user_id", user.id)
          .eq("series_id", id)
          .maybeSingle();

        if (progressError) {
          console.error(
            "Errore nel recupero del progresso della serie:",
            {
              message: progressError.message,
              details: progressError.details,
              hint: progressError.hint,
              code: progressError.code,
            }
          );
        }

        const progress =
          progressData as SeriesProgressRow | null;

        if (progress) {
          setSeriesProgressStatus(progress.status);

          setSeriesProgress({
            watchedEpisodes:
              progress.watched_episodes,
            totalEpisodes:
              progress.total_episodes,
          });
        } else {
          setSeriesProgressStatus(null);

          setSeriesProgress({
            watchedEpisodes: 0,
            totalEpisodes: 0,
          });
        }
      }

      setIsChecking(false);
    }

    checkMediaStatus();
  }, [id, isSeries, mediaType, supabase]);

  async function saveMovieStatus(
    newStatus: Exclude<VaultStatus, null>
  ) {
    if (!id || isSaving || isSeries) {
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
        "Effettua il login per salvare il film."
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
          "Non è stato possibile rimuovere il film dal Vault."
        );
        setHasError(true);
        setIsSaving(false);
        return;
      }

      setStatus(null);
      setMessage("Film rimosso dal Vault.");
      setIsSaving(false);
      router.refresh();
      return;
    }

    let saveError = null;

if (newStatus === "watched") {
  const { error } = await supabase.rpc("record_movie_watch", {
    p_movie_id: id,
  });

  saveError = error;
} else {
  const { error } = await supabase
    .from("vault_items")
    .upsert(
      {
        user_id: user.id,
        tmdb_id: id,
        media_type: "movie",
        status: newStatus,
      },
      {
        onConflict: "user_id,tmdb_id,media_type",
      }
    );

  saveError = error;
}

    if (saveError) {
      console.error(
        "Errore durante il salvataggio:",
        {
          message: saveError.message,
          details: saveError.details,
          hint: saveError.hint,
          code: saveError.code,
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

  async function toggleSeriesWatchlist() {
    if (!id || isSaving || !isSeries) {
      return;
    }

    if (
      seriesProgressStatus === "in_progress" ||
      seriesProgressStatus === "watched"
    ) {
      router.push(href);
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
        "Effettua il login per salvare la serie TV."
      );
      setHasError(true);
      setIsSaving(false);
      return;
    }

    if (status === "watchlist") {
      const { error } = await supabase
        .from("vault_items")
        .delete()
        .eq("user_id", user.id)
        .eq("tmdb_id", id)
        .eq("media_type", "tv");

      if (error) {
        console.error(
          "Errore durante la rimozione della serie:",
          {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
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
      setSeriesProgressStatus(null);

      setMessage(
        "Serie TV rimossa dalla lista Da vedere."
      );

      setIsSaving(false);
      router.refresh();
      return;
    }

    const { error } = await supabase
      .from("vault_items")
      .upsert(
        {
          user_id: user.id,
          tmdb_id: id,
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
        "Errore durante il salvataggio della serie:",
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
      );

      setMessage(
        "Non è stato possibile aggiungere la serie alla lista Da vedere."
      );
      setHasError(true);
      setIsSaving(false);
      return;
    }

    setStatus("watchlist");
    setSeriesProgressStatus("watchlist");

    setMessage(
      "Serie TV aggiunta alla lista Da vedere."
    );

    setIsSaving(false);
    router.refresh();
  }

  const seriesPercentage =
    seriesProgress.totalEpisodes > 0
      ? Math.round(
          (seriesProgress.watchedEpisodes /
            seriesProgress.totalEpisodes) *
            100
        )
      : 0;

  function renderSeriesProgressBadge() {
    if (!isSeries || isChecking) {
      return null;
    }

    if (seriesProgressStatus === "watched") {
      return (
        <span className="absolute right-3 top-12 z-20 rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white shadow-lg">
          ✓ Vista
        </span>
      );
    }

    if (seriesProgressStatus === "in_progress") {
      return (
        <span className="absolute right-3 top-12 z-20 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-black shadow-lg">
          🕒 In corso · {seriesPercentage}%
        </span>
      );
    }

    if (
      seriesProgressStatus === "watchlist" ||
      status === "watchlist"
    ) {
      return (
        <span className="absolute right-3 top-12 z-20 rounded-full bg-[#7C3AED] px-3 py-1 text-xs font-bold text-white shadow-lg">
          Da vedere
        </span>
      );
    }

    return null;
  }

  return (
    <article className="group overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 transition hover:-translate-y-2 hover:border-[#7C3AED] hover:shadow-[0_0_30px_rgba(124,58,237,0.25)]">
      <div className="relative">
        <Link href={href} className="block">
          <div className="relative h-72 w-full overflow-hidden bg-zinc-800">
            <span className="absolute left-3 top-3 z-20 rounded-full bg-[#7C3AED] px-3 py-1 text-xs font-bold text-white">
              {tag ?? mediaLabel}
            </span>

            <span className="absolute right-3 top-3 z-20 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-[#F4C542]">
              {rating}
            </span>

            {renderSeriesProgressBadge()}

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
        </Link>

        {id && (
          <FavoriteButton
            tmdbId={id}
            mediaType={mediaType}
            className="absolute bottom-14 right-4 z-30"
          />
        )}
      </div>

      <Link href={href} className="block">
        <div className="px-4 pt-4">
          <h3 className="line-clamp-1 text-lg font-bold">
            {title}
          </h3>

          <p className="mt-1 text-sm text-zinc-400">
            {year} • {genre ?? defaultGenre} •{" "}
            {duration ?? defaultDuration}
          </p>

          {isSeries &&
            seriesProgressStatus ===
              "in_progress" && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>
                    {seriesProgress.watchedEpisodes} di{" "}
                    {seriesProgress.totalEpisodes} episodi
                  </span>

                  <span>{seriesPercentage}%</span>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-[#7C3AED] transition-all duration-500"
                    style={{
                      width: `${seriesPercentage}%`,
                    }}
                  />
                </div>
              </div>
            )}
        </div>
      </Link>

      <div className="p-4">
        {isSeries ? (
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={href}
              className={`rounded-full px-3 py-3 text-center text-sm font-bold transition ${
                seriesProgressStatus === "watched"
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : seriesProgressStatus === "in_progress"
                    ? "bg-amber-500 text-black hover:bg-amber-400"
                    : "bg-zinc-800 text-zinc-300 hover:bg-[#7C3AED] hover:text-white"
              }`}
            >
              {seriesProgressStatus === "watched"
                ? "✓ Vista"
                : seriesProgressStatus === "in_progress"
                  ? "Continua"
                  : "Apri episodi"}
            </Link>

            <button
              type="button"
              onClick={toggleSeriesWatchlist}
              disabled={
                !id ||
                isChecking ||
                isSaving ||
                seriesProgressStatus ===
                  "in_progress" ||
                seriesProgressStatus === "watched"
              }
              className={`rounded-full px-3 py-3 text-sm font-bold transition ${
                status === "watchlist" ||
                seriesProgressStatus === "watchlist"
                  ? "bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
                  : "bg-zinc-800 text-zinc-300 hover:bg-[#7C3AED] hover:text-white"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {isChecking
                ? "Controllo..."
                : isSaving
                  ? "Salvataggio..."
                  : status === "watchlist" ||
                      seriesProgressStatus ===
                        "watchlist"
                    ? "✓ Da vedere"
                    : "Da vedere"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                saveMovieStatus("watched")
              }
              disabled={
                !id || isChecking || isSaving
              }
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
              onClick={() =>
                saveMovieStatus("watchlist")
              }
              disabled={
                !id || isChecking || isSaving
              }
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
    </article>
  );
}