import Navbar from "../../components/Navbar";
import BackButton from "../../components/BackButton";

const features = [
  {
    icon: "💬",
    title: "Chat",
    description:
      "Conversa in tempo reale con altri appassionati di cinema e serie TV.",
  },
  {
    icon: "🎬",
    title: "Canali",
    description:
      "Crea e segui spazi dedicati a film, serie, generi e argomenti specifici.",
  },
  {
    icon: "👥",
    title: "Gruppi",
    description:
      "Costruisci community private o pubbliche con altri utenti ViewVault.",
  },
  {
    icon: "🍿",
    title: "Consigli & discussioni",
    description:
      "Condividi ciò che stai guardando, commenta e scopri nuovi titoli attraverso la Community.",
  },
];

export default function CommunityPage() {
  return (
    <main className="min-h-screen bg-[#121212] text-[#F8FAFC]">
      <Navbar />

<section className="mx-auto max-w-6xl px-6 pb-24 pt-6">
  {/* PULSANTE INDIETRO */}
  <div className="mb-8">
    <BackButton fallbackHref="/" />
  </div>

  {/* HERO */}
        <div className="overflow-hidden rounded-[2rem] border border-[#7C3AED]/30 bg-gradient-to-br from-[#24153A] via-[#18181B] to-[#111827] p-8 md:p-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-[#7C3AED]/40 bg-[#7C3AED]/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-[#C4B5FD]">
              Prossimamente
            </div>

            <p className="mt-8 text-sm font-bold uppercase tracking-[0.22em] text-[#A78BFA]">
              ViewVault Community
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">
              Il cinema è più bello insieme.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300 md:text-xl">
              Un nuovo spazio dove incontrare altri appassionati,
              parlare di film e serie TV, creare canali, condividere
              consigli e vivere ViewVault insieme alla Community.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <span className="rounded-full border border-zinc-700 bg-black/20 px-4 py-2 text-sm font-semibold text-zinc-300">
              Chat
            </span>

            <span className="rounded-full border border-zinc-700 bg-black/20 px-4 py-2 text-sm font-semibold text-zinc-300">
              Canali
            </span>

            <span className="rounded-full border border-zinc-700 bg-black/20 px-4 py-2 text-sm font-semibold text-zinc-300">
              Gruppi
            </span>

            <span className="rounded-full border border-zinc-700 bg-black/20 px-4 py-2 text-sm font-semibold text-zinc-300">
              Discussioni
            </span>
          </div>
        </div>

        {/* FUNZIONALITÀ */}
        <section className="mt-12">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#8B5CF6]">
            In arrivo
          </p>

          <h2 className="mt-2 text-3xl font-bold text-white">
            Uno spazio costruito per la Community
          </h2>

          <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
            La Community di ViewVault crescerà nel tempo con strumenti
            pensati per mettere in contatto utenti con gusti, passioni
            e visioni in comune.
          </p>

          <div className="mt-7 grid gap-5 md:grid-cols-2">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-3xl border border-zinc-800 bg-[#18181B] p-7 transition hover:border-[#7C3AED]/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="text-3xl">
                    {feature.icon}
                  </div>

                  <span className="rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#C4B5FD]">
                    In arrivo
                  </span>
                </div>

                <h3 className="mt-6 text-xl font-bold text-white">
                  {feature.title}
                </h3>

                <p className="mt-3 leading-7 text-zinc-400">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* PRO */}
        <section className="mt-10 overflow-hidden rounded-3xl border border-[#7C3AED]/40 bg-[#7C3AED]/10 p-7 md:p-9">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
                ViewVault Pro
              </p>

              <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">
                Più spazio per vivere la Community.
              </h2>

              <p className="mt-4 leading-7 text-zinc-300">
                Alcune funzionalità avanzate della Community potranno
                essere riservate ai futuri piani ViewVault Pro o
                Premium. Prezzi e caratteristiche verranno definiti
                più avanti, quando il servizio sarà pronto.
              </p>
            </div>

            <div className="shrink-0 rounded-3xl border border-[#7C3AED]/30 bg-black/20 px-6 py-5 text-center">
              <div className="text-3xl">
                ✨
              </div>

              <p className="mt-2 font-bold text-white">
                Pro / Premium
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                Dettagli in arrivo
              </p>
            </div>
          </div>
        </section>

        {/* AMICIZIE */}
        <section className="mt-10 rounded-3xl border border-zinc-800 bg-[#18181B] p-7 md:p-9">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
            Nel frattempo
          </p>

          <h2 className="mt-2 text-2xl font-bold text-white">
            Le amicizie sono già attive.
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-zinc-400">
            Puoi già aggiungere altri utenti, ricevere richieste di
            amicizia, accettarle dalla campanella delle notifiche e
            visitare i profili dei tuoi amici.
          </p>

          <p className="mt-4 text-sm font-semibold text-[#C4B5FD]">
            La gestione completa degli amici arriverà direttamente nel
            tuo profilo personale.
          </p>
        </section>
      </section>
    </main>
  );
}
