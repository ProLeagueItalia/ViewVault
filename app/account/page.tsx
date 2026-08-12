"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import Navbar from "../../components/Navbar";
import { createClient } from "../../lib/supabase/client";

export default function AccountPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState("");
const [profileDisplayName, setProfileDisplayName] = useState("");
const [bio, setBio] = useState("");
const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);

const [isSavingProfile, setIsSavingProfile] = useState(false);
const [profileMessage, setProfileMessage] = useState("");
const [profileHasError, setProfileHasError] = useState(false);

  useEffect(() => {
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
        setIsLoading(false);
        return;
      }

      if (!session?.user) {
        router.push("/");
        return;
      }

      setUser(session.user);
      const { data: profile, error: profileError } =
  await supabase
    .from("profiles")
    .select("username, display_name, bio, favorite_genres")
    .eq("id", session.user.id)
    .single();

if (profileError) {
  console.error(
    "Errore nel recupero del profilo:",
    profileError
  );
} else if (profile) {
  setUsername(profile.username ?? "");
  setProfileDisplayName(profile.display_name ?? "");
  setBio(profile.bio ?? "");
  setFavoriteGenres(profile.favorite_genres ?? []);
}
      setIsLoading(false);
    }

    loadUser();
  }, [router, supabase]);

  const displayName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.user_name ||
    "Utente ViewVault";

  const provider =
    user?.app_metadata?.provider || "email";

    async function saveProfile() {
  if (!user) {
    return;
  }

  setProfileMessage("");
  setProfileHasError(false);

  const cleanUsername = username.trim().toLowerCase();
  const cleanDisplayName = profileDisplayName.trim();
  const cleanBio = bio.trim();

  if (!cleanUsername) {
    setProfileMessage("Inserisci uno username.");
    setProfileHasError(true);
    return;
  }

  if (cleanUsername.length < 3) {
    setProfileMessage(
      "Lo username deve contenere almeno 3 caratteri."
    );
    setProfileHasError(true);
    return;
  }

  setIsSavingProfile(true);

  const { error } = await supabase
    .from("profiles")
    .update({
      username: cleanUsername,
      display_name: cleanDisplayName || null,
      bio: cleanBio || null,
      favorite_genres: favoriteGenres,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error(
      "Errore durante il salvataggio del profilo:",
      error
    );

    setProfileMessage(
      error.code === "23505"
        ? "Questo username è già utilizzato."
        : "Non è stato possibile salvare il profilo."
    );

    setProfileHasError(true);
    setIsSavingProfile(false);
    return;
  }

  setUsername(cleanUsername);
  setProfileDisplayName(cleanDisplayName);
  setBio(cleanBio);

  setProfileMessage(
    "Profilo aggiornato correttamente."
  );
  setProfileHasError(false);
  setIsSavingProfile(false);
}

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#121212] text-[#F8FAFC]">
        <Navbar />

        <section className="mx-auto max-w-5xl px-6 pb-24 pt-32">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 text-zinc-400">
            Caricamento account...
          </div>
        </section>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#121212] text-[#F8FAFC]">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 pb-24 pt-32">
        {/* HEADER */}
        <div className="mb-12">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8B5CF6]">
            Impostazioni
          </p>

          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            Gestione Account
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-400">
            Gestisci il tuo account ViewVault, la sicurezza,
            il profilo personale e le preferenze di privacy.
          </p>
        </div>

        <div className="space-y-8">
          {/* ACCOUNT */}
          <section className="rounded-3xl border border-zinc-800 bg-[#18181B] p-6 md:p-8">
            <div className="mb-6">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
                Account
              </p>

              <h2 className="mt-2 text-2xl font-bold text-white">
                Informazioni account
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
                <p className="text-sm text-zinc-500">
                  Nome
                </p>

                <p className="mt-2 font-semibold text-white">
                  {displayName}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
                <p className="text-sm text-zinc-500">
                  Email
                </p>

                <p className="mt-2 break-all font-semibold text-white">
                  {user.email}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
                <p className="text-sm text-zinc-500">
                  Metodo di accesso
                </p>

                <p className="mt-2 font-semibold capitalize text-white">
                  {provider}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
                <p className="text-sm text-zinc-500">
                  ID account
                </p>

                <p className="mt-2 truncate font-mono text-sm text-zinc-300">
                  {user.id}
                </p>
              </div>
            </div>
          </section>

          {/* SICUREZZA */}
          <section className="rounded-3xl border border-zinc-800 bg-[#18181B] p-6 md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
                  Sicurezza
                </p>

                <h2 className="mt-2 text-2xl font-bold text-white">
                  Password e accesso
                </h2>

                <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
                  Mantieni sicuro il tuo account e aggiorna la
                  password quando necessario.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push("/update-password")
                }
                className="rounded-full bg-[#7C3AED] px-6 py-3 font-bold text-white transition hover:bg-[#2563EB]"
              >
                Cambia password
              </button>
            </div>
          </section>

         {/* PROFILO */}
