"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { createClient } from "../lib/supabase/client";

type PendingRequest = {
  id: string;
  requester_id: string;
};

type RequesterProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type NotificationItem = {
  friendshipId: string;
  requesterId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export default function NotificationBell() {
  const supabase = useMemo(() => createClient(), []);

  const [notifications, setNotifications] = useState<
    NotificationItem[]
  >([]);

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  async function loadNotifications() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    const { data: requests, error: requestsError } =
      await supabase
        .from("friendships")
        .select("id, requester_id")
        .eq("receiver_id", user.id)
        .eq("status", "pending")
        .order("created_at", {
          ascending: false,
        });

    if (requestsError) {
      console.error(
        "Errore caricamento notifiche:",
        requestsError
      );

      setNotifications([]);
      setIsLoading(false);
      return;
    }

    const pendingRequests =
      (requests as PendingRequest[] | null) ?? [];

    if (pendingRequests.length === 0) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    const requesterIds = pendingRequests.map(
      (request) => request.requester_id
    );

    const { data: profiles, error: profilesError } =
      await supabase
        .from("profiles")
        .select(
          "id, username, display_name, avatar_url"
        )
        .in("id", requesterIds);

    if (profilesError) {
      console.error(
        "Errore caricamento profili notifiche:",
        profilesError
      );

      setNotifications([]);
      setIsLoading(false);
      return;
    }

    const requesterProfiles =
      (profiles as RequesterProfile[] | null) ?? [];

    const items = pendingRequests
      .map((request) => {
        const profile = requesterProfiles.find(
          (item) => item.id === request.requester_id
        );

        if (!profile) {
          return null;
        }

        return {
          friendshipId: request.id,
          requesterId: request.requester_id,
          username: profile.username,
          displayName:
            profile.display_name?.trim() ||
            profile.username,
          avatarUrl: profile.avatar_url,
        };
      })
      .filter(
        (
          item
        ): item is NotificationItem => item !== null
      );

    setNotifications(items);
    setIsLoading(false);
  }

  useEffect(() => {
  loadNotifications();

  const handleFriendshipUpdated = () => {
    loadNotifications();
  };

  window.addEventListener(
    "friendship-updated",
    handleFriendshipUpdated
  );

  const channel = supabase
    .channel("friendships-notifications")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "friendships",
      },
      (payload) => {
  console.log(
    "🔔 Cambio friendships ricevuto:",
    payload
  );

  loadNotifications();
}
    )
    .subscribe((status) => {
  console.log("🔔 Realtime friendships:", status);
});

  return () => {
    window.removeEventListener(
      "friendship-updated",
      handleFriendshipUpdated
    );

    supabase.removeChannel(channel);
  };
}, [supabase]);

  async function acceptRequest(
    friendshipId: string
  ) {
    const { error } = await supabase
      .from("friendships")
      .update({
        status: "accepted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", friendshipId);

    if (error) {
      console.error(
        "Errore accettazione richiesta:",
        error
      );

      return;
    }

    setNotifications((current) =>
      current.filter(
        (item) =>
          item.friendshipId !== friendshipId
      )
    );
  }

  async function rejectRequest(
    friendshipId: string
  ) {
    const { error } = await supabase
      .from("friendships")
      .update({
        status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", friendshipId);

    if (error) {
      console.error(
        "Errore rifiuto richiesta:",
        error
      );

      return;
    }

    setNotifications((current) =>
      current.filter(
        (item) =>
          item.friendshipId !== friendshipId
      )
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-[#151515] text-xl text-zinc-300 transition hover:border-[#7C3AED] hover:text-white"
        aria-label="Notifiche"
      >
        🔔

        {notifications.length > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-black text-white">
            {notifications.length > 9
              ? "9+"
              : notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-14 z-[100] w-[360px] overflow-hidden rounded-3xl border border-zinc-800 bg-[#18181B] shadow-2xl shadow-black/50">
          <div className="border-b border-zinc-800 px-5 py-4">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A78BFA]">
              Notifiche
            </p>

            <h3 className="mt-1 text-lg font-bold text-white">
              Richieste di amicizia
            </h3>
          </div>

          {isLoading ? (
            <div className="px-5 py-8 text-center text-sm text-zinc-500">
              Caricamento...
            </div>
          ) : notifications.length > 0 ? (
            <div className="max-h-[420px] overflow-y-auto">
              {notifications.map((notification) => (
                <div
                  key={notification.friendshipId}
                  className="border-b border-zinc-800/80 p-4 last:border-b-0"
                >
                  <div className="flex gap-3">
                    <Link
                      href={`/u/${notification.username}`}
                      onClick={() => setIsOpen(false)}
                      className="shrink-0"
                    >
                      {notification.avatarUrl ? (
                        <div
                          className="h-12 w-12 rounded-full border-2 border-zinc-700 bg-cover bg-center"
                          style={{
                            backgroundImage: `url("${notification.avatarUrl}")`,
                          }}
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7C3AED] font-bold text-white">
                          {notification.displayName
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-6 text-zinc-300">
                        <Link
                          href={`/u/${notification.username}`}
                          onClick={() => setIsOpen(false)}
                          className="font-bold text-white transition hover:text-[#A78BFA]"
                        >
                          {notification.displayName}
                        </Link>{" "}
                        ti ha inviato una richiesta di amicizia.
                      </p>

                      <p className="mt-1 text-xs text-zinc-600">
                        @{notification.username}
                      </p>

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            acceptRequest(
                              notification.friendshipId
                            )
                          }
                          className="rounded-full bg-[#7C3AED] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#2563EB]"
                        >
                          Accetta
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            rejectRequest(
                              notification.friendshipId
                            )
                          }
                          className="rounded-full border border-zinc-700 px-4 py-2 text-xs font-bold text-zinc-300 transition hover:border-red-500/60 hover:text-red-400"
                        >
                          Rifiuta
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-10 text-center">
              <div className="text-3xl">🔕</div>

              <p className="mt-3 font-semibold text-white">
                Nessuna nuova richiesta
              </p>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Quando qualcuno ti invierà una richiesta,
                comparirà qui.
              </p>
            </div>
          )}

          <div className="border-t border-zinc-800 bg-black/20 px-5 py-3">
            <Link
              href="/community"
              onClick={() => setIsOpen(false)}
              className="text-sm font-semibold text-[#A78BFA] transition hover:text-white"
            >
              Vai alla Community →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}