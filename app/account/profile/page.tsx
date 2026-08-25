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

const COUNTRIES = [
  { code: "IT", name: "Italia" },
  { code: "AD", name: "Andorra" },
  { code: "AE", name: "Emirati Arabi Uniti" },
  { code: "AF", name: "Afghanistan" },
  { code: "AG", name: "Antigua e Barbuda" },
  { code: "AL", name: "Albania" },
  { code: "AM", name: "Armenia" },
  { code: "AO", name: "Angola" },
  { code: "AR", name: "Argentina" },
  { code: "AT", name: "Austria" },
  { code: "AU", name: "Australia" },
  { code: "AZ", name: "Azerbaigian" },
  { code: "BA", name: "Bosnia ed Erzegovina" },
  { code: "BB", name: "Barbados" },
  { code: "BD", name: "Bangladesh" },
  { code: "BE", name: "Belgio" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BG", name: "Bulgaria" },
  { code: "BH", name: "Bahrein" },
  { code: "BI", name: "Burundi" },
  { code: "BJ", name: "Benin" },
  { code: "BN", name: "Brunei" },
  { code: "BO", name: "Bolivia" },
  { code: "BR", name: "Brasile" },
  { code: "BS", name: "Bahamas" },
  { code: "BT", name: "Bhutan" },
  { code: "BW", name: "Botswana" },
  { code: "BY", name: "Bielorussia" },
  { code: "BZ", name: "Belize" },
  { code: "CA", name: "Canada" },
  { code: "CD", name: "Repubblica Democratica del Congo" },
  { code: "CF", name: "Repubblica Centrafricana" },
  { code: "CG", name: "Repubblica del Congo" },
  { code: "CH", name: "Svizzera" },
  { code: "CI", name: "Costa d'Avorio" },
  { code: "CL", name: "Cile" },
  { code: "CM", name: "Camerun" },
  { code: "CN", name: "Cina" },
  { code: "CO", name: "Colombia" },
  { code: "CR", name: "Costa Rica" },
  { code: "CU", name: "Cuba" },
  { code: "CV", name: "Capo Verde" },
  { code: "CY", name: "Cipro" },
  { code: "CZ", name: "Cechia" },
  { code: "DE", name: "Germania" },
  { code: "DJ", name: "Gibuti" },
  { code: "DK", name: "Danimarca" },
  { code: "DM", name: "Dominica" },
  { code: "DO", name: "Repubblica Dominicana" },
  { code: "DZ", name: "Algeria" },
  { code: "EC", name: "Ecuador" },
  { code: "EE", name: "Estonia" },
  { code: "EG", name: "Egitto" },
  { code: "ER", name: "Eritrea" },
  { code: "ES", name: "Spagna" },
  { code: "ET", name: "Etiopia" },
  { code: "FI", name: "Finlandia" },
  { code: "FJ", name: "Figi" },
  { code: "FR", name: "Francia" },
  { code: "GA", name: "Gabon" },
  { code: "GB", name: "Regno Unito" },
  { code: "GD", name: "Grenada" },
  { code: "GE", name: "Georgia" },
  { code: "GH", name: "Ghana" },
  { code: "GM", name: "Gambia" },
  { code: "GN", name: "Guinea" },
  { code: "GQ", name: "Guinea Equatoriale" },
  { code: "GR", name: "Grecia" },
  { code: "GT", name: "Guatemala" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HN", name: "Honduras" },
  { code: "HR", name: "Croazia" },
  { code: "HT", name: "Haiti" },
  { code: "HU", name: "Ungheria" },
  { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Irlanda" },
  { code: "IL", name: "Israele" },
  { code: "IN", name: "India" },
  { code: "IQ", name: "Iraq" },
  { code: "IR", name: "Iran" },
  { code: "IS", name: "Islanda" },
  { code: "JM", name: "Giamaica" },
  { code: "JO", name: "Giordania" },
  { code: "JP", name: "Giappone" },
  { code: "KE", name: "Kenya" },
  { code: "KG", name: "Kirghizistan" },
  { code: "KH", name: "Cambogia" },
  { code: "KI", name: "Kiribati" },
  { code: "KM", name: "Comore" },
  { code: "KN", name: "Saint Kitts e Nevis" },
  { code: "KP", name: "Corea del Nord" },
  { code: "KR", name: "Corea del Sud" },
  { code: "KW", name: "Kuwait" },
  { code: "KZ", name: "Kazakistan" },
  { code: "LA", name: "Laos" },
  { code: "LB", name: "Libano" },
  { code: "LC", name: "Saint Lucia" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LK", name: "Sri Lanka" },
  { code: "LR", name: "Liberia" },
  { code: "LS", name: "Lesotho" },
  { code: "LT", name: "Lituania" },
  { code: "LU", name: "Lussemburgo" },
  { code: "LV", name: "Lettonia" },
  { code: "LY", name: "Libia" },
  { code: "MA", name: "Marocco" },
  { code: "MC", name: "Monaco" },
  { code: "MD", name: "Moldavia" },
  { code: "ME", name: "Montenegro" },
  { code: "MG", name: "Madagascar" },
  { code: "MH", name: "Isole Marshall" },
  { code: "MK", name: "Macedonia del Nord" },
  { code: "ML", name: "Mali" },
  { code: "MM", name: "Myanmar" },
  { code: "MN", name: "Mongolia" },
  { code: "MR", name: "Mauritania" },
  { code: "MT", name: "Malta" },
  { code: "MU", name: "Mauritius" },
  { code: "MV", name: "Maldive" },
  { code: "MW", name: "Malawi" },
  { code: "MX", name: "Messico" },
  { code: "MY", name: "Malesia" },
  { code: "MZ", name: "Mozambico" },
  { code: "NA", name: "Namibia" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "NI", name: "Nicaragua" },
  { code: "NL", name: "Paesi Bassi" },
  { code: "NO", name: "Norvegia" },
  { code: "NP", name: "Nepal" },
  { code: "NR", name: "Nauru" },
  { code: "NZ", name: "Nuova Zelanda" },
  { code: "OM", name: "Oman" },
  { code: "PA", name: "Panama" },
  { code: "PE", name: "Perù" },
  { code: "PG", name: "Papua Nuova Guinea" },
  { code: "PH", name: "Filippine" },
  { code: "PK", name: "Pakistan" },
  { code: "PL", name: "Polonia" },
  { code: "PT", name: "Portogallo" },
  { code: "PW", name: "Palau" },
  { code: "PY", name: "Paraguay" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "RS", name: "Serbia" },
  { code: "RU", name: "Russia" },
  { code: "RW", name: "Ruanda" },
  { code: "SA", name: "Arabia Saudita" },
  { code: "SB", name: "Isole Salomone" },
  { code: "SC", name: "Seychelles" },
  { code: "SD", name: "Sudan" },
  { code: "SE", name: "Svezia" },
  { code: "SG", name: "Singapore" },
  { code: "SI", name: "Slovenia" },
  { code: "SK", name: "Slovacchia" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SM", name: "San Marino" },
  { code: "SN", name: "Senegal" },
  { code: "SO", name: "Somalia" },
  { code: "SR", name: "Suriname" },
  { code: "SS", name: "Sud Sudan" },
  { code: "ST", name: "São Tomé e Príncipe" },
  { code: "SV", name: "El Salvador" },
  { code: "SY", name: "Siria" },
  { code: "SZ", name: "Eswatini" },
  { code: "TD", name: "Ciad" },
  { code: "TG", name: "Togo" },
  { code: "TH", name: "Thailandia" },
  { code: "TJ", name: "Tagikistan" },
  { code: "TL", name: "Timor Est" },
  { code: "TM", name: "Turkmenistan" },
  { code: "TN", name: "Tunisia" },
  { code: "TO", name: "Tonga" },
  { code: "TR", name: "Turchia" },
  { code: "TT", name: "Trinidad e Tobago" },
  { code: "TV", name: "Tuvalu" },
  { code: "TZ", name: "Tanzania" },
  { code: "UA", name: "Ucraina" },
  { code: "UG", name: "Uganda" },
  { code: "US", name: "Stati Uniti" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VA", name: "Città del Vaticano" },
  { code: "VC", name: "Saint Vincent e Grenadine" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "VU", name: "Vanuatu" },
  { code: "WS", name: "Samoa" },
  { code: "YE", name: "Yemen" },
  { code: "ZA", name: "Sudafrica" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
].sort((first, second) =>
  first.name.localeCompare(second.name, "it")
);

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type SavedProfile = {
  username: string;
  displayName: string;
  bio: string;
  favoriteGenres: string[];
  avatarUrl: string | null;
  coverUrl: string | null;
  countryCode: string;
  isPublic: boolean;
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
  const [countryCode, setCountryCode] = useState("");
  const [isPublic, setIsPublic] = useState(true);

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
            "username, display_name, bio, favorite_genres, avatar_url, cover_url, country_code, is_public"
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
        countryCode: profile?.country_code ?? "",
        isPublic: profile?.is_public ?? true,
      };

      setUsername(loadedProfile.username);
      setDisplayName(loadedProfile.displayName);
      setBio(loadedProfile.bio);
      setCountryCode(loadedProfile.countryCode);
      setIsPublic(loadedProfile.isPublic);

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
    setCountryCode(savedProfile.countryCode);
    setIsPublic(savedProfile.isPublic);

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
          country_code: countryCode || null,
          is_public: isPublic,
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
        countryCode,
        isPublic,
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

                  <div className="mt-3 flex flex-wrap gap-2">
                    {countryCode && (
                      <span className="rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1 text-xs font-bold text-zinc-300">
                        🌍 {COUNTRIES.find((country) => country.code === countryCode)?.name ?? countryCode}
                      </span>
                    )}

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        isPublic
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {isPublic ? "🌐 Profilo pubblico" : "🔒 Profilo privato"}
                    </span>
                  </div>
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
  <Link
    href="/account/friends"
    className="rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-4 py-2 text-sm font-bold text-[#C4B5FD] transition hover:border-[#7C3AED] hover:bg-[#7C3AED]/20"
    title="Visualizza i miei amici"
  >
    {friends.length}{" "}
    {friends.length === 1 ? "amico" : "amici"}
  </Link>

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

            {/* NAZIONE E PRIVACY */}
            <section className="rounded-3xl border border-zinc-800 bg-[#18181B] p-6 md:p-8">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
                Profilo e privacy
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Nazione e visibilità
              </h2>

              <p className="mt-3 max-w-2xl text-zinc-400">
                La nazione servirà anche per classifiche e statistiche
                geografiche. Puoi inoltre scegliere se rendere pubblico
                o privato il tuo profilo ViewVault.
              </p>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-300">
                    Nazione
                  </label>

                  <select
                    value={countryCode}
                    onChange={(event) => {
                      setCountryCode(event.target.value);
                      clearMessage();
                    }}
                    disabled={isSaving}
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-[#7C3AED]"
                  >
                    <option value="">
                      Seleziona la nazione
                    </option>

                    {COUNTRIES.map((country) => (
                      <option
                        key={country.code}
                        value={country.code}
                      >
                        {country.name}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    Nel database viene salvato il codice paese a due lettere.
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="font-bold text-white">
                        {isPublic
                          ? "🌐 Profilo pubblico"
                          : "🔒 Profilo privato"}
                      </p>

                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        {isPublic
                          ? "Gli altri utenti possono consultare il tuo profilo social ViewVault."
                          : "Gli altri utenti vedranno solo le informazioni essenziali del profilo."}
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={isPublic}
                      onClick={() => {
                        setIsPublic((currentValue) => !currentValue);
                        clearMessage();
                      }}
                      disabled={isSaving}
                      className={`relative h-8 w-14 shrink-0 rounded-full transition ${
                        isPublic
                          ? "bg-[#7C3AED]"
                          : "bg-zinc-700"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <span
                        className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
                          isPublic
                            ? "left-7"
                            : "left-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl border border-zinc-800 bg-black/20 p-4 text-xs leading-5 text-zinc-500">
                    Email, dati di autenticazione e impostazioni account
                    restano sempre privati.
                  </div>
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