<section className="rounded-3xl border border-[#7C3AED]/30 bg-[#7C3AED]/10 p-6 md:p-8">
  <div className="mb-8">
    <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
      Profilo ViewVault
    </p>

    <h2 className="mt-2 text-2xl font-bold text-white">
      Parlaci di te
    </h2>

    <p className="mt-3 max-w-2xl leading-7 text-zinc-300">
      Personalizza il tuo profilo. Queste informazioni saranno la base
      della tua identità nella futura Community di ViewVault.
    </p>
  </div>

  <div className="space-y-5">
    {/* USERNAME */}
    <div>
      <label
        htmlFor="username"
        className="mb-2 block text-sm font-semibold text-zinc-300"
      >
        Username
      </label>

      <input
        id="username"
        type="text"
        value={username}
        onChange={(event) => {
          setUsername(event.target.value);
          setProfileMessage("");
          setProfileHasError(false);
        }}
        placeholder="Il tuo username"
        disabled={isSavingProfile}
        className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 disabled:opacity-60"
      />

      <p className="mt-2 text-xs text-zinc-500">
        Sarà il tuo nome univoco all&apos;interno di ViewVault.
      </p>
    </div>

    {/* NOME VISUALIZZATO */}
    <div>
      <label
        htmlFor="display-name"
        className="mb-2 block text-sm font-semibold text-zinc-300"
      >
        Nome visualizzato
      </label>

      <input
        id="display-name"
        type="text"
        value={profileDisplayName}
        onChange={(event) => {
          setProfileDisplayName(event.target.value);
          setProfileMessage("");
          setProfileHasError(false);
        }}
        placeholder="Come vuoi essere chiamato?"
        disabled={isSavingProfile}
        className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 disabled:opacity-60"
      />
    </div>

    {/* GENERI PREFERITI */}
<div>
  <p className="mb-3 text-sm font-semibold text-zinc-300">
    Generi preferiti
  </p>

  <div className="flex flex-wrap gap-3">
    {[
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
    ].map((genre) => {
      const isSelected = favoriteGenres.includes(genre);

      return (
        <button
          key={genre}
          type="button"
          onClick={() => {
            setFavoriteGenres((currentGenres) =>
              currentGenres.includes(genre)
                ? currentGenres.filter(
                    (currentGenre) => currentGenre !== genre
                  )
                : [...currentGenres, genre]
            );

            setProfileMessage("");
            setProfileHasError(false);
          }}
          disabled={isSavingProfile}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            isSelected
              ? "border-[#7C3AED] bg-[#7C3AED] text-white"
              : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-[#7C3AED] hover:text-white"
          }`}
        >
          {genre}
        </button>
      );
    })}
  </div>

  <p className="mt-3 text-xs text-zinc-500">
    Seleziona uno o più generi che ami guardare.
  </p>
</div>

    {/* BIO */}
    <div>
      <label
        htmlFor="bio"
        className="mb-2 block text-sm font-semibold text-zinc-300"
      >
        Parlaci di te
      </label>

      <textarea
        id="bio"
        value={bio}
        onChange={(event) => {
          setBio(event.target.value);
          setProfileMessage("");
          setProfileHasError(false);
        }}
        placeholder="Racconta qualcosa di te e dei tuoi gusti..."
        rows={4}
        maxLength={300}
        disabled={isSavingProfile}
        className="w-full resize-none rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 disabled:opacity-60"
      />

      <p className="mt-2 text-right text-xs text-zinc-500">
        {bio.length}/300
      </p>
    </div>

    {/* MESSAGGIO */}
    {profileMessage && (
      <div
        className={`rounded-2xl border px-4 py-3 text-sm ${
          profileHasError
            ? "border-red-500/30 bg-red-500/10 text-red-300"
            : "border-green-500/30 bg-green-500/10 text-green-300"
        }`}
      >
        {profileMessage}
      </div>
    )}

    {/* SALVA */}
    <div className="flex justify-end pt-2">
      <button
        type="button"
        onClick={saveProfile}
        disabled={isSavingProfile}
        className="rounded-full bg-[#7C3AED] px-7 py-3 font-bold text-white transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:bg-zinc-700"
      >
        {isSavingProfile ? "Salvataggio..." : "Salva profilo"}
      </button>
    </div>
  </div>
</section>

          {/* PRIVACY */}
          <section className="rounded-3xl border border-zinc-800 bg-[#18181B] p-6 md:p-8">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
                Privacy
              </p>

              <h2 className="mt-2 text-2xl font-bold text-white">
                Visibilità del profilo
              </h2>

              <p className="mt-3 max-w-3xl leading-7 text-zinc-400">
                Quando attiveremo i profili pubblici potrai
                scegliere chi può vedere attività, preferiti,
                statistiche, recensioni e altri elementi del tuo Vault.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
              <p className="font-semibold text-white">
                Impostazione attuale
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                Profilo privato fino all&apos;attivazione delle
                funzionalità Community.
              </p>
            </div>
          </section>

          {/* ZONA PERICOLOSA */}
          <section className="rounded-3xl border border-red-500/30 bg-red-500/5 p-6 md:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-400">
              Zona pericolosa
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">
              Eliminazione account
            </h2>

            <p className="mt-3 max-w-3xl leading-7 text-zinc-400">
              L&apos;eliminazione dell&apos;account rimuoverà
              definitivamente il tuo profilo ViewVault e i dati
              personali associati secondo le regole che configureremo
              nel database.
            </p>

            <button
              type="button"
              disabled
              className="mt-6 cursor-not-allowed rounded-full border border-red-500/40 px-6 py-3 font-bold text-red-300 opacity-60"
            >
              Elimina account
            </button>
          </section>
        </div>
      </section>
    </main>
  );
}