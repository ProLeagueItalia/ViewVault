"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import Navbar from "../../../components/Navbar";
import { createClient } from "../../../lib/supabase/client";

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type FriendshipRow = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected";
};

type FriendItem = Profile & {
  friendshipId: string;
};

type RequestItem = Profile & {
  friendshipId: string;
};

export default function FriendsPage() {
  const router = useRouter();
  const t = useTranslations("FriendsPage");
  const supabase = useMemo(() => createClient(), []);

  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<RequestItem[]>([]);
  const [sentRequests, setSentRequests] = useState<RequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let reloadTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadFriends(showLoading = false) {
      if (showLoading && isMounted) {
        setIsLoading(true);
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (isMounted) {
          router.push("/");
        }
        return;
      }

      const { data: friendshipRows, error: friendshipsError } =
        await supabase
          .from("friendships")
          .select(
            `
              id,
              requester_id,
              receiver_id,
              status
            `
          )
          .or(
            `requester_id.eq.${user.id},receiver_id.eq.${user.id}`
          );

      if (friendshipsError) {
        console.error(
          "Errore nel recupero delle amicizie:",
          friendshipsError
        );

        if (isMounted) {
          setIsLoading(false);
        }

        return;
      }

      const rows =
        (friendshipRows as FriendshipRow[] | null) ?? [];

      const allProfileIds = Array.from(
        new Set(
          rows.map((row) =>
            row.requester_id === user.id
              ? row.receiver_id
              : row.requester_id
          )
        )
      );

      if (allProfileIds.length === 0) {
        if (isMounted) {
          setFriends([]);
          setReceivedRequests([]);
          setSentRequests([]);
          setIsLoading(false);
        }

        return;
      }

      const { data: profiles, error: profilesError } =
        await supabase
          .from("profiles")
          .select(
            `
              id,
              username,
              display_name,
              avatar_url,
              bio
            `
          )
          .in("id", allProfileIds);

      if (profilesError) {
        console.error(
          "Errore nel recupero dei profili:",
          profilesError
        );

        if (isMounted) {
          setIsLoading(false);
        }

        return;
      }

      const profileList =
        (profiles as Profile[] | null) ?? [];

      const profileMap = new Map(
        profileList.map((profile) => [
          profile.id,
          profile,
        ])
      );

      const acceptedFriends: FriendItem[] = [];
      const received: RequestItem[] = [];
      const sent: RequestItem[] = [];

      rows.forEach((row) => {
        const otherUserId =
          row.requester_id === user.id
            ? row.receiver_id
            : row.requester_id;

        const profile = profileMap.get(otherUserId);

        if (!profile) {
          return;
        }

        if (row.status === "accepted") {
          acceptedFriends.push({
            ...profile,
            friendshipId: row.id,
          });

          return;
        }

        if (row.status !== "pending") {
          return;
        }

        if (row.receiver_id === user.id) {
          received.push({
            ...profile,
            friendshipId: row.id,
          });

          return;
        }

        if (row.requester_id === user.id) {
          sent.push({
            ...profile,
            friendshipId: row.id,
          });
        }
      });

      if (!isMounted) {
        return;
      }

      setFriends(acceptedFriends);
      setReceivedRequests(received);
      setSentRequests(sent);
      setIsLoading(false);
    }

    function scheduleReload() {
      if (reloadTimer) {
        clearTimeout(reloadTimer);
      }

      reloadTimer = setTimeout(() => {
        console.log("👥 Ricarico lista amici...");
        loadFriends(false);
      }, 200);
    }

    loadFriends(true);

    const channel = supabase
      .channel("friends-page-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
        },
        (payload) => {
          console.log(
            "👥 FriendsPage realtime:",
            payload.eventType,
            payload
          );

          scheduleReload();
        }
      )
      .subscribe((status) => {
        console.log(
          "👥 Realtime FriendsPage:",
          status
        );
      });

    const handleFriendshipUpdated = () => {
      console.log(
        "👥 Evento friendship-updated ricevuto dalla FriendsPage"
      );

      scheduleReload();
    };

    window.addEventListener(
      "friendship-updated",
      handleFriendshipUpdated
    );

    return () => {
      isMounted = false;

      if (reloadTimer) {
        clearTimeout(reloadTimer);
      }

      window.removeEventListener(
        "friendship-updated",
        handleFriendshipUpdated
      );

      supabase.removeChannel(channel);
    };
  }, [router, supabase]);

  async function removeFriend(friendshipId: string) {
    const confirmed = window.confirm(
      t("confirmRemove")
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (error) {
      console.error(
        "Errore durante la rimozione dell'amico:",
        error
      );

      return;
    }

    setFriends((currentFriends) =>
      currentFriends.filter(
        (friend) =>
          friend.friendshipId !== friendshipId
      )
    );

    window.dispatchEvent(
      new Event("friendship-updated")
    );
  }

  async function acceptRequest(friendshipId: string) {
    const acceptedRequest = receivedRequests.find(
      (request) =>
        request.friendshipId === friendshipId
    );

    const { error } = await supabase
      .from("friendships")
      .update({
        status: "accepted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", friendshipId);

    if (error) {
      console.error(
        "Errore durante l'accettazione della richiesta:",
        error
      );

      return;
    }

    /*
     * Aggiornamento immediato dell'interfaccia.
     * Non aspettiamo Realtime per mostrare il nuovo amico.
     */
    if (acceptedRequest) {
      setReceivedRequests((currentRequests) =>
        currentRequests.filter(
          (request) =>
            request.friendshipId !== friendshipId
        )
      );

      setFriends((currentFriends) => {
        const alreadyExists = currentFriends.some(
          (friend) =>
            friend.friendshipId === friendshipId
        );

        if (alreadyExists) {
          return currentFriends;
        }

        return [
          ...currentFriends,
          {
            ...acceptedRequest,
            friendshipId,
          },
        ];
      });
    }

    /*
     * Avvisa NotificationBell e gli altri componenti
     * presenti nella stessa finestra.
     */
    window.dispatchEvent(
      new Event("friendship-updated")
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#121212] text-white">
        <Navbar />

        <section className="mx-auto max-w-6xl px-6 pb-24 pt-32">
          <div className="rounded-3xl border border-zinc-800 bg-[#18181B] p-8 text-zinc-400">
            {t("loading")}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#121212] text-[#F8FAFC]">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-32">
        {/* HEADER */}
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#A78BFA]">
            {t("social")}
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            {t("manageFriends")}
          </h1>

          <p className="mt-4 text-lg leading-8 text-zinc-400">
            {t("description")}
          </p>
        </div>

        {/* RIEPILOGO */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-zinc-800 bg-[#18181B] p-6">
            <p className="text-sm font-semibold text-zinc-500">
              {t("friends")}
            </p>

            <p className="mt-2 text-4xl font-black text-white">
              {friends.length}
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-[#18181B] p-6">
            <p className="text-sm font-semibold text-zinc-500">
              {t("receivedRequests")}
            </p>

            <p className="mt-2 text-4xl font-black text-white">
              {receivedRequests.length}
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-[#18181B] p-6">
            <p className="text-sm font-semibold text-zinc-500">
              {t("sentRequests")}
            </p>

            <p className="mt-2 text-4xl font-black text-white">
              {sentRequests.length}
            </p>
          </div>
        </div>

        {/* AMICI */}
        <section className="mt-10 rounded-3xl border border-zinc-800 bg-[#18181B] p-6 md:p-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
              {t("friends")}
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">
              {t("yourFriends")}
            </h2>
          </div>

          {friends.length > 0 ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {friends.map((friend) => (
                <ProfileCard
                  key={friend.id}
                  profile={friend}
                  onRemove={() =>
                    removeFriend(friend.friendshipId)
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="👥"
              title={t("noFriendsTitle")}
              description={t("noFriendsDescription")}
            />
          )}
        </section>

        {/* RICHIESTE RICEVUTE */}
        <section className="mt-8 rounded-3xl border border-zinc-800 bg-[#18181B] p-6 md:p-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
              {t("incoming")}
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">
              {t("receivedRequests")}
            </h2>
          </div>

          {receivedRequests.length > 0 ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {receivedRequests.map((request) => (
                <ProfileCard
                  key={request.id}
                  profile={request}
                  onAccept={() =>
                    acceptRequest(request.friendshipId)
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="📭"
              title={t("noReceivedTitle")}
              description={t("noReceivedDescription")}
            />
          )}
        </section>

        {/* RICHIESTE INVIATE */}
        <section className="mt-8 rounded-3xl border border-zinc-800 bg-[#18181B] p-6 md:p-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
              {t("sent")}
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">
              {t("sentRequests")}
            </h2>
          </div>

          {sentRequests.length > 0 ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {sentRequests.map((request) => (
                <ProfileCard
                  key={request.id}
                  profile={request}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="📤"
              title={t("noSentTitle")}
              description={t("noSentDescription")}
            />
          )}
        </section>
      </section>
    </main>
  );
}

function ProfileCard({
  profile,
  onRemove,
  onAccept,
}: {
  profile: Profile;
  onRemove?: () => void;
  onAccept?: () => void;
}) {
  const t = useTranslations("FriendsPage");
  const displayName =
    profile.display_name?.trim() ||
    profile.username;

  const initial =
    displayName.charAt(0).toUpperCase();

  return (
    <div className="group rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5 transition hover:border-[#7C3AED]/60">
      <Link
        href={`/u/${profile.username}`}
        className="flex min-w-0 flex-1 items-center gap-4"
      >
        {profile.avatar_url ? (
          <div
            className="h-14 w-14 shrink-0 rounded-full border-2 border-zinc-700 bg-cover bg-center transition group-hover:border-[#7C3AED]"
            style={{
              backgroundImage: `url("${profile.avatar_url}")`,
            }}
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#7C3AED] text-lg font-bold text-white">
            {initial}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-white transition group-hover:text-[#C4B5FD]">
            {displayName}
          </p>

          <p className="mt-1 truncate text-sm text-zinc-500">
            @{profile.username}
          </p>

          {profile.bio && (
            <p className="mt-2 line-clamp-1 text-sm text-zinc-400">
              {profile.bio}
            </p>
          )}
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-3">
        <span className="text-xl text-zinc-600 transition group-hover:translate-x-1 group-hover:text-[#A78BFA]">
          →
        </span>

        {onAccept && (
          <button
            type="button"
            onClick={onAccept}
            className="rounded-full bg-[#7C3AED] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#2563EB]"
          >
            {t("accept")}
          </button>
        )}

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-full border border-red-500/30 px-3 py-2 text-xs font-bold text-red-400 transition hover:border-red-500 hover:bg-red-500/10"
          >
            {t("remove")}
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mt-6 rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/30 px-6 py-10 text-center">
      <div className="text-4xl">
        {icon}
      </div>

      <p className="mt-4 font-bold text-white">
        {title}
      </p>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
        {description}
      </p>
    </div>
  );
}