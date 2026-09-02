"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslations } from "next-intl";

import { createClient } from "../lib/supabase/client";
import FriendshipButton from "./FriendshipButton";

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  country_code: string | null;
  profile_visibility: string;
  is_public: boolean;
};

type FriendshipRow = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected";
};

type FriendshipStatus =
  | "none"
  | "sent"
  | "received"
  | "accepted"
  | "rejected";

type UserWithFriendship = ProfileRow & {
  friendshipId: string | null;
  friendshipStatus: FriendshipStatus;
  requesterId: string | null;
  receiverId: string | null;
};

type FriendFinderProps = {
  currentUserId: string;
};

const USERS_LIMIT = 24;

function countryFlag(countryCode: string | null) {
  if (!countryCode) {
    return "🌍";
  }

  const normalized = countryCode
    .trim()
    .toUpperCase();

  if (normalized.length !== 2) {
    return "🌍";
  }

  return String.fromCodePoint(
    ...normalized
      .split("")
      .map(
        (character) =>
          127397 + character.charCodeAt(0)
      )
  );
}

function getFriendshipStatus(
  friendship: FriendshipRow | undefined,
  currentUserId: string
): FriendshipStatus {
  if (!friendship) {
    return "none";
  }

  if (friendship.status === "accepted") {
    return "accepted";
  }

  if (friendship.status === "rejected") {
    return "rejected";
  }

  if (
    friendship.status === "pending" &&
    friendship.requester_id === currentUserId
  ) {
    return "sent";
  }

  if (
    friendship.status === "pending" &&
    friendship.receiver_id === currentUserId
  ) {
    return "received";
  }

  return "none";
}

