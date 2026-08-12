"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "../lib/supabase/client";

type MovieReviewProps = {
  movieId: number;
  initialRating: number | null;
  initialReview: string;
};

export default function MovieReview({
  movieId,
  initialRating,
  initialReview,
}: MovieReviewProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [rating, setRating] = useState<number | null>(
    initialRating
  );

  const [review, setReview] = useState(
    initialReview
  );

  const [isSaving, setIsSaving] =
    useState(false);

  const [message, setMessage] = useState("");
  const [hasError, setHasError] =
    useState(false);

  async function getAuthenticatedUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      setMessage(
        "Effettua il login per lasciare una valutazione."
      );

      setHasError(true);

      return null;
    }

    return user;
  }

  async function saveReview() {
    if (isSaving) {
      return;
    }

    if (
      rating === null &&
      review.trim() === ""
    ) {
      setMessage(
        "Inserisci almeno un voto oppure una recensione."
      );

      setHasError(true);

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

    /*
     * Usiamo UPDATE e non UPSERT.
     *
     * Il box recensione viene mostrato soltanto
     * quando il film è già presente nel Vault
     * come "watched".
     *
     * In questo modo non rischiamo di creare
     * accidentalmente una nuova riga incompleta.
     */

    const { data, error } = await supabase
      .from("vault_items")
      .update({
        rating,
        review:
          review.trim() === ""
            ? null
            : review.trim(),
      })
      .eq("user_id", user.id)
      .eq("tmdb_id", movieId)
      .eq("media_type", "movie")
      .eq("status", "watched")
      .select("id")
      .maybeSingle();

    if (error) {
      console.error(
        "Errore durante il salvataggio della recensione:",
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
      );

      setMessage(
        "Non è stato possibile salvare la recensione."
      );

      setHasError(true);
      setIsSaving(false);

      return;
    }

    if (!data) {
      setMessage(
        "Il film deve essere segnato come visto prima di poterlo recensire."
      );

      setHasError(true);
      setIsSaving(false);

      return;
    }

    setReview(review.trim());

    setMessage(
      "Recensione salvata nel tuo Vault."
    );

    setIsSaving(false);

    router.refresh();
  }

  async function deleteReview() {
    if (isSaving) {
      return;
    }

    const confirmed = window.confirm(
      "Vuoi eliminare il tuo voto e la tua recensione?"
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
      .update({
        rating: null,
        review: null,
      })
      .eq("user_id", user.id)
      .eq("tmdb_id", movieId)
      .eq("media_type", "movie");

    if (error) {
      console.error(
        "Errore durante l'eliminazione della recensione:",
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
      );

      setMessage(
        "Non è stato possibile eliminare la recensione."
      );

      setHasError(true);
      setIsSaving(false);

      return;
    }

    setRating(null);
    setReview("");

    setMessage(
      "Voto e recensione eliminati."
    );

    setIsSaving(false);

    router.refresh();
  }

  const hasExistingReview =
    initialRating !== null ||
    initialReview.trim() !== "";

  return (
    <section className="mt-16">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 md:p-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8B5CF6]">
            Il tuo giudizio
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            ⭐ Valuta questo film
          </h2>

          <p className="mt-3 max-w-2xl text-zinc-400">
            Dai un voto al film e, se vuoi,
            lascia una recensione personale.
          </p>
        </div>

        <div className="mt-8">
          <p className="mb-4 font-semibold text-zinc-200">
            Il tuo voto
          </p>

          <div className="flex flex-wrap gap-2">
            {Array.from(
              { length: 10 },
              (_, index) => index + 1
            ).map((value) => {
              const selected =
                rating === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setRating(value)
                  }
                  disabled={isSaving}
                  className={`flex h-12 w-12 items-center justify-center rounded-full border text-lg font-bold transition ${
                    selected
                      ? "border-[#7C3AED] bg-[#7C3AED] text-white shadow-[0_0_20px_rgba(124,58,237,0.45)]"
                      : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-[#7C3AED] hover:text-white"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                  aria-label={`Voto ${value} su 10`}
                >
                  {value}
                </button>
              );
            })}
          </div>

          {rating !== null && (
            <div className="mt-4 flex items-center gap-3">
              <span className="rounded-full bg-yellow-500/10 px-4 py-2 font-bold text-yellow-300">
                ⭐ {rating}/10
              </span>

              <button
                type="button"
                onClick={() =>
                  setRating(null)
                }
                disabled={isSaving}
                className="text-sm font-semibold text-zinc-500 transition hover:text-zinc-300"
              >
                Rimuovi voto
              </button>
            </div>
          )}
        </div>

        <div className="mt-8">
          <label
            htmlFor="movie-review"
            className="font-semibold text-zinc-200"
          >
            La tua recensione
          </label>

          <textarea
            id="movie-review"
            value={review}
            onChange={(event) =>
              setReview(event.target.value)
            }
            disabled={isSaving}
            rows={6}
            maxLength={3000}
            placeholder="Scrivi cosa ne pensi di questo film..."
            className="mt-4 w-full resize-y rounded-2xl border border-zinc-700 bg-zinc-950 px-5 py-4 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <div className="mt-2 text-right text-sm text-zinc-500">
            {review.length}/3000
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={saveReview}
            disabled={isSaving}
            className="rounded-full bg-[#7C3AED] px-7 py-3 font-semibold text-white shadow-[0_0_25px_rgba(124,58,237,0.35)] transition hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? "Salvataggio..."
              : hasExistingReview
                ? "Salva modifiche"
                : "Salva recensione"}
          </button>

          {(hasExistingReview ||
            rating !== null ||
            review.trim() !== "") && (
            <button
              type="button"
              onClick={deleteReview}
              disabled={isSaving}
              className="rounded-full border border-zinc-700 px-7 py-3 font-semibold text-zinc-300 transition hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Elimina recensione
            </button>
          )}
        </div>

        {message && (
          <p
            className={`mt-5 text-sm font-medium ${
              hasError
                ? "text-red-400"
                : "text-green-400"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </section>
  );
}