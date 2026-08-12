"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "../../lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isCheckingSession, setIsCheckingSession] =
    useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error(
          "Errore nel recupero della sessione:",
          error
        );

        setMessage(
          "Non è stato possibile verificare la sessione."
        );
        setHasError(true);
        setIsCheckingSession(false);
        return;
      }

      if (!session) {
        setMessage(
          "Il link di recupero non è valido oppure è scaduto. Richiedi una nuova email per reimpostare la password."
        );
        setHasError(true);
        setIsCheckingSession(false);
        return;
      }

      setIsCheckingSession(false);
    }

    checkSession();
  }, [supabase]);

  async function handleUpdatePassword(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setHasError(false);

    if (!newPassword || !confirmPassword) {
      setMessage("Compila entrambi i campi.");
      setHasError(true);
      return;
    }

    if (newPassword.length < 6) {
      setMessage(
        "La nuova password deve contenere almeno 6 caratteri."
      );
      setHasError(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Le password non coincidono.");
      setHasError(true);
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error(
        "Errore durante l'aggiornamento della password:",
        error
      );

      const errorMessage = error.message.toLowerCase();

      if (
        errorMessage.includes(
          "new password should be different from the old password"
        ) ||
        errorMessage.includes(
          "password should be different"
        )
      ) {
        setMessage(
          "La nuova password deve essere diversa da quella precedente."
        );
      } else if (
        errorMessage.includes("expired") ||
        errorMessage.includes("otp_expired") ||
        errorMessage.includes("invalid")
      ) {
        setMessage(
          "Il link di recupero non è più valido oppure è scaduto. Richiedi una nuova email per reimpostare la password."
        );
      } else if (
        errorMessage.includes("password")
      ) {
        setMessage(
          "La nuova password non rispetta i requisiti richiesti."
        );
      } else {
        setMessage(
          "Non è stato possibile aggiornare la password. Riprova tra poco."
        );
      }

      setHasError(true);
      setIsLoading(false);
      return;
    }

    setMessage(
      "Password aggiornata correttamente. Ora puoi accedere a ViewVault con la nuova password."
    );
    setHasError(false);
    setIsLoading(false);

    setNewPassword("");
    setConfirmPassword("");

    setTimeout(() => {
      router.push("/");
    }, 2500);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#121212] px-4 text-[#F8FAFC]">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-[#18181B] p-8 shadow-[0_0_60px_rgba(124,58,237,0.25)]">
        <div className="mb-8">
          <div className="text-3xl font-bold text-white">
            View
            <span className="text-[#8B5CF6]">
              Vault
            </span>
          </div>

          <p className="mt-2 text-sm text-zinc-500">
            Every Story. Every Screen. One Vault.
          </p>
        </div>

        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
          Sicurezza account
        </p>

        <h1 className="mt-2 text-3xl font-bold text-white">
          Reimposta la password
        </h1>

        <p className="mt-4 leading-7 text-zinc-400">
          Scegli una nuova password per il tuo account
          ViewVault.
        </p>

        {isCheckingSession ? (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-sm text-zinc-400">
            Verifica del link di recupero...
          </div>
        ) : hasError && !newPassword && !confirmPassword ? (
          <>
            <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm leading-6 text-red-300">
              {message}
            </div>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-6 w-full rounded-full border border-zinc-700 px-5 py-3 font-bold text-white transition hover:border-[#7C3AED]"
            >
              Torna a ViewVault
            </button>
          </>
        ) : (
          <form
            onSubmit={handleUpdatePassword}
            className="mt-8 space-y-4"
          >
            <div>
              <label
                htmlFor="new-password"
                className="mb-2 block text-sm font-semibold text-zinc-300"
              >
                Nuova password
              </label>

              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setMessage("");
                  setHasError(false);
                }}
                placeholder="Inserisci la nuova password"
                autoComplete="new-password"
                minLength={6}
                disabled={isLoading}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-semibold text-zinc-300"
              >
                Conferma nuova password
              </label>

              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setMessage("");
                  setHasError(false);
                }}
                placeholder="Ripeti la nuova password"
                autoComplete="new-password"
                minLength={6}
                disabled={isLoading}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-[#7C3AED] px-5 py-3 font-bold text-white transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:bg-zinc-700"
            >
              {isLoading
                ? "Aggiornamento..."
                : "Aggiorna password"}
            </button>

            {message && (
              <div
                role="status"
                className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                  hasError
                    ? "border-red-500/30 bg-red-500/10 text-red-300"
                    : "border-green-500/30 bg-green-500/10 text-green-300"
                }`}
              >
                {message}
              </div>
            )}
          </form>
        )}
      </div>
    </main>
  );
}