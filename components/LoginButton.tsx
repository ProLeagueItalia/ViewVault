"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { createClient } from "../lib/supabase/client";

type AuthMode = "login" | "register";

type OAuthProvider = "google" | "github";

export default function LoginButton() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  const [authMode, setAuthMode] =
    useState<AuthMode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setMounted(true);

    async function loadUser() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error(
          "Errore nel recupero della sessione:",
          error
        );

        setUser(null);
        return;
      }

      setUser(session?.user ?? null);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  function clearMessages() {
    setMessage("");
    setHasError(false);
  }

  function resetForm() {
    setAuthMode("login");
    setEmail("");
    setPassword("");
    setMessage("");
    setHasError(false);
    setIsLoading(false);
  }

  function openModal() {
    resetForm();
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    resetForm();
  }

  function changeAuthMode() {
    setAuthMode((currentMode) =>
      currentMode === "login"
        ? "register"
        : "login"
    );

    setPassword("");
    clearMessages();
  }

  async function loginWithProvider(
    provider: OAuthProvider
  ) {
    setIsLoading(true);
    clearMessages();

    const { error } =
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

    if (error) {
      console.error(
        `Errore login ${provider}:`,
        error
      );

      setMessage(
        provider === "google"
          ? "Non è stato possibile accedere con Google."
          : "Non è stato possibile accedere con GitHub."
      );

      setHasError(true);
      setIsLoading(false);
    }
  }

  async function handleEmailAuth(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    clearMessages();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setMessage("Inserisci email e password.");
      setHasError(true);
      return;
    }

    if (password.length < 6) {
      setMessage(
        "La password deve contenere almeno 6 caratteri."
      );

      setHasError(true);
      return;
    }

    setIsLoading(true);

    if (authMode === "register") {
      await registerWithEmail(cleanEmail);
      return;
    }

    await loginWithEmail(cleanEmail);
  }

  async function registerWithEmail(
    cleanEmail: string
  ) {
    const { data, error } =
      await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

    if (error) {
      console.error(
        "Errore durante la registrazione:",
        error
      );

      setMessage(
        getReadableAuthError(error.message)
      );

      setHasError(true);
      setIsLoading(false);
      return;
    }

    /*
     * Con la conferma email attiva, Supabase crea
     * l'utente ma non genera subito una sessione.
     */
    if (!data.session) {
      setMessage(
        "Account creato. Controlla la tua email e premi il link di conferma, poi torna su ViewVault per accedere."
      );

      setHasError(false);
      setPassword("");
      setIsLoading(false);
      return;
    }

    setUser(data.user);
    setMessage("Account creato correttamente.");
    setHasError(false);
    setIsLoading(false);
    setOpen(false);

    router.refresh();
  }

  async function loginWithEmail(
    cleanEmail: string
  ) {
    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

    if (error) {
      console.error(
        "Errore durante l'accesso con email:",
        error
      );

      setMessage(
        getReadableAuthError(error.message)
      );

      setHasError(true);
      setIsLoading(false);
      return;
    }

    setUser(data.user);
    setIsLoading(false);
    setOpen(false);
    setEmail("");
    setPassword("");

    router.refresh();
  }

  async function sendPasswordReset() {
    clearMessages();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setMessage(
        "Inserisci prima il tuo indirizzo email."
      );

      setHasError(true);
      return;
    }

    setIsLoading(true);

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
        }
      );

    if (error) {
      console.error(
        "Errore recupero password:",
        error
      );

      setMessage(
        getReadableAuthError(error.message)
      );

      setHasError(true);
      setIsLoading(false);
      return;
    }

    setMessage(
      "Ti abbiamo inviato un'email per reimpostare la password."
    );

    setHasError(false);
    setIsLoading(false);
  }

  async function logout() {
    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        "Errore durante il logout:",
        error
      );
      return;
    }

    setUser(null);
    router.refresh();
  }

  const modal =
    mounted && open
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
          >
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-zinc-800 bg-[#121212] p-8 shadow-[0_0_60px_rgba(124,58,237,0.45)]">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#A78BFA]">
                    {authMode === "login"
                      ? "Bentornato"
                      : "Nuovo account"}
                  </p>

                  <h2
                    id="auth-modal-title"
                    className="mt-1 text-2xl font-bold"
                  >
                    {authMode === "login"
                      ? "Accedi a "
                      : "Registrati su "}

                    <span className="text-[#7C3AED]">
                      ViewVault
                    </span>
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Chiudi finestra"
                  className="text-2xl text-zinc-400 transition hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() =>
                    loginWithProvider("google")
                  }
                  disabled={isLoading}
                  className="w-full rounded-full bg-white px-5 py-3 font-bold text-zinc-900 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Continua con Google
                </button>

                <button
                  type="button"
                  onClick={() =>
                    loginWithProvider("github")
                  }
                  disabled={isLoading}
                  className="w-full rounded-full border border-zinc-700 bg-zinc-900 px-5 py-3 font-bold text-white transition hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Continua con GitHub
                </button>
              </div>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-zinc-800" />

                <span className="text-sm text-zinc-500">
                  oppure
                </span>

                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              <form
                onSubmit={handleEmailAuth}
                className="space-y-3"
              >
                <label
                  htmlFor="auth-email"
                  className="sr-only"
                >
                  Email
                </label>

                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    clearMessages();
                  }}
                  placeholder="Email"
                  autoComplete="email"
                  required
                  disabled={isLoading}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 disabled:opacity-60"
                />

                <label
                  htmlFor="auth-password"
                  className="sr-only"
                >
                  Password
                </label>

                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    clearMessages();
                  }}
                  placeholder="Password"
                  autoComplete={
                    authMode === "login"
                      ? "current-password"
                      : "new-password"
                  }
                  minLength={6}
                  required
                  disabled={isLoading}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 disabled:opacity-60"
                />

                {authMode === "register" && (
                  <p className="px-1 text-xs leading-5 text-zinc-500">
                    Usa almeno 6 caratteri. Dopo la
                    registrazione riceverai un’email per
                    confermare l’account.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-full bg-[#7C3AED] px-5 py-3 font-bold text-white transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:bg-zinc-700"
                >
                  {isLoading
                    ? "Attendi..."
                    : authMode === "login"
                      ? "Accedi con email"
                      : "Crea account"}
                </button>
              </form>

              {authMode === "login" && (
                <button
                  type="button"
                  onClick={sendPasswordReset}
                  disabled={isLoading}
                  className="mt-4 w-full text-center text-sm font-semibold text-zinc-500 transition hover:text-[#A78BFA] disabled:opacity-60"
                >
                  Password dimenticata?
                </button>
              )}

              {message && (
                <div
                  role="status"
                  className={`mt-5 rounded-2xl border px-4 py-3 text-sm leading-6 ${
                    hasError
                      ? "border-red-500/30 bg-red-500/10 text-red-300"
                      : "border-green-500/30 bg-green-500/10 text-green-300"
                  }`}
                >
                  {message}
                </div>
              )}

              <div className="mt-6 border-t border-zinc-800 pt-5 text-center">
                <p className="text-sm text-zinc-500">
                  {authMode === "login"
                    ? "Non hai ancora un account?"
                    : "Hai già un account?"}
                </p>

                <button
                  type="button"
                  onClick={changeAuthMode}
                  disabled={isLoading}
                  className="mt-2 text-sm font-bold text-[#A78BFA] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {authMode === "login"
                    ? "Crea un nuovo account"
                    : "Torna all'accesso"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

if (user) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/account"
        title="Gestione account"
        className="hidden rounded-full px-3 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800 hover:text-[#A78BFA] md:block"
      >
        {user.user_metadata?.name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.user_name ||
          user.email ||
          "Utente"}
      </Link>

      <button
        type="button"
        onClick={logout}
        className="rounded-full border border-zinc-700 px-5 py-2 font-semibold text-zinc-200 transition hover:border-[#7C3AED] hover:text-white"
      >
        Logout
      </button>
    </div>
  );
}

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="rounded-full bg-[#7C3AED] px-7 py-3 font-semibold text-white transition hover:bg-[#2563EB]"
      >
        Login
      </button>

      {modal}
    </>
  );
}

