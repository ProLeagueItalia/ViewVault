"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

import Navbar from "../../../components/Navbar";
import { createClient } from "../../../lib/supabase/client";

const AVATARS = [
  "/profiles/avatars/avatar-clapper.png",
  "/profiles/avatars/avatar-film.png",
  "/profiles/avatars/avatar-horror.png",
  "/profiles/avatars/avatar-popcorn.png",
  "/profiles/avatars/avatar-scifi.png",
  "/profiles/avatars/avatar-vhs.png",
];

const COVERS = [
  "/profiles/covers/cover-cinema.png",
  "/profiles/covers/cover-film.png",
  "/profiles/covers/cover-horror.png",
  "/profiles/covers/cover-neon.png",
  "/profiles/covers/cover-purple.png",
  "/profiles/covers/cover-scifi.png",
];

const GENRES = [
  "Azione",
  "Avventura",
  "Horror",
  "Thriller",
  "Commedia",
  "Drammatico",
  "Fantascienza",
  "Fantasy",
  "Crime",
  "Romance",
  "Animazione",
  "Documentario",
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type SavedProfile = {
  username: string;
  displayName: string;
  bio: string;
  favoriteGenres: string[];
  avatarUrl: string | null;
  coverUrl: string | null;
};

type FriendProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type MediaType = "avatar" | "cover";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);

  const [friends, setFriends] = useState<FriendProfile[]>([]);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  const [favoriteGenres, setFavoriteGenres] = useState<string[]>(
    []
  );

  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    null
  );

  const [coverUrl, setCoverUrl] = useState<string | null>(
    null
  );

  const [avatarFile, setAvatarFile] = useState<File | null>(
    null
  );

  const [coverFile, setCoverFile] = useState<File | null>(
    null
  );

  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<
    string | null
  >(null);

  const [coverPreviewUrl, setCoverPreviewUrl] = useState<
    string | null
  >(null);

  const [savedProfile, setSavedProfile] =
    useState<SavedProfile | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let friendsReloadTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadFriends(currentUserId: string) {
      const { data: friendshipRows, error: friendshipError } =
        await supabase
          .from("friendships")
          .select("requester_id, receiver_id")
          .eq("status", "accepted")
          .or(
            `requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`
          );

      if (!isMounted) {
        return;
      }

      if (friendshipError) {
        console.error(
          "Errore nel recupero degli amici:",
          friendshipError
        );

        setFriends([]);
        return;
      }

      const friendIds =
        friendshipRows?.map((friendship) =>
          friendship.requester_id === currentUserId
            ? friendship.receiver_id
            : friendship.requester_id
        ) ?? [];

      if (friendIds.length === 0) {
        setFriends([]);
        return;
      }

      const { data: friendProfiles, error: friendsError } =
        await supabase
          .from("profiles")
          .select(
            "id, username, display_name, avatar_url, bio"
          )
          .in("id", friendIds)
          .order("display_name", {
            ascending: true,
          });

      if (!isMounted) {
        return;
      }

      if (friendsError) {
        console.error(
          "Errore nel recupero dei profili amici:",
          friendsError
        );

        setFriends([]);
        return;
      }

      setFriends(
        (friendProfiles as FriendProfile[] | null) ?? []
      );
    }

    async function loadProfile() {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        if (isMounted) {
          router.push("/");
        }
        return;
      }

      if (!isMounted) {
        return;
      }

      setUser(currentUser);

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "username, display_name, bio, favorite_genres, avatar_url, cover_url"
          )
          .eq("id", currentUser.id)
          .single();

      if (!isMounted) {
        return;
      }

      if (profileError) {
        console.error(
          "Errore nel recupero del profilo:",
          profileError
        );

        setMessage(
          "Non è stato possibile caricare il profilo."
        );

        setHasError(true);
        setIsLoading(false);
        return;
      }

      const loadedProfile: SavedProfile = {
        username: profile?.username ?? "",
        displayName: profile?.display_name ?? "",
        bio: profile?.bio ?? "",
        favoriteGenres:
          profile?.favorite_genres ?? [],
        avatarUrl: profile?.avatar_url ?? null,
        coverUrl: profile?.cover_url ?? null,
      };

      setUsername(loadedProfile.username);
      setDisplayName(loadedProfile.displayName);
      setBio(loadedProfile.bio);

      setFavoriteGenres(
        loadedProfile.favoriteGenres
      );

      setAvatarUrl(loadedProfile.avatarUrl);
      setCoverUrl(loadedProfile.coverUrl);

      setSavedProfile(loadedProfile);

      await loadFriends(currentUser.id);

      if (isMounted) {
        setIsLoading(false);
      }
    }

    async function refreshFriends() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser || !isMounted) {
        return;
      }

      await loadFriends(currentUser.id);
    }

    function scheduleFriendsReload() {
      if (friendsReloadTimer) {
        clearTimeout(friendsReloadTimer);
      }

      friendsReloadTimer = setTimeout(() => {
        console.log("👥 Aggiorno amici nel profilo personale...");
        refreshFriends();
      }, 200);
    }

    loadProfile();

    const channel = supabase
      .channel("profile-friends-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
        },
        (payload) => {
          console.log(
            "👥 ProfilePage friendship realtime:",
            payload.eventType,
            payload
          );

          scheduleFriendsReload();
        }
      )
      .subscribe((subscriptionStatus) => {
        console.log(
          "👥 Realtime ProfilePage:",
          subscriptionStatus
        );
      });

    const handleFriendshipUpdated = () => {
      scheduleFriendsReload();
    };

    window.addEventListener(
      "friendship-updated",
      handleFriendshipUpdated
    );

    return () => {
      isMounted = false;

      if (friendsReloadTimer) {
        clearTimeout(friendsReloadTimer);
      }

      window.removeEventListener(
        "friendship-updated",
        handleFriendshipUpdated
      );

      supabase.removeChannel(channel);
    };
  }, [router, supabase]);

  useEffect(() => {
    return () => {
      if (
        avatarPreviewUrl &&
        avatarPreviewUrl.startsWith("blob:")
      ) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }

      if (
        coverPreviewUrl &&
        coverPreviewUrl.startsWith("blob:")
      ) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [avatarPreviewUrl, coverPreviewUrl]);

  function clearMessage() {
    setMessage("");
    setHasError(false);
  }

  function toggleGenre(genre: string) {
    setFavoriteGenres((currentGenres) =>
      currentGenres.includes(genre)
        ? currentGenres.filter(
            (currentGenre) =>
              currentGenre !== genre
          )
        : [...currentGenres, genre]
    );

    clearMessage();
  }

  function clearAvatarPreview() {
    if (
      avatarPreviewUrl &&
      avatarPreviewUrl.startsWith("blob:")
    ) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    setAvatarPreviewUrl(null);
  }

  function clearCoverPreview() {
    if (
      coverPreviewUrl &&
      coverPreviewUrl.startsWith("blob:")
    ) {
      URL.revokeObjectURL(coverPreviewUrl);
    }

    setCoverPreviewUrl(null);
  }

  function selectPresetAvatar(avatar: string) {
    clearAvatarPreview();

    setAvatarFile(null);
    setAvatarUrl(avatar);

    clearMessage();
  }

  function selectPresetCover(cover: string) {
    clearCoverPreview();

    setCoverFile(null);
    setCoverUrl(cover);

    clearMessage();
  }

  function useInitialAvatar() {
    clearAvatarPreview();

    setAvatarFile(null);
    setAvatarUrl(null);

    clearMessage();
  }

  function useDefaultCover() {
    clearCoverPreview();

    setCoverFile(null);
    setCoverUrl(null);

    clearMessage();
  }

  function validateImage(file: File) {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage(
        "Formato non supportato. Usa JPG, PNG oppure WebP."
      );

      setHasError(true);

      return false;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setMessage(
        "L'immagine non può superare 5 MB."
      );

      setHasError(true);

      return false;
    }

    return true;
  }

  function handleAvatarFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    clearMessage();

    if (!validateImage(file)) {
      event.target.value = "";
      return;
    }

    clearAvatarPreview();

    const previewUrl =
      URL.createObjectURL(file);

    setAvatarFile(file);
    setAvatarPreviewUrl(previewUrl);
  }

  function handleCoverFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    clearMessage();

    if (!validateImage(file)) {
      event.target.value = "";
      return;
    }

    clearCoverPreview();

    const previewUrl =
      URL.createObjectURL(file);

    setCoverFile(file);
    setCoverPreviewUrl(previewUrl);
  }

  function cancelEditing() {
    if (!savedProfile) {
      return;
    }

    clearAvatarPreview();
    clearCoverPreview();

    setAvatarFile(null);
    setCoverFile(null);

    setUsername(savedProfile.username);
    setDisplayName(savedProfile.displayName);
    setBio(savedProfile.bio);

    setFavoriteGenres(
      savedProfile.favoriteGenres
    );

    setAvatarUrl(savedProfile.avatarUrl);
    setCoverUrl(savedProfile.coverUrl);

    clearMessage();

    setIsEditing(false);
  }

  async function uploadProfileMedia(
    file: File,
    type: MediaType
  ) {
    if (!user) {
      throw new Error(
        "Utente non autenticato."
      );
    }

    const path = `${user.id}/${type}`;

    const { error: uploadError } =
      await supabase.storage
        .from("profile-media")
        .upload(path, file, {
          upsert: true,
          cacheControl: "3600",
          contentType: file.type,
        });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("profile-media")
      .getPublicUrl(path);

    /*
     * Query string per evitare che il browser
     * mostri una vecchia immagine dalla cache
     * dopo la sostituzione.
     */
    return `${
      data.publicUrl
    }?v=${Date.now()}`;
  }

  async function saveProfile() {
    if (!user) {
      return;
    }

    const cleanUsername =
      username.trim().toLowerCase();

    const cleanDisplayName =
      displayName.trim();

    const cleanBio =
      bio.trim();

    if (cleanUsername.length < 3) {
      setMessage(
        "Lo username deve contenere almeno 3 caratteri."
      );

      setHasError(true);

      return;
    }

    if (
      !/^[a-z0-9._]+$/.test(cleanUsername)
    ) {
      setMessage(
        "Lo username può contenere solo lettere, numeri, punti e underscore."
      );

      setHasError(true);

      return;
    }

    if (cleanUsername.length > 30) {
      setMessage(
        "Lo username non può superare i 30 caratteri."
      );

      setHasError(true);

      return;
    }

    if (cleanDisplayName.length > 50) {
      setMessage(
        "Il nome visualizzato non può superare i 50 caratteri."
      );

      setHasError(true);

      return;
    }

    if (cleanBio.length > 300) {
      setMessage(
        "La bio non può superare i 300 caratteri."
      );

      setHasError(true);

      return;
    }

    setIsSaving(true);

    clearMessage();

    try {
      let finalAvatarUrl = avatarUrl;
      let finalCoverUrl = coverUrl;

      if (avatarFile) {
        finalAvatarUrl =
          await uploadProfileMedia(
            avatarFile,
            "avatar"
          );
      }

      if (coverFile) {
        finalCoverUrl =
          await uploadProfileMedia(
            coverFile,
            "cover"
          );
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          username: cleanUsername,
          display_name:
            cleanDisplayName || null,
          bio: cleanBio || null,
          favorite_genres:
            favoriteGenres,
          avatar_url: finalAvatarUrl,
          cover_url: finalCoverUrl,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      const updatedProfile: SavedProfile = {
        username: cleanUsername,
        displayName: cleanDisplayName,
        bio: cleanBio,
        favoriteGenres,
        avatarUrl: finalAvatarUrl,
        coverUrl: finalCoverUrl,
      };

      clearAvatarPreview();
      clearCoverPreview();

      setAvatarFile(null);
      setCoverFile(null);

      setAvatarUrl(finalAvatarUrl);
      setCoverUrl(finalCoverUrl);

      setUsername(cleanUsername);
      setDisplayName(cleanDisplayName);
      setBio(cleanBio);

      setSavedProfile(updatedProfile);

      setMessage(
        "Profilo aggiornato correttamente."
      );

      setHasError(false);
      setIsEditing(false);

      router.refresh();
    } catch (error) {
      console.error(
        "Errore durante il salvataggio del profilo:",
        error
      );

      const supabaseError =
        error as {
          code?: string;
          message?: string;
        };

      if (supabaseError.code === "23505") {
        setMessage(
          "Questo username è già utilizzato. Scegline un altro."
        );
      } else {
        setMessage(
          "Non è stato possibile salvare il profilo. Riprova."
        );
      }

      setHasError(true);
    } finally {
      setIsSaving(false);
    }
  }

  const effectiveDisplayName =
    displayName.trim() ||
    username.trim() ||
    "Utente ViewVault";

  const profileInitial =
    effectiveDisplayName
      .charAt(0)
      .toUpperCase();

  const displayedAvatar =
    avatarPreviewUrl || avatarUrl;

  const displayedCover =
    coverPreviewUrl || coverUrl;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#121212] text-white">
        <Navbar />

        <section className="mx-auto max-w-6xl px-6 pb-24 pt-32">
          <div className="rounded-3xl border border-zinc-800 bg-[#18181B] p-8 text-zinc-400">
            Caricamento profilo...
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#121212] text-[#F8FAFC]">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-32">
        {/* PROFILO */}
        <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-[#18181B]">
          {/* COVER */}
          {displayedCover ? (
            <div
              className="h-44 bg-cover bg-center md:h-56"
              style={{
                backgroundImage: `url("${displayedCover}")`,
              }}
            />
          ) : (
            <div className="h-44 bg-gradient-to-r from-[#7C3AED]/40 via-[#18181B] to-[#2563EB]/30 md:h-56" />
          )}

          <div className="px-6 pb-8 md:px-10">
            <div className="-mt-14 flex flex-col gap-6 md:-mt-16 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-5 md:flex-row md:items-end">
                {/* AVATAR */}
                {displayedAvatar ? (
                  <div
                    className="h-28 w-28 shrink-0 rounded-full border-4 border-[#18181B] bg-cover bg-center shadow-2xl md:h-32 md:w-32"
                    style={{
                      backgroundImage: `url("${displayedAvatar}")`,
                    }}
                    aria-label={`Avatar di ${effectiveDisplayName}`}
                  />
                ) : (
                  <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-4 border-[#18181B] bg-[#7C3AED] text-4xl font-bold text-white shadow-2xl md:h-32 md:w-32">
                    {profileInitial}
                  </div>
                )}

                <div className="pb-2">
                  <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#A78BFA]">
                    Profilo ViewVault
                  </p>

                  <h1 className="mt-2 text-4xl font-bold text-white md:text-5xl">
                    {effectiveDisplayName}
                  </h1>

                  <p className="mt-2 text-lg text-zinc-400">
                    @{username}
                  </p>
                </div>
              </div>

              {!isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    clearMessage();
                  }}
                  className="mb-2 inline-flex w-fit items-center justify-center rounded-full bg-[#7C3AED] px-6 py-3 font-bold text-white transition hover:bg-[#2563EB]"
                >
                  Modifica profilo
                </button>
              )}
            </div>

            {/* BIO */}
            {bio && (
              <p className="mt-8 max-w-3xl text-lg leading-8 text-zinc-300">
                {bio}
              </p>
            )}

            {/* GENERI */}
            {favoriteGenres.length > 0 && (
              <div className="mt-8">
                <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-zinc-500">
                  Generi preferiti
                </p>

                <div className="flex flex-wrap gap-2">
                  {favoriteGenres.map(
                    (genre) => (
                      <span
                        key={genre}
                        className="rounded-full border border-[#7C3AED]/40 bg-[#7C3AED]/10 px-4 py-2 text-sm font-semibold text-[#C4B5FD]"
                      >
                        {genre}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* AMICI */}
<section className="mt-8 rounded-3xl border border-zinc-800 bg-[#18181B] p-6 md:p-8">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
        Social
      </p>

      <h2 className="mt-2 text-2xl font-bold text-white">
        I miei amici
      </h2>

      <p className="mt-2 text-zinc-400">
        Le persone con cui sei connesso su ViewVault.
      </p>
    </div>

 <div className="flex items-center gap-3">
  <div className="rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-4 py-2 text-sm font-bold text-[#C4B5FD]">
    {friends.length}{" "}
    {friends.length === 1 ? "amico" : "amici"}
  </div>

  <Link
    href="/account/friends"
    className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300 transition hover:border-[#7C3AED] hover:bg-[#7C3AED]/10 hover:text-[#C4B5FD]"
  >
    Gestisci amici
    </Link>
</div>
</div>

{friends.length > 0 ? (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {friends.map((friend) => {
        const friendDisplayName =
          friend.display_name?.trim() ||
          friend.username;

        const friendInitial =
          friendDisplayName
            .charAt(0)
            .toUpperCase();

        return (
          <a
            key={friend.id}
            href={`/u/${friend.username}`}
            className="group rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5 transition hover:border-[#7C3AED]/60"
          >
            <div className="flex items-center gap-4">
              {friend.avatar_url ? (
                <div
                  className="h-14 w-14 shrink-0 rounded-full border-2 border-zinc-700 bg-cover bg-center transition group-hover:border-[#7C3AED]"
                  style={{
                    backgroundImage: `url("${friend.avatar_url}")`,
                  }}
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#7C3AED] text-lg font-bold text-white">
                  {friendInitial}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-white transition group-hover:text-[#C4B5FD]">
                  {friendDisplayName}
                </p>

                <p className="mt-1 truncate text-sm text-zinc-500">
                  @{friend.username}
                </p>

                {friend.bio && (
                  <p className="mt-2 line-clamp-1 text-sm text-zinc-400">
                    {friend.bio}
                  </p>
                )}
              </div>

              <span className="text-xl text-zinc-600 transition group-hover:translate-x-1 group-hover:text-[#A78BFA]">
                →
              </span>
            </div>
          </a>
        );
      })}
    </div>
  ) : (
    <div className="mt-6 rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/30 px-6 py-10 text-center">
      <div className="text-4xl">👥</div>

      <p className="mt-4 font-bold text-white">
        Nessun amico ancora
      </p>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
        Quando aggiungerai altri utenti ViewVault,
        compariranno qui.
      </p>
    </div>
  )}
</section>

        {/* MODIFICA */}
        {isEditing && (
          <div className="mt-8 space-y-8">
            {/* INFORMAZIONI */}
            <section className="rounded-3xl border border-zinc-800 bg-[#18181B] p-6 md:p-8">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
                Modifica
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Informazioni personali
              </h2>

              <div className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-300">
                    Username
                  </label>

                  <input
                    type="text"
                    value={username}
                    maxLength={30}
                    onChange={(event) => {
                      setUsername(
                        event.target.value
                      );

                      clearMessage();
                    }}
                    disabled={isSaving}
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-[#7C3AED]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-300">
                    Nome visualizzato
                  </label>

                  <input
                    type="text"
                    value={displayName}
                    maxLength={50}
                    onChange={(event) => {
                      setDisplayName(
                        event.target.value
                      );

                      clearMessage();
                    }}
                    disabled={isSaving}
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-[#7C3AED]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-300">
                    Bio
                  </label>

                  <textarea
                    value={bio}
                    maxLength={300}
                    rows={5}
                    onChange={(event) => {
                      setBio(
                        event.target.value
                      );

                      clearMessage();
                    }}
                    disabled={isSaving}
                    className="w-full resize-none rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-[#7C3AED]"
                  />

                  <p className="mt-2 text-right text-xs text-zinc-500">
                    {bio.length}/300
                  </p>
                </div>
              </div>
            </section>

            {/* AVATAR */}
            <section className="rounded-3xl border border-zinc-800 bg-[#18181B] p-6 md:p-8">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
                Avatar
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Immagine profilo
              </h2>

              <p className="mt-3 text-zinc-400">
                Scegli un avatar ViewVault
                oppure carica una tua foto.
              </p>

              <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-6">
                {AVATARS.map((avatar) => {
                  const selected =
                    !avatarFile &&
                    avatarUrl === avatar;

                  return (
                    <button
                      key={avatar}
                      type="button"
                      onClick={() =>
                        selectPresetAvatar(
                          avatar
                        )
                      }
                      disabled={isSaving}
                      className={`aspect-square overflow-hidden rounded-full border-4 transition ${
                        selected
                          ? "border-[#7C3AED] ring-4 ring-[#7C3AED]/20"
                          : "border-zinc-700 hover:border-[#7C3AED]/60"
                      }`}
                    >
                      <img
                        src={avatar}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-dashed border-zinc-700 p-5">
                <p className="font-semibold text-white">
                  Foto personale
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  JPG, PNG o WebP.
                  Dimensione massima 5 MB.
                </p>

                <label className="mt-4 inline-flex cursor-pointer rounded-full bg-[#7C3AED] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#2563EB]">
                  Carica foto
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={
                      handleAvatarFile
                    }
                    disabled={isSaving}
                    className="hidden"
                  />
                </label>

                {avatarFile && (
                  <p className="mt-3 text-sm text-[#A78BFA]">
                    Selezionata:{" "}
                    {avatarFile.name}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={useInitialAvatar}
                disabled={isSaving}
                className="mt-5 rounded-full border border-zinc-700 px-5 py-2 text-sm font-semibold text-zinc-300 transition hover:border-[#7C3AED] hover:text-white"
              >
                Usa iniziale
              </button>
            </section>

            {/* COVER */}
            <section className="rounded-3xl border border-zinc-800 bg-[#18181B] p-6 md:p-8">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
                Copertina
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Sfondo del profilo
              </h2>

              <p className="mt-3 text-zinc-400">
                Scegli una cover ViewVault
                oppure carica una tua immagine.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {COVERS.map((cover) => {
                  const selected =
                    !coverFile &&
                    coverUrl === cover;

                  return (
                    <button
                      key={cover}
                      type="button"
                      onClick={() =>
                        selectPresetCover(
                          cover
                        )
                      }
                      disabled={isSaving}
                      className={`overflow-hidden rounded-2xl border-2 transition ${
                        selected
                          ? "border-[#7C3AED] ring-4 ring-[#7C3AED]/20"
                          : "border-zinc-700 hover:border-[#7C3AED]/60"
                      }`}
                    >
                      <img
                        src={cover}
                        alt=""
                        className="aspect-video w-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-dashed border-zinc-700 p-5">
                <p className="font-semibold text-white">
                  Cover personale
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  JPG, PNG o WebP.
                  Dimensione massima 5 MB.
                </p>

                <label className="mt-4 inline-flex cursor-pointer rounded-full bg-[#7C3AED] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#2563EB]">
                  Carica cover
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={
                      handleCoverFile
                    }
                    disabled={isSaving}
                    className="hidden"
                  />
                </label>

                {coverFile && (
                  <p className="mt-3 text-sm text-[#A78BFA]">
                    Selezionata:{" "}
                    {coverFile.name}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={useDefaultCover}
                disabled={isSaving}
                className="mt-5 rounded-full border border-zinc-700 px-5 py-2 text-sm font-semibold text-zinc-300 transition hover:border-[#7C3AED] hover:text-white"
              >
                Usa sfumatura ViewVault
              </button>
            </section>

            {/* GENERI */}
            <section className="rounded-3xl border border-zinc-800 bg-[#18181B] p-6 md:p-8">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
                Preferenze
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Generi preferiti
              </h2>

              <div className="mt-6 flex flex-wrap gap-3">
                {GENRES.map((genre) => {
                  const selected =
                    favoriteGenres.includes(
                      genre
                    );

                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() =>
                        toggleGenre(genre)
                      }
                      disabled={isSaving}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        selected
                          ? "border-[#7C3AED] bg-[#7C3AED] text-white"
                          : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-[#7C3AED]"
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ERRORI */}
            {message && hasError && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
                {message}
              </div>
            )}

            {/* AZIONI */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cancelEditing}
                disabled={isSaving}
                className="rounded-full border border-zinc-700 px-7 py-3 font-bold text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:opacity-60"
              >
                Annulla
              </button>

              <button
                type="button"
                onClick={saveProfile}
                disabled={isSaving}
                className="rounded-full bg-[#7C3AED] px-7 py-3 font-bold text-white transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving
                  ? "Caricamento e salvataggio..."
                  : "Salva modifiche"}
              </button>
            </div>
          </div>
        )}

        {/* SUCCESSO */}
        {!isEditing &&
          message &&
          !hasError && (
            <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
              {message}
            </div>
          )}
      </section>
    </main>
  );
}