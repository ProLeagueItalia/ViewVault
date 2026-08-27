import Image from "next/image";
import Link from "next/link";

import Navbar from "../components/Navbar";
import StatsCards from "../components/StatsCards";
import MostWatchedNow from "../components/MostWatchedNow";
import NewMovies from "../components/NewMovies";
import NewSeries from "../components/NewSeries";

import { createClient } from "../lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = Boolean(user);

  return (
    <main className="min-h-screen bg-[#121212] text-[#F8FAFC]">
      <Navbar />

      <section className="flex min-h-[85vh] flex-col items-center justify-center px-6 pt-32 text-center">
        <Image
          src="/viewvault-logo-new.png"
          alt="ViewVault"
          width={900}
          height={320}
          priority
          className="mb-4 h-auto w-full max-w-[720px] object-contain drop-shadow-[0_0_45px_rgba(124,58,237,0.45)] md:max-w-[820px]"
        />

        <p className="mt-4 max-w-2xl text-lg text-zinc-300 md:text-2xl">
          Tieni traccia di film e serie TV, conta
          le ore viste, vota, recensisci e
          costruisci il tuo Vault personale.
        </p>

        {isLoggedIn ? (
          <div className="mt-10 flex w-full max-w-xl flex-col gap-4 sm:w-auto sm:max-w-none sm:flex-row">
            <Link
              href="/import/tv-time"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#7C3AED] px-8 py-4 text-lg font-semibold text-white shadow-[0_0_30px_rgba(124,58,237,0.5)] transition hover:bg-[#6D28D9]"
            >
              <span aria-hidden="true">📥</span>
              Importa da TV Time
            </Link>

            <Link
              href="/ricerca"
              className="inline-flex items-center justify-center rounded-full border border-zinc-700 px-8 py-4 text-lg font-semibold text-zinc-200 transition hover:border-[#7C3AED] hover:bg-[#7C3AED]/10 hover:text-white"
            >
              + Aggiungi contenuti
            </Link>
          </div>
        ) : (
          <div className="mt-10 flex w-full max-w-xl flex-col gap-4 sm:w-auto sm:max-w-none sm:flex-row">
            <Link
              href="/account"
              className="inline-flex items-center justify-center rounded-full bg-[#7C3AED] px-8 py-4 text-lg font-semibold text-white shadow-[0_0_30px_rgba(124,58,237,0.5)] transition hover:bg-[#6D28D9]"
            >
              Inizia ora
            </Link>

            <Link
              href="/ricerca"
              className="inline-flex items-center justify-center rounded-full border border-zinc-700 px-8 py-4 text-lg font-semibold text-zinc-200 transition hover:border-[#7C3AED] hover:text-white"
            >
              Esplora ViewVault
            </Link>
          </div>
        )}

        {/* Barra di ricerca */}
        <form
          action="/ricerca"
          method="GET"
          className="mt-12 flex w-full max-w-3xl flex-col gap-4 sm:flex-row"
        >
          <input
            type="search"
            name="q"
            placeholder="🔎 Cerca un film o una serie TV..."
            autoComplete="off"
            className="flex-1 rounded-full border border-zinc-700 bg-zinc-900 px-6 py-4 text-lg text-white outline-none transition placeholder:text-zinc-500 focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/20"
          />

          <button
            type="submit"
            className="rounded-full bg-[#7C3AED] px-8 py-4 text-lg font-semibold text-white transition hover:bg-[#6D28D9] hover:shadow-[0_0_25px_rgba(124,58,237,0.4)]"
          >
            Cerca
          </button>
        </form>
      </section>

      <StatsCards />

      <MostWatchedNow />

      <NewMovies />

      <NewSeries />
    </main>
  );
}