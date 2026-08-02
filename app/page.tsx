import Image from "next/image";
import Navbar from "../components/Navbar";
import StatsCards from "../components/StatsCards";
import NewMovies from "../components/NewMovies";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#121212] text-[#F8FAFC]">
      <Navbar />

      <section className="flex min-h-[85vh] flex-col items-center justify-center px-6 pt-32 text-center">
        <Image
          src="/viewvault-logo.svg"
          alt="ViewVault logo"
          width={170}
          height={170}
          priority
          className="mb-8 drop-shadow-[0_0_35px_rgba(124,58,237,0.8)]"
        />

        <h1 className="text-5xl font-bold tracking-tight md:text-7xl">
          View<span className="text-[#7C3AED]">Vault</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg text-zinc-300 md:text-2xl">
          Tieni traccia di film e serie TV, conta le ore viste, vota,
          recensisci e costruisci il tuo Vault personale.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <button className="rounded-full bg-[#7C3AED] px-8 py-4 text-lg font-semibold text-white shadow-[0_0_30px_rgba(124,58,237,0.5)] transition hover:bg-[#2563EB]">
            Inizia ora
          </button>

          <button className="rounded-full border border-zinc-700 px-8 py-4 text-lg font-semibold text-zinc-200 transition hover:border-[#7C3AED] hover:text-white">
            Scopri di più
          </button>
        </div>

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

      <NewMovies />
    </main>
  );
}