export default function FriendFinder({
  currentUserId,
}: FriendFinderProps) {
  const t = useTranslations("FriendFinder");

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [users, setUsers] = useState<
    UserWithFriendship[]
  >([]);

  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] =
    useState(true);

  const [isSearching, setIsSearching] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [hasSearched, setHasSearched] =
    useState(false);

  const attachFriendships = useCallback(
    async (
      profiles: ProfileRow[]
    ): Promise<UserWithFriendship[]> => {
      if (profiles.length === 0) {
        return [];
      }

      const profileIds = profiles.map(
        (profile) => profile.id
      );

      const { data, error } =
        await supabase
          .from("friendships")
          .select(
            "id, requester_id, receiver_id, status"
          )
          .or(
            `requester_id.in.(${profileIds.join(
              ","
            )}),receiver_id.in.(${profileIds.join(
              ","
            )})`
          );

      if (error) {
        console.error(
          "Errore caricamento amicizie:",
          error
        );
      }

      const friendships =
        (data as FriendshipRow[] | null) ?? [];

      return profiles.map((profile) => {
        const friendship =
          friendships.find(
            (item) =>
              (item.requester_id ===
                currentUserId &&
                item.receiver_id ===
                  profile.id) ||
              (item.requester_id ===
                profile.id &&
                item.receiver_id ===
                  currentUserId)
          );

        return {
          ...profile,
          friendshipId:
            friendship?.id ?? null,
          friendshipStatus:
            getFriendshipStatus(
              friendship,
              currentUserId
            ),
          requesterId:
            friendship?.requester_id ?? null,
          receiverId:
            friendship?.receiver_id ?? null,
        };
      });
    },
    [currentUserId, supabase]
  );

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    setHasSearched(false);

    const { data, error } =
      await supabase
        .from("profiles")
        .select(
          "id, username, display_name, avatar_url, country_code, profile_visibility, is_public"
        )
        .neq("id", currentUserId)
        .order("created_at", {
          ascending: false,
        })
        .limit(USERS_LIMIT);

    if (error) {
      console.error(
        "Errore caricamento utenti:",
        error
      );

      setErrorMessage(
        t("loadUsersError")
      );

      setUsers([]);
      setIsLoading(false);
      return;
    }

    const profiles =
      (data as ProfileRow[] | null) ?? [];

    const enriched =
      await attachFriendships(profiles);

    setUsers(enriched);
    setIsLoading(false);
  }, [
    attachFriendships,
    currentUserId,
    supabase,
    t,
  ]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleSearch(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const query = search.trim();

    if (!query) {
      await loadUsers();
      return;
    }

    setIsSearching(true);
    setErrorMessage("");
    setHasSearched(true);

    try {
      let profiles: ProfileRow[] = [];

      if (query.includes("@")) {
        const { data, error } =
          await supabase.rpc(
            "find_profile_by_email",
            {
              search_email: query,
            }
          );

        if (error) {
          throw error;
        }

        profiles =
          (data as ProfileRow[] | null) ?? [];
      } else {
        const safeQuery = query
          .replace(/[%_]/g, "")
          .trim();

        if (!safeQuery) {
          setUsers([]);
          setIsSearching(false);
          return;
        }

        const { data, error } =
          await supabase
            .from("profiles")
            .select(
              "id, username, display_name, avatar_url, country_code, profile_visibility, is_public"
            )
            .neq("id", currentUserId)
            .or(
              `username.ilike.%${safeQuery}%,display_name.ilike.%${safeQuery}%`
            )
            .order("username", {
              ascending: true,
            })
            .limit(USERS_LIMIT);

        if (error) {
          throw error;
        }

        profiles =
          (data as ProfileRow[] | null) ?? [];
      }

      profiles = profiles.filter(
        (profile) =>
          profile.id !== currentUserId
      );

      const enriched =
        await attachFriendships(profiles);

      setUsers(enriched);
    } catch (error) {
      console.error(
        "Errore ricerca utenti:",
        error
      );

      setUsers([]);
      setErrorMessage(
        t("searchError")
      );
    } finally {
      setIsSearching(false);
    }
  }

  async function clearSearch() {
    setSearch("");
    await loadUsers();
  }

  return (
    <section className="mt-12 overflow-hidden rounded-[2rem] border border-zinc-800 bg-[#18181B]">
      <div className="border-b border-zinc-800 p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
              {t("connections")}
            </p>

            <h2 className="mt-2 text-3xl font-black text-white">
              {t("findFriends")}
            </h2>

            <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
              {t("description")}
            </p>
          </div>

          <div className="rounded-2xl border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-4 py-3 text-sm font-semibold text-[#C4B5FD]">
            👥 {t("meetNewFans")}
          </div>
        </div>

        <form
          onSubmit={handleSearch}
          className="mt-7 flex flex-col gap-3 md:flex-row"
        >
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder={t("searchPlaceholder")}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-full border border-zinc-700 bg-[#111111] px-6 py-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/15"
          />

          <button
            type="submit"
            disabled={isSearching}
            className="rounded-full bg-[#7C3AED] px-8 py-4 font-bold text-white transition hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSearching
              ? t("searching")
              : `🔎 ${t("search")}`}
          </button>

          {hasSearched && (
            <button
              type="button"
              onClick={clearSearch}
              className="rounded-full border border-zinc-700 px-6 py-4 font-bold text-zinc-300 transition hover:border-[#7C3AED] hover:text-white"
            >
              {t("showAll")}
            </button>
          )}
        </form>

        <p className="mt-3 text-sm text-zinc-500">
          {t("emailPrivacy")}
        </p>
      </div>

      <div className="p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#8B5CF6]">
              {hasSearched
                ? t("results")
                : t("viewVaultUsers")}
            </p>

            <h3 className="mt-1 text-xl font-bold text-white">
              {hasSearched
                ? t("peopleFound")
                : t("discoverCommunity")}
            </h3>
          </div>

          {!isLoading && (
            <span className="rounded-full border border-zinc-800 bg-black/20 px-4 py-2 text-sm font-semibold text-zinc-400">
              {t("usersCount", { count: users.length })}
            </span>
          )}
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-3xl border border-zinc-800 bg-black/20 px-6 py-14 text-center text-zinc-400">
            {t("loadingUsers")}
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-700 bg-black/20 px-6 py-14 text-center">
            <div className="text-4xl">
              👤
            </div>

            <h3 className="mt-4 text-xl font-bold text-white">
              {t("noUsersFound")}
            </h3>

            <p className="mt-2 text-zinc-500">
              {t("tryAnotherSearch")}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {users.map((profile) => (
              <article
                key={profile.id}
                className="flex flex-col justify-between gap-6 rounded-3xl border border-zinc-800 bg-black/20 p-5 transition hover:border-[#7C3AED]/50"
              >
                <div className="flex items-start gap-4">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-900">
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={
                          profile.display_name ??
                          profile.username
                        }
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-xl font-black text-[#A78BFA]">
                        {(
                          profile.display_name ??
                          profile.username
                        )
                          .slice(0, 1)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-lg font-bold text-white">
                        {profile.display_name ||
                          profile.username}
                      </h4>

                      <span
                        className="text-lg"
                        title={
                          profile.country_code ??
                          t("countryNotSpecified")
                        }
                      >
                        {countryFlag(
                          profile.country_code
                        )}
                      </span>
                    </div>

                    <p className="mt-1 truncate text-sm font-semibold text-[#A78BFA]">
                      @{profile.username}
                    </p>

                    <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      {profile.is_public
                        ? t("publicProfile")
                        : t("privateProfile")}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-4">
                  <Link
                    href={`/u/${profile.username}`}
                    className="text-sm font-bold text-zinc-300 transition hover:text-[#C4B5FD]"
                  >
                    {t("viewProfile")} →
                  </Link>

                  <FriendshipButton
                    currentUserId={
                      currentUserId
                    }
                    profileUserId={profile.id}
                    initialFriendshipId={
                      profile.friendshipId
                    }
                    initialStatus={
                      profile.friendshipStatus
                    }
                    initialRequesterId={
                      profile.requesterId
                    }
                    initialReceiverId={
                      profile.receiverId
                    }
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}