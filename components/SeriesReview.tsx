"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { createClient } from "../lib/supabase/client";

type SeriesReviewProps = {
  seriesId: number;
  initialRating: number | null;
  initialReview: string;
};

export default function SeriesReview({
  seriesId,
  initialRating,
  initialReview,
}: SeriesReviewProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("SeriesReview");

  const [rating, setRating] = useState<number | null>(initialRating);
  const [review, setReview] = useState(initialReview);
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

  async function saveReview() {
    if (isSaving) return;

    if (rating === null && review.trim() === "") {
      setMessage(t("ratingOrReviewRequired"));
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

    const { data, error } = await supabase
      .from("vault_items")
      .update({
        rating,
        review: review.trim() === "" ? null : review.trim(),
      })
      .eq("user_id", user.id)
      .eq("tmdb_id", seriesId)
      .eq("media_type", "tv")
      .select("id")
      .maybeSingle();

    if (error) {
      console.error(
        "Errore durante il salvataggio della recensione della serie:",
        error
      );
      setMessage(t("saveError"));
      setHasError(true);
      setIsSaving(false);
      return;
    }

    if (!data) {
      setMessage(t("watchEpisodeFirst"));
      setHasError(true);
      setIsSaving(false);
      return;
    }

    setReview(review.trim());
    setMessage(t("saved"));
    setIsSaving(false);
    router.refresh();
  }

  async function deleteReview() {
    if (isSaving) return;

    const confirmed = window.confirm(t("deleteConfirm"));
    if (!confirmed) return;

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
      .update({ rating: null, review: null })
      .eq("user_id", user.id)
      .eq("tmdb_id", seriesId)
      .eq("media_type", "tv");

    if (error) {
      console.error(
        "Errore durante l'eliminazione della recensione della serie:",
        error
      );
      setMessage(t("deleteError"));
      setHasError(true);
      setIsSaving(false);
      return;
    }

    setRating(null);
    setReview("");
    setMessage(t("deleted"));
    setIsSaving(false);
    router.refresh();
  }

  const hasExistingReview =
    initialRating !== null || initialReview.trim() !== "";

  return (
    <section className="mt-16">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 md:p-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8B5CF6]">
            {t("eyebrow")}
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            ⭐ {t("title")}
          </h2>

          <p className="mt-3 max-w-2xl text-zinc-400">
            {t("description")}
          </p>
        </div>

        <div className="mt-8">
          <p className="mb-4 font-semibold text-zinc-200">
            {t("yourRating")}
          </p>

          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => {
              const selected = rating === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  disabled={isSaving}
                  className={`flex h-12 w-12 items-center justify-center rounded-full border text-lg font-bold transition ${
                    selected
                      ? "border-[#7C3AED] bg-[#7C3AED] text-white shadow-[0_0_20px_rgba(124,58,237,0.45)]"
                      : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-[#7C3AED] hover:text-white"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                  aria-label={t("ratingAria", { value })}
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
                onClick={() => setRating(null)}
                disabled={isSaving}
                className="text-sm font-semibold text-zinc-500 transition hover:text-zinc-300"
              >
                {t("removeRating")}
              </button>
            </div>
          )}
        </div>

        <div className="mt-8">
          <label htmlFor="series-review" className="font-semibold text-zinc-200">
            {t("yourReview")}
          </label>

          <textarea
            id="series-review"
            value={review}
            onChange={(event) => setReview(event.target.value)}
            disabled={isSaving}
            rows={6}
            maxLength={3000}
            placeholder={t("placeholder")}
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
              ? t("saving")
              : hasExistingReview
                ? t("saveChanges")
                : t("saveReview")}
          </button>

          {(hasExistingReview || rating !== null || review.trim() !== "") && (
            <button
              type="button"
              onClick={deleteReview}
              disabled={isSaving}
              className="rounded-full border border-zinc-700 px-7 py-3 font-semibold text-zinc-300 transition hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("deleteReview")}
            </button>
          )}
        </div>

        {message && (
          <p className={`mt-5 text-sm font-medium ${hasError ? "text-red-400" : "text-green-400"}`}>
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
