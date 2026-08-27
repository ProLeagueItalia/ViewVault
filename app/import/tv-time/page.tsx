import Navbar from "../../../components/Navbar";
import BackButton from "../../../components/BackButton";
import TVTimeImporter from "../../../components/TVTimeImporter";

export default function TVTimeImportPage() {
  return (
    <main className="min-h-screen bg-[#121212] text-[#F8FAFC]">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-10">
        <BackButton fallbackHref="/account/profile" />

        <div className="mt-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
            Migrazione
          </p>

          <h1 className="mt-3 text-4xl font-bold md:text-6xl">
            Importa da TV Time
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
            Porta con te la tua cronologia di serie TV, episodi visti
            e progressi da un export TV Time.
          </p>
        </div>

        <TVTimeImporter />
      </section>
    </main>
  );
}