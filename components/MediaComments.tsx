"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { createClient } from "../lib/supabase/client";
import GiphyPicker from "./GiphyPicker";

type MediaType = "movie" | "tv";

type MediaCommentsProps = {
  tmdbId: number;
  mediaType: MediaType;
};

type CommentRow = {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: MediaType;
  content: string | null;
  gif_url: string | null;
  image_url: string | null;
  is_spoiler: boolean;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export default function MediaComments({
  tmdbId,
  mediaType,
}: MediaCommentsProps) {
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("MediaComments");
  const locale = useLocale();

  const [comments, setComments] = useState<CommentRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    null
  );

  const [content, setContent] = useState("");
  const [gifUrl, setGifUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);

  const [showGifInput, setShowGifInput] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);

  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  const [editingCommentId, setEditingCommentId] = useState<
    string | null
  >(null);

  const [editingContent, setEditingContent] = useState("");
  const [editingGifUrl, setEditingGifUrl] = useState("");
  const [editingSpoiler, setEditingSpoiler] = useState(false);

  const [savingCommentId, setSavingCommentId] = useState<
    string | null
  >(null);

  const [revealedSpoilers, setRevealedSpoilers] = useState<
    Set<string>
  >(new Set());

  const loadComments = useCallback(async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("media_comments_with_profiles")
      .select(
        `
          id,
          user_id,
          tmdb_id,
          media_type,
          content,
          gif_url,
          image_url,
          is_spoiler,
          parent_comment_id,
          created_at,
          updated_at,
          username,
          display_name,
          avatar_url
        `
      )
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .is("parent_comment_id", null)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Errore nel recupero dei commenti:",
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
      );

      setMessage(
        t("loadCommentsError")
      );
      setHasError(true);
      setComments([]);
      setIsLoading(false);
      return;
    }

    setComments((data as CommentRow[] | null) ?? []);
    setIsLoading(false);
  }, [mediaType, supabase, t, tmdbId]);

  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      setCurrentUserId(user?.id ?? null);

      await loadComments();
    }

    initialize();

    return () => {
      isMounted = false;
    };
  }, [loadComments, supabase]);

  function resetComposer() {
    setContent("");
    setGifUrl("");
    setImageFile(null);
    setImagePreview("");
    setIsSpoiler(false);
    setShowGifInput(false);
    setShowImageInput(false);
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setMessage("");
    setHasError(false);

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setMessage(
        t("unsupportedImageFormat")
      );
      setHasError(true);
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setMessage(
        t("imageTooLarge")
      );
      setHasError(true);
      event.target.value = "";
      return;
    }

    setImageFile(file);

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  }

  function removeSelectedImage() {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(null);
    setImagePreview("");
  }

  async function uploadImage(
    userId: string
  ): Promise<string | null> {
    if (!imageFile) {
      return null;
    }

    const extension =
      imageFile.name.split(".").pop()?.toLowerCase() ||
      "jpg";

    const fileName = `${crypto.randomUUID()}.${extension}`;

    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("comment-images")
      .upload(filePath, imageFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: imageFile.type,
      });

    if (uploadError) {
      console.error(
        "Errore nel caricamento dell'immagine:",
        uploadError
      );

      throw new Error(
        t("uploadImageError")
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("comment-images")
      .getPublicUrl(filePath);

    return publicUrl;
  }

  async function publishComment() {
    if (isPublishing) {
      return;
    }

    setMessage("");
    setHasError(false);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage(
        t("loginRequired")
      );
      setHasError(true);
      return;
    }

    const cleanContent = content.trim();
    const cleanGifUrl = gifUrl.trim();

    if (!cleanContent && !cleanGifUrl && !imageFile) {
      setMessage(
        t("emptyCommentError")
      );
      setHasError(true);
      return;
    }

    setIsPublishing(true);

    let uploadedImageUrl: string | null = null;

    try {
      uploadedImageUrl = await uploadImage(user.id);

      const { error } = await supabase
        .from("media_comments")
        .insert({
          user_id: user.id,
          tmdb_id: tmdbId,
          media_type: mediaType,
          content: cleanContent || null,
          gif_url: cleanGifUrl || null,
          image_url: uploadedImageUrl,
          is_spoiler: isSpoiler,
          parent_comment_id: null,
        });

      if (error) {
        console.error(
          "Errore durante la pubblicazione del commento:",
          {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          }
        );

        throw new Error(
          t("publishCommentError")
        );
      }

      resetComposer();

      setMessage(t("commentPublished"));
      setHasError(false);

      await loadComments();
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : t("genericError")
      );

      setHasError(true);
    } finally {
      setIsPublishing(false);
    }
  }

  function startEditing(comment: CommentRow) {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content ?? "");
    setEditingGifUrl(comment.gif_url ?? "");
    setEditingSpoiler(comment.is_spoiler);

    setMessage("");
    setHasError(false);
  }

  function cancelEditing() {
    setEditingCommentId(null);
    setEditingContent("");
    setEditingGifUrl("");
    setEditingSpoiler(false);
  }

  async function saveEdit(commentId: string) {
    if (savingCommentId) {
      return;
    }

    const cleanContent = editingContent.trim();
    const cleanGifUrl = editingGifUrl.trim();

    const currentComment = comments.find(
      (comment) => comment.id === commentId
    );

    if (!currentComment) {
      return;
    }

    if (
      !cleanContent &&
      !cleanGifUrl &&
      !currentComment.image_url
    ) {
      setMessage(
        t("emptyEditError")
      );
      setHasError(true);
      return;
    }

    setSavingCommentId(commentId);
    setMessage("");
    setHasError(false);

    const { error } = await supabase
      .from("media_comments")
      .update({
        content: cleanContent || null,
        gif_url: cleanGifUrl || null,
        is_spoiler: editingSpoiler,
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId);

    if (error) {
      console.error(
        "Errore durante la modifica del commento:",
        error
      );

      setMessage(
        t("editCommentError")
      );
      setHasError(true);
      setSavingCommentId(null);
      return;
    }

    cancelEditing();

    setMessage(t("commentEdited"));

    await loadComments();

    setSavingCommentId(null);
  }

  async function deleteComment(comment: CommentRow) {
    if (savingCommentId) {
      return;
    }

    const confirmed = window.confirm(
      t("confirmDelete")
    );

    if (!confirmed) {
      return;
    }

    setSavingCommentId(comment.id);
    setMessage("");
    setHasError(false);

    const { error } = await supabase
      .from("media_comments")
      .delete()
      .eq("id", comment.id);

    if (error) {
      console.error(
        "Errore durante l'eliminazione del commento:",
        error
      );

      setMessage(
        t("deleteCommentError")
      );
      setHasError(true);
      setSavingCommentId(null);
      return;
    }

    if (comment.image_url) {
      const imagePath = getStoragePathFromPublicUrl(
        comment.image_url
      );

      if (imagePath) {
        const { error: storageError } =
          await supabase.storage
            .from("comment-images")
            .remove([imagePath]);

        if (storageError) {
          console.warn(
            "Commento eliminato, ma non è stato possibile rimuovere l'immagine:",
            storageError
          );
        }
      }
    }

    setMessage(t("commentDeleted"));

    await loadComments();

    setSavingCommentId(null);
  }

  function toggleSpoiler(commentId: string) {
    setRevealedSpoilers((current) => {
      const next = new Set(current);

      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }

      return next;
    });
  }

  return (
    <section className="mt-16">
      <div className="mb-7">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
          ViewVault Community
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          {t("discussion")}
        </h2>

        <p className="mt-3 max-w-3xl leading-7 text-zinc-400">
          {t("discussionDescription")}
        </p>
      </div>

      {currentUserId ? (
        <div className="rounded-3xl border border-zinc-800 bg-[#18181B] p-5 md:p-7">
          <textarea
            value={content}
            onChange={(event) =>
              setContent(event.target.value)
            }
            rows={4}
            maxLength={2000}
            placeholder={t("writeSomething")}
            className="w-full resize-none rounded-2xl border border-zinc-700 bg-[#101010] px-5 py-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C3AED]"
          />

          <div className="mt-2 text-right text-xs text-zinc-600">
            {content.length}/2000
          </div>

          {showGifInput && (
            <div className="mt-4">
              <GiphyPicker
                selectedGifUrl={gifUrl}
                onSelect={(selectedGifUrl) => {
                  setGifUrl(selectedGifUrl);
                  setMessage("");
                  setHasError(false);
                }}
                onClear={() => {
                  setGifUrl("");
                }}
              />
            </div>
          )}

          {showImageInput && (
            <div className="mt-4 rounded-2xl border border-dashed border-zinc-700 bg-black/20 p-5">
              <label className="block cursor-pointer text-center">
                <span className="font-semibold text-zinc-300">
                  {t("selectImage")}
                </span>

                <span className="mt-1 block text-xs text-zinc-500">
                  {t("imageRequirements")}
                </span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {imagePreview && (
            <div className="relative mt-4 w-fit">
              <img
                src={imagePreview}
                alt={t("imagePreviewAlt")}
                className="max-h-72 rounded-2xl border border-zinc-800 object-cover"
              />

              <button
                type="button"
                onClick={removeSelectedImage}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/80 font-bold text-white transition hover:bg-red-600"
                aria-label={t("removeImage")}
              >
                ×
              </button>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setShowGifInput((value) => !value)
                }
                className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-[#7C3AED] hover:text-white"
              >
                {gifUrl ? t("gifSelected") : t("gif")}
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowImageInput((value) => !value)
                }
                className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-[#7C3AED] hover:text-white"
              >
                {t("photo")}
              </button>

              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300">
                <input
                  type="checkbox"
                  checked={isSpoiler}
                  onChange={(event) =>
                    setIsSpoiler(event.target.checked)
                  }
                  className="accent-[#7C3AED]"
                />

                {t("spoiler")}
              </label>
            </div>

            <button
              type="button"
              onClick={publishComment}
              disabled={isPublishing}
              className="rounded-full bg-[#7C3AED] px-7 py-3 font-bold text-white transition hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPublishing
                ? t("publishing")
                : t("publish")}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-zinc-700 bg-[#18181B] px-6 py-10 text-center">
          <p className="text-3xl">🔐</p>

          <p className="mt-3 font-bold text-white">
            {t("loginToJoin")}
          </p>

          <p className="mt-2 text-sm text-zinc-400">
            {t("loginToPublish")}
          </p>
        </div>
      )}

      {message && (
        <p
          className={`mt-4 text-sm font-semibold ${
            hasError
              ? "text-red-400"
              : "text-green-400"
          }`}
        >
          {message}
        </p>
      )}

      <div className="mt-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="text-xl font-bold">
            {t("comments")}
          </h3>

          {!isLoading && (
            <span className="rounded-full bg-zinc-900 px-3 py-1 text-sm font-semibold text-zinc-400">
              {comments.length}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-zinc-800 bg-[#18181B] p-8 text-center text-zinc-400">
            {t("loadingComments")}
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-700 bg-[#18181B] px-6 py-12 text-center">
            <p className="text-4xl">🍿</p>

            <h3 className="mt-4 text-xl font-bold">
              {t("noComments")}
            </h3>

            <p className="mt-2 text-zinc-400">
              {t("startDiscussion")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => {
              const isOwner =
                currentUserId === comment.user_id;

              const isEditing =
                editingCommentId === comment.id;

              const spoilerVisible =
                !comment.is_spoiler ||
                revealedSpoilers.has(comment.id) ||
                isOwner;

              return (
                <article
                  key={comment.id}
                  className="rounded-3xl border border-zinc-800 bg-[#18181B] p-5 md:p-6"
                >
                  <div className="flex items-start gap-4">
                    <UserAvatar comment={comment} />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-bold text-white">
                            {getDisplayName(comment, t("viewVaultUser"))}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                            {comment.username && (
                              <span>
                                @{comment.username}
                              </span>
                            )}

                            <span>
                              {formatDate(
                                comment.created_at,
                                locale
                              )}
                            </span>

                            {comment.updated_at !==
                              comment.created_at && (
                              <span>{t("edited")}</span>
                            )}

                            {comment.is_spoiler && (
                              <span className="font-bold text-amber-400">
                                {t("spoiler")}
                              </span>
                            )}
                          </div>
                        </div>

                        {isOwner && !isEditing && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                startEditing(comment)
                              }
                              className="text-sm font-semibold text-zinc-400 transition hover:text-[#C4B5FD]"
                            >
                              {t("edit")}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteComment(comment)
                              }
                              disabled={
                                savingCommentId ===
                                comment.id
                              }
                              className="text-sm font-semibold text-zinc-400 transition hover:text-red-400 disabled:opacity-50"
                            >
                              {t("delete")}
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="mt-5 space-y-4">
                          <textarea
                            value={editingContent}
                            onChange={(event) =>
                              setEditingContent(
                                event.target.value
                              )
                            }
                            rows={4}
                            maxLength={2000}
                            className="w-full resize-none rounded-2xl border border-zinc-700 bg-[#101010] px-4 py-3 text-white outline-none focus:border-[#7C3AED]"
                          />

                          <input
                            type="url"
                            value={editingGifUrl}
                            onChange={(event) =>
                              setEditingGifUrl(
                                event.target.value
                              )
                            }
                            placeholder={t("gifUrl")}
                            className="w-full rounded-2xl border border-zinc-700 bg-[#101010] px-4 py-3 text-white outline-none focus:border-[#7C3AED]"
                          />

                          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-zinc-300">
                            <input
                              type="checkbox"
                              checked={editingSpoiler}
                              onChange={(event) =>
                                setEditingSpoiler(
                                  event.target.checked
                                )
                              }
                              className="accent-[#7C3AED]"
                            />

                            {t("containsSpoilers")}
                          </label>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                saveEdit(comment.id)
                              }
                              disabled={
                                savingCommentId ===
                                comment.id
                              }
                              className="rounded-full bg-[#7C3AED] px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
                            >
                              {savingCommentId ===
                              comment.id
                                ? t("saving")
                                : t("save")}
                            </button>

                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-bold text-zinc-300"
                            >
                              {t("cancel")}
                            </button>
                          </div>
                        </div>
                      ) : comment.is_spoiler &&
                        !spoilerVisible ? (
                        <button
                          type="button"
                          onClick={() =>
                            toggleSpoiler(comment.id)
                          }
                          className="mt-5 w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-8 text-center"
                        >
                          <span className="block font-bold text-amber-300">
                            {t("spoilerWarning")}
                          </span>

                          <span className="mt-2 block text-sm text-zinc-400">
                            {t("clickToReveal")}
                          </span>
                        </button>
                      ) : (
                        <CommentContent
                          comment={comment}
                        />
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function CommentContent({
  comment,
}: {
  comment: CommentRow;
}) {
  const t = useTranslations("MediaComments");

  return (
    <div className="mt-5">
      {comment.content && (
        <p className="whitespace-pre-wrap break-words leading-7 text-zinc-200">
          {comment.content}
        </p>
      )}

      {comment.gif_url && (
        <img
          src={comment.gif_url}
          alt={t("commentGifAlt")}
          className="mt-4 max-h-[420px] max-w-full rounded-2xl border border-zinc-800 object-contain"
        />
      )}

      {comment.image_url && (
        <img
          src={comment.image_url}
          alt={t("commentImageAlt")}
          className="mt-4 max-h-[520px] max-w-full rounded-2xl border border-zinc-800 object-contain"
        />
      )}
    </div>
  );
}

function UserAvatar({
  comment,
}: {
  comment: CommentRow;
}) {
  const t = useTranslations("MediaComments");
  const displayName = getDisplayName(comment, t("viewVaultUser"));

  if (comment.avatar_url) {
    return (
      <img
        src={comment.avatar_url}
        alt={displayName}
        className="h-11 w-11 shrink-0 rounded-full border border-zinc-700 object-cover"
      />
    );
  }

  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#7C3AED] text-lg font-black text-white">
      {initial || "V"}
    </div>
  );
}

function getDisplayName(
  comment: CommentRow,
  fallbackName: string
) {
  return (
    comment.display_name ||
    comment.username ||
    fallbackName
  );
}

function formatDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function getStoragePathFromPublicUrl(
  publicUrl: string
) {
  const marker =
    "/storage/v1/object/public/comment-images/";

  const markerIndex = publicUrl.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  return decodeURIComponent(
    publicUrl.slice(markerIndex + marker.length)
  );
}