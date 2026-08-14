"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { createClient } from "../lib/supabase/client";

type FriendshipStatus =
  | "none"
  | "sent"
  | "received"
  | "accepted"
  | "rejected";

type FriendshipButtonProps = {
  currentUserId: string;
  profileUserId: string;
  initialFriendshipId: string | null;
  initialStatus: FriendshipStatus;
  initialRequesterId: string | null;
  initialReceiverId: string | null;
};

type FriendshipRow = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected";
};

export default function FriendshipButton({
  currentUserId,
  profileUserId,
  initialFriendshipId,
  initialStatus,
  initialRequesterId,
  initialReceiverId,
}: FriendshipButtonProps) {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [friendshipId, setFriendshipId] =
    useState<string | null>(
      initialFriendshipId
    );

  const [status, setStatus] =
    useState<FriendshipStatus>(
      initialStatus
    );

  const statusRef =
    useRef<FriendshipStatus>(
      initialStatus
    );

  const [requesterId, setRequesterId] =
    useState<string | null>(
      initialRequesterId
    );

  const [receiverId, setReceiverId] =
    useState<string | null>(
      initialReceiverId
    );

  const [isLoading, setIsLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const isRequestReceiver =
    status === "received" &&
    receiverId === currentUserId;

  function updateLocalStatus(
    nextStatus: FriendshipStatus
  ) {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }

  useEffect(() => {
    let isMounted = true;

    let reloadTimer:
      | ReturnType<typeof setTimeout>
      | null = null;

    async function loadFriendshipStatus() {
      const { data, error } =
        await supabase
          .from("friendships")
          .select(
            "id, requester_id, receiver_id, status"
          )
          .or(
            `and(requester_id.eq.${currentUserId},receiver_id.eq.${profileUserId}),and(requester_id.eq.${profileUserId},receiver_id.eq.${currentUserId})`
          )
          .maybeSingle();

      if (error) {
        console.error(
          "Errore nel recupero dello stato amicizia:",
          error
        );

        return;
      }

      if (!isMounted) {
        return;
      }

      /*
       * Nessuna relazione presente.
       */
      if (!data) {
        const previousStatus =
          statusRef.current;

        setFriendshipId(null);
        setRequesterId(null);
        setReceiverId(null);

        updateLocalStatus("none");

        /*
         * Se prima esisteva una relazione,
         * aggiorniamo anche il Server Component.
         */
        if (
          previousStatus !== "none"
        ) {
          router.refresh();
        }

        return;
      }

      const friendship =
        data as FriendshipRow;

      setFriendshipId(
        friendship.id
      );

      setRequesterId(
        friendship.requester_id
      );

      setReceiverId(
        friendship.receiver_id
      );

      let nextStatus:
        FriendshipStatus =
        "none";

      if (
        friendship.status ===
        "accepted"
      ) {
        nextStatus =
          "accepted";
      } else if (
        friendship.status ===
        "rejected"
      ) {
        nextStatus =
          "rejected";
      } else if (
        friendship.status ===
          "pending" &&
        friendship.requester_id ===
          currentUserId
      ) {
        nextStatus =
          "sent";
      } else if (
        friendship.status ===
          "pending" &&
        friendship.receiver_id ===
          currentUserId
      ) {
        nextStatus =
          "received";
      }

      const previousStatus =
        statusRef.current;

      updateLocalStatus(
        nextStatus
      );

      /*
       * Questa è la parte decisiva.
       *
       * Se lo stato dell'amicizia è
       * realmente cambiato,
       * chiediamo a Next.js di
       * ricalcolare la pagina server.
       *
       * Serve soprattutto per:
       *
       * sent -> accepted
       * received -> accepted
       * accepted -> none
       *
       * Così anche il controllo
       * "Profilo privato" viene
       * aggiornato senza F5.
       */
      if (
        previousStatus !==
        nextStatus
      ) {
        console.log(
          "🔄 Stato amicizia cambiato:",
          previousStatus,
          "→",
          nextStatus
        );

        router.refresh();
      }
    }

    function scheduleReload() {
      if (reloadTimer) {
        clearTimeout(
          reloadTimer
        );
      }

      reloadTimer =
        setTimeout(() => {
          console.log(
            "🤝 Ricarico stato amicizia..."
          );

          loadFriendshipStatus();
        }, 200);
    }

    /*
     * Controllo iniziale.
     */
    loadFriendshipStatus();

    /*
     * Realtime Supabase.
     */
    const channel = supabase
      .channel(
        `friendship-button-${currentUserId}-${profileUserId}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
        },
        (payload) => {
          console.log(
            "🤝 FriendshipButton realtime:",
            payload.eventType,
            payload
          );

          scheduleReload();
        }
      )
      .subscribe(
        (
          subscriptionStatus
        ) => {
          console.log(
            "🤝 Realtime FriendshipButton:",
            subscriptionStatus
          );
        }
      );

    /*
     * Eventi della stessa finestra.
     */
    const handleFriendshipUpdated =
      () => {
        scheduleReload();
      };

    window.addEventListener(
      "friendship-updated",
      handleFriendshipUpdated
    );

    return () => {
      isMounted = false;

      if (reloadTimer) {
        clearTimeout(
          reloadTimer
        );
      }

      window.removeEventListener(
        "friendship-updated",
        handleFriendshipUpdated
      );

      supabase.removeChannel(
        channel
      );
    };
  }, [
    currentUserId,
    profileUserId,
    router,
    supabase,
  ]);

  async function sendRequest() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    const { data, error } =
      await supabase
        .from("friendships")
        .insert({
          requester_id:
            currentUserId,
          receiver_id:
            profileUserId,
          status: "pending",
        })
        .select(
          "id, requester_id, receiver_id, status"
        )
        .single();

    if (error) {
      console.error(
        "Errore invio richiesta:",
        error
      );

      setMessage(
        "Non è stato possibile inviare la richiesta."
      );

      setIsLoading(false);
      return;
    }

    setFriendshipId(
      data.id
    );

    setRequesterId(
      data.requester_id
    );

    setReceiverId(
      data.receiver_id
    );

    updateLocalStatus(
      "sent"
    );

    window.dispatchEvent(
      new Event(
        "friendship-updated"
      )
    );

    setIsLoading(false);
  }

  async function acceptRequest() {
    if (
      !friendshipId ||
      !isRequestReceiver ||
      isLoading
    ) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    const { error } =
      await supabase
        .from("friendships")
        .update({
          status: "accepted",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          friendshipId
        );

    if (error) {
      console.error(
        "Errore accettazione amicizia:",
        error
      );

      setMessage(
        "Non è stato possibile accettare la richiesta."
      );

      setIsLoading(false);
      return;
    }

    updateLocalStatus(
      "accepted"
    );

    /*
     * Se accettiamo direttamente
     * dal profilo, aggiorniamo subito
     * anche la parte server.
     */
    router.refresh();

    window.dispatchEvent(
      new Event(
        "friendship-updated"
      )
    );

    setIsLoading(false);
  }

  async function rejectRequest() {
    if (
      !friendshipId ||
      !isRequestReceiver ||
      isLoading
    ) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    const { error } =
      await supabase
        .from("friendships")
        .update({
          status: "rejected",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          friendshipId
        );

    if (error) {
      console.error(
        "Errore rifiuto amicizia:",
        error
      );

      setMessage(
        "Non è stato possibile rifiutare la richiesta."
      );

      setIsLoading(false);
      return;
    }

    updateLocalStatus(
      "rejected"
    );

    router.refresh();

    window.dispatchEvent(
      new Event(
        "friendship-updated"
      )
    );

    setIsLoading(false);
  }

  async function removeFriendship() {
    if (
      !friendshipId ||
      isLoading
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        status === "accepted"
          ? "Vuoi rimuovere questa amicizia?"
          : "Vuoi annullare la richiesta?"
      );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    const { error } =
      await supabase
        .from("friendships")
        .delete()
        .eq(
          "id",
          friendshipId
        );

    if (error) {
      console.error(
        "Errore eliminazione amicizia:",
        error
      );

      setMessage(
        "Non è stato possibile completare l'operazione."
      );

      setIsLoading(false);
      return;
    }

    setFriendshipId(null);
    setRequesterId(null);
    setReceiverId(null);

    updateLocalStatus(
      "none"
    );

    /*
     * Se il profilo era visibile
     * perché eravamo amici,
     * dopo la rimozione deve tornare
     * privato immediatamente.
     */
    router.refresh();

    window.dispatchEvent(
      new Event(
        "friendship-updated"
      )
    );

    setIsLoading(false);
  }

  if (status === "none") {
    return (
      <div>
        <button
          type="button"
          onClick={
            sendRequest
          }
          disabled={
            isLoading
          }
          className="rounded-full bg-[#7C3AED] px-6 py-3 font-bold text-white transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading
            ? "Invio..."
            : "👤+ Aggiungi amico"}
        </button>

        {message && (
          <p className="mt-2 text-sm text-red-400">
            {message}
          </p>
        )}
      </div>
    );
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col items-start gap-2">
        <div className="rounded-full border border-[#7C3AED]/40 bg-[#7C3AED]/10 px-6 py-3 font-bold text-[#C4B5FD]">
          ⏳ Richiesta inviata
        </div>

        <button
          type="button"
          onClick={
            removeFriendship
          }
          disabled={
            isLoading
          }
          className="text-sm font-semibold text-zinc-500 transition hover:text-red-400"
        >
          Annulla richiesta
        </button>
      </div>
    );
  }

  if (
    status === "received"
  ) {
    return (
      <div>
        <p className="mb-3 text-sm font-semibold text-[#C4B5FD]">
          👋 Richiesta di amicizia ricevuta
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={
              acceptRequest
            }
            disabled={
              isLoading
            }
            className="rounded-full bg-[#7C3AED] px-6 py-3 font-bold text-white transition hover:bg-[#2563EB] disabled:opacity-60"
          >
            ✓ Accetta
          </button>

          <button
            type="button"
            onClick={
              rejectRequest
            }
            disabled={
              isLoading
            }
            className="rounded-full border border-zinc-700 px-6 py-3 font-bold text-zinc-300 transition hover:border-red-500/60 hover:text-red-400 disabled:opacity-60"
          >
            Rifiuta
          </button>
        </div>

        {message && (
          <p className="mt-2 text-sm text-red-400">
            {message}
          </p>
        )}
      </div>
    );
  }

  if (
    status === "accepted"
  ) {
    return (
      <div className="flex flex-col items-start gap-2">
        <div className="rounded-full border border-green-500/30 bg-green-500/10 px-6 py-3 font-bold text-green-400">
          ✓ Amici nel Vault
        </div>

        <button
          type="button"
          onClick={
            removeFriendship
          }
          disabled={
            isLoading
          }
          className="text-sm font-semibold text-zinc-500 transition hover:text-red-400"
        >
          Rimuovi amico
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={
        removeFriendship
      }
      disabled={
        isLoading
      }
      className="rounded-full border border-zinc-700 px-6 py-3 font-bold text-zinc-300 transition hover:border-[#7C3AED]"
    >
      Richiesta rifiutata · Rimuovi
    </button>
  );
}