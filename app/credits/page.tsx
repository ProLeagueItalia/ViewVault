import Image from "next/image";
import Navbar from "../../components/Navbar";

export default function CreditsPage() {
  return (
    <main className="min-h-screen bg-[#121212] text-[#F8FAFC]">
      <Navbar />

      <section className="mx-auto max-w-4xl px-6 pb-24 pt-32">
        {/* HEADER */}
        <div className="mb-12">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8B5CF6]">
            Informazioni
          </p>

          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            Credits &amp; Attributions
          </h1>

          <p className="mt-5 text-lg leading-8 text-zinc-400">
            ViewVault utilizza servizi e tecnologie di terze parti per
            offrire informazioni su film e serie TV e alcune funzionalità
            della piattaforma.
          </p>

          <p className="mt-3 text-sm text-zinc-500">
            Ultimo aggiornamento: 11 agosto 2026
          </p>
        </div>

        <div className="space-y-12 leading-8 text-zinc-300">
          {/* TMDB */}
          <section>
            <h2 className="text-2xl font-bold text-white">
              1. The Movie Database (TMDB)
            </h2>

            <p className="mt-4">
              ViewVault utilizza l&apos;API di The Movie Database (TMDB)
              per ottenere informazioni relative a film e serie TV,
              inclusi titoli, descrizioni, immagini, poster, date di
              uscita e altri metadati.
            </p>

            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">

              {/* LOGO TMDB */}
              <div className="mb-6">
                <Image
                  src="/TMDB.svg"
                  alt="The Movie Database (TMDB)"
                  width={180}
                  height={72}
                  className="h-auto w-[180px]"
                />
              </div>

              <p className="font-semibold text-white">
                TMDB Attribution
              </p>

              <p className="mt-3">
                This product uses the TMDB API but is not endorsed or
                certified by TMDB.
              </p>

              <p className="mt-4 text-sm text-zinc-500">
                The Movie Database (TMDB) è un servizio esterno e non è
                affiliato a ViewVault.
              </p>

              <a
                href="https://www.themoviedb.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-block font-semibold text-[#A78BFA] transition hover:text-white"
              >
                Visita The Movie Database ↗
              </a>
            </div>
          </section>

          {/* YOUTUBE */}
          <section>
            <h2 className="text-2xl font-bold text-white">
              2. YouTube
            </h2>

            <p className="mt-4">
              ViewVault può mostrare trailer e altri contenuti video
              provenienti da YouTube attraverso player incorporati.
            </p>

            <p className="mt-4">
              I contenuti video, i relativi marchi e gli altri materiali
              appartengono ai rispettivi titolari. ViewVault non ospita
              direttamente tali contenuti video.
            </p>
          </section>

          {/* SUPABASE */}
          <section>
            <h2 className="text-2xl font-bold text-white">
              3. Supabase
            </h2>

            <p className="mt-4">
              ViewVault utilizza Supabase per alcune funzionalità
              infrastrutturali della piattaforma, tra cui autenticazione,
              gestione degli account e archiviazione dei dati associati
              agli utenti.
            </p>
          </section>

          {/* VERCEL */}
          <section>
            <h2 className="text-2xl font-bold text-white">
              4. Vercel
            </h2>

            <p className="mt-4">
              L&apos;applicazione web ViewVault utilizza servizi
              infrastrutturali e di hosting forniti da Vercel.
            </p>
          </section>

          {/* GOOGLE + GITHUB */}
          <section>
            <h2 className="text-2xl font-bold text-white">
              5. Servizi di autenticazione esterni
            </h2>

            <p className="mt-4">
              ViewVault può consentire agli utenti di autenticarsi
              attraverso provider esterni, tra cui Google e GitHub.
            </p>

            <p className="mt-4">
              L&apos;utilizzo di tali servizi è soggetto alle rispettive
              condizioni e informative sulla privacy.
            </p>
          </section>

          {/* TRADEMARK */}
          <section>
            <h2 className="text-2xl font-bold text-white">
              6. Marchi e contenuti di terze parti
            </h2>

            <p className="mt-4">
              Tutti i nomi, marchi, loghi, immagini e altri elementi
              appartenenti a servizi o soggetti terzi rimangono di
              proprietà dei rispettivi titolari.
            </p>

            <p className="mt-4">
              La loro presenza su ViewVault ha esclusivamente finalità
              informative, tecniche o di identificazione dei servizi
              utilizzati e non implica necessariamente sponsorizzazione,
              approvazione o affiliazione.
            </p>
          </section>

          {/* VIEWVAULT */}
          <section>
            <h2 className="text-2xl font-bold text-white">
              7. ViewVault
            </h2>

            <div className="mt-5 rounded-2xl border border-[#7C3AED]/30 bg-[#7C3AED]/10 p-6">
              <p className="text-xl font-bold text-white">
                View<span className="text-[#8B5CF6]">Vault</span>
              </p>

              <p className="mt-3">
                Every Story. Every Screen. One Vault.
              </p>

              <p className="mt-4">
                Progetto ideato e sviluppato da Emanuele Starnoni.
              </p>

              <p className="mt-4">
                Contatti:{" "}
                <a
                  href="mailto:info@viewvault.it"
                  className="font-semibold text-[#A78BFA] transition hover:text-white"
                >
                  info@viewvault.it
                </a>
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}