function getReadableAuthError(
  errorMessage: string
) {
  const normalizedError =
    errorMessage.toLowerCase();

  if (
    normalizedError.includes(
      "invalid login credentials"
    )
  ) {
    return "Email o password non corretti.";
  }

  if (
    normalizedError.includes(
      "email not confirmed"
    )
  ) {
    return "Devi prima confermare il tuo indirizzo email.";
  }

  if (
    normalizedError.includes(
      "user already registered"
    ) ||
    normalizedError.includes(
      "already been registered"
    )
  ) {
    return "Esiste già un account associato a questa email.";
  }

  if (
    normalizedError.includes(
      "signup is disabled"
    )
  ) {
    return "La creazione di nuovi account è momentaneamente disattivata.";
  }

  if (
    normalizedError.includes("password")
  ) {
    return "La password non rispetta i requisiti richiesti.";
  }

  if (
    normalizedError.includes("rate limit") ||
    normalizedError.includes(
      "too many requests"
    )
  ) {
    return "Hai effettuato troppi tentativi. Attendi qualche minuto e riprova.";
  }

  if (
    normalizedError.includes(
      "email rate limit exceeded"
    )
  ) {
    return "Sono state inviate troppe email. Attendi qualche minuto prima di riprovare.";
  }

  return `Errore di autenticazione: ${errorMessage}`;
}