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
    <main className="min-h-screen overflow-x-hidden bg-[#121212] text-[#F8FAFC]">
      <Navbar />

      <section className="flex min-h-[85vh] w-full min-w-0 flex-col items-center justify-center overflow-hidden px-4 pt-28 text-center sm:px-6 sm:pt-32">
        <div className="w-full min-w-0 max-w-[820px] px-2">
          <Image
            src="/viewvault-logo-new.png"
            alt="ViewVault"
            width={900}
            height={320}
            priority
            className="mx-auto mb-4 block h-auto max-h-[220px] w-full min-w-0 max-w-full object-contain drop-shadow-[0_0_45px_rgba(124,58,237,0.45)]"
          />
        </div>

        <p className="mx-auto mt-4 w-full max-w-2xl px-1 text-base leading-7 text-zinc-300 sm:text-lg md:text-2xl md:leading-9">
          Tieni traccia di film e serie TV, conta le ore viste, vota,
          recensisci e costruisci il tuo Vault personale.
        </p>

        {isLoggedIn ? (
          <div className="mt-10 flex w-full max-w-xl min-w-0 flex-col gap-4 sm:w-auto sm:max-w-none sm:flex-row">
            <Link
              href="/import/tv-time"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#7C3AED] px-5 py-4 text-base font-semibold text-white shadow-[0_0_30px_rgba(124,58,237,0.5)] transition hover:bg-[#6D28D9] sm:w-auto sm:px-8 sm:text-lg"
            >
              <span aria-hidden="true">📥</span>
              Importa da TV Time
            </Link>

            <Link
              href="/ricerca"
              className="inline-flex w-full items-center justify-center rounded-full border border-zinc-700 px-5 py-4 text-base font-semibold text-zinc-200 transition hover:border-[#7C3AED] hover:bg-[#7C3AED]/10 hover:text-white sm:w-auto sm:px-8 sm:text-lg"
            >
              + Aggiungi contenuti
            </Link>
          </div>
        ) : (
          <div className="mt-10 flex w-full max-w-xl min-w-0 flex-col gap-4 sm:w-auto sm:max-w-none sm:flex-row">
            <Link
              href="/account"
              className="inline-flex w-full items-center justify-center rounded-full bg-[#7C3AED] px-5 py-4 text-base font-semibold text-white shadow-[0_0_30px_rgba(124,58,237,0.5)] transition hover:bg-[#6D28D9] sm:w-auto sm:px-8 sm:text-lg"
            >
              Inizia ora
            </Link>

            <Link
              href="/ricerca"
              className="inline-flex w-full items-center justify-center rounded-full border border-zinc-700 px-5 py-4 text-base font-semibold text-zinc-200 transition hover:border-[#7C3AED] hover:text-white sm:w-auto sm:px-8 sm:text-lg"
            >
              Esplora ViewVault
            </Link>
          </div>
        )}

        <form
          action="/ricerca"
          method="GET"
          className="mt-12 flex w-full max-w-3xl min-w-0 flex-col gap-4 sm:flex-row"
        >
          <input
            type="search"
            name="q"
            placeholder="🔎 Cerca un film o una serie TV..."
            autoComplete="off"
            className="min-w-0 flex-1 rounded-full border border-zinc-700 bg-zinc-900 px-5 py-4 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/20 sm:px-6 sm:text-lg"
          />

          <button
            type="submit"
            className="w-full rounded-full bg-[#7C3AED] px-8 py-4 text-base font-semibold text-white transition hover:bg-[#6D28D9] hover:shadow-[0_0_25px_rgba(124,58,237,0.4)] sm:w-auto sm:text-lg"
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