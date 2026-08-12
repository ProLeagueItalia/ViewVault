import Navbar from "../../components/Navbar";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#121212] text-[#F8FAFC]">
      <Navbar />

      <section className="mx-auto max-w-4xl px-6 pb-24 pt-32">
        <div className="mb-12">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8B5CF6]">
            Informazioni legali
          </p>

          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            Privacy Policy
          </h1>

          <p className="mt-5 text-lg leading-8 text-zinc-400">
            Questa informativa descrive come ViewVault
            tratta i dati personali degli utenti durante
            l&apos;utilizzo del sito e dei relativi servizi.
          </p>

          <p className="mt-3 text-sm text-zinc-500">
            Ultimo aggiornamento: 11 agosto 2026
          </p>
        </div>

        <div className="space-y-12 leading-8 text-zinc-300">
          <section>
            <h2 className="text-2xl font-bold text-white">
              1. Titolare del trattamento
            </h2>

            <p className="mt-4">
              Il Titolare del trattamento dei dati personali
              raccolti attraverso ViewVault è:
            </p>

            <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
              <p>
                <strong className="text-white">
                  Emanuele Starnoni
                </strong>
              </p>

              <p className="mt-2">
                Email:{" "}
                <a
                  href="mailto:info@viewvault.it"
                  className="font-semibold text-[#8B5CF6] transition hover:text-[#A78BFA]"
                >
                  info@viewvault.it
                </a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">
              2. Dati trattati
            </h2>

            <p className="mt-4">
              ViewVault può trattare le seguenti categorie
              di dati:
            </p>

            <ul className="mt-4 list-disc space-y-3 pl-6">
              <li>
                dati necessari alla registrazione e
                autenticazione dell&apos;account, come
                indirizzo email e identificativo utente;
              </li>

              <li>
                eventuali informazioni di base fornite dal
                provider utilizzato per l&apos;accesso tramite
                Google o GitHub;
              </li>

              <li>
                film e serie TV aggiunti al Vault personale;
              </li>

              <li>
                stato dei contenuti, ad esempio da vedere,
                in corso o visto;
              </li>

              <li>
                preferenze relative ai contenuti salvati;
              </li>

              <li>
                voti e recensioni inseriti volontariamente
                dall&apos;utente;
              </li>

              <li>
                informazioni relative agli episodi delle
                serie TV segnati come visti e al relativo
                progresso;
              </li>

              <li>
                dati tecnici strettamente necessari al
                funzionamento, alla sicurezza e
                all&apos;autenticazione del servizio.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">
              3. Finalità del trattamento
            </h2>

            <p className="mt-4">
              I dati vengono trattati per consentire il
              funzionamento delle funzionalità di ViewVault
              richieste dall&apos;utente, tra cui:
            </p>

            <ul className="mt-4 list-disc space-y-3 pl-6">
              <li>
                creare e gestire l&apos;account;
              </li>

              <li>
                autenticare l&apos;utente e mantenere attiva
                la sessione;
              </li>

              <li>
                creare e mantenere il Vault personale;
              </li>

              <li>
                memorizzare preferiti, stati di visione,
                voti e recensioni;
              </li>

              <li>
                registrare il progresso delle serie TV e
                degli episodi visti;
              </li>

              <li>
                mostrare statistiche personali basate
                sull&apos;attività dell&apos;utente;
              </li>

              <li>
                garantire sicurezza, stabilità e corretto
                funzionamento del servizio;
              </li>

              <li>
                rispondere a eventuali richieste inviate
                dall&apos;utente.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">
              4. Base giuridica
            </h2>

            <p className="mt-4">
              Il trattamento dei dati necessari alla
              creazione dell&apos;account e all&apos;utilizzo
              delle funzionalità di ViewVault è effettuato
              principalmente perché necessario a fornire il
              servizio richiesto dall&apos;utente.
            </p>

            <p className="mt-4">
              Alcuni trattamenti tecnici possono inoltre
              essere effettuati per il legittimo interesse
              del Titolare a garantire sicurezza, prevenzione
              degli abusi e corretto funzionamento del
              servizio, nel rispetto della normativa
              applicabile.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">
              5. Autenticazione
            </h2>

            <p className="mt-4">
              ViewVault consente la registrazione e
              l&apos;accesso mediante email e password e,
              quando scelto dall&apos;utente, tramite provider
              esterni come Google e GitHub.
            </p>

            <p className="mt-4">
              Utilizzando un provider esterno, alcuni dati
              necessari all&apos;autenticazione possono essere
              comunicati tra il provider scelto e ViewVault
              secondo le rispettive impostazioni e
              informative privacy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">
              6. Fornitori e servizi esterni
            </h2>

            <p className="mt-4">
              Per fornire le proprie funzionalità ViewVault
              utilizza servizi tecnologici di terze parti.
            </p>

            <div className="mt-6 space-y-5">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <h3 className="font-bold text-white">
                  Supabase
                </h3>

                <p className="mt-2">
                  Utilizzato per autenticazione, gestione
                  delle sessioni e archiviazione dei dati
                  associati al Vault personale.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <h3 className="font-bold text-white">
                  Vercel
                </h3>

                <p className="mt-2">
                  Utilizzato per hosting, distribuzione e
                  infrastruttura tecnica dell&apos;applicazione.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <h3 className="font-bold text-white">
                  TMDB
                </h3>

                <p className="mt-2">
                  Utilizzato come fonte di informazioni
                  relative a film e serie TV, quali titoli,
                  immagini, cast e altri metadati.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <h3 className="font-bold text-white">
                  Google e GitHub
                </h3>

                <p className="mt-2">
                  Possono essere utilizzati, su scelta
                  dell&apos;utente, come provider esterni per
                  effettuare l&apos;accesso a ViewVault.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <h3 className="font-bold text-white">
                  YouTube
                </h3>

                <p className="mt-2">
                  Utilizzato per mostrare trailer incorporati.
                  ViewVault utilizza, ove previsto, la modalità
                  di incorporamento con dominio
                  youtube-nocookie.com.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">
              7. Conservazione dei dati
            </h2>

            <p className="mt-4">
              I dati associati all&apos;account vengono
              conservati per il periodo necessario a fornire
              le funzionalità di ViewVault e, in generale,
              finché l&apos;account rimane attivo, salvo
              eventuali obblighi di conservazione previsti
              dalla legge.
            </p>

            <p className="mt-4">
              L&apos;utente può richiedere la cancellazione
              dei propri dati e dell&apos;account contattando
              il Titolare all&apos;indirizzo indicato nella
              presente informativa.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">
              8. Cookie e sessione
            </h2>

            <p className="mt-4">
              ViewVault utilizza tecnologie tecniche
              necessarie al funzionamento del servizio,
              comprese quelle necessarie alla gestione
              dell&apos;autenticazione e della sessione
              dell&apos;utente.
            </p>

            <p className="mt-4">
              Ulteriori informazioni sono disponibili nella
              Cookie Policy di ViewVault.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">
              9. Diritti dell&apos;utente
            </h2>

            <p className="mt-4">
              Nei casi previsti dalla normativa applicabile,
              l&apos;utente può esercitare i propri diritti
              in materia di protezione dei dati personali,
              tra cui richiedere:
            </p>

            <ul className="mt-4 list-disc space-y-3 pl-6">
              <li>l&apos;accesso ai propri dati;</li>
              <li>la rettifica dei dati inesatti;</li>
              <li>la cancellazione dei dati;</li>
              <li>la limitazione del trattamento;</li>
              <li>
                la portabilità dei dati, quando applicabile;
              </li>
              <li>
                l&apos;opposizione al trattamento nei casi
                previsti dalla normativa.
              </li>
            </ul>

            <p className="mt-4">
              Le richieste possono essere inviate a{" "}
              <a
                href="mailto:info@viewvault.it"
                className="font-semibold text-[#8B5CF6] transition hover:text-[#A78BFA]"
              >
                info@viewvault.it
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">
              10. Sicurezza
            </h2>

            <p className="mt-4">
              ViewVault adotta misure tecniche e
              organizzative ragionevoli volte a proteggere i
              dati trattati da accessi non autorizzati,
              perdita, alterazione o divulgazione indebita.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">
              11. Modifiche alla Privacy Policy
            </h2>

            <p className="mt-4">
              La presente informativa potrà essere aggiornata
              in seguito a modifiche delle funzionalità di
              ViewVault, dei servizi utilizzati o della
              normativa applicabile.
            </p>

            <p className="mt-4">
              La versione aggiornata sarà pubblicata su
              questa pagina indicando la relativa data di
              aggiornamento.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">
              12. Contatti
            </h2>

            <p className="mt-4">
              Per domande relative alla presente informativa
              o al trattamento dei dati personali:
            </p>

            <div className="mt-5 rounded-2xl border border-[#7C3AED]/30 bg-[#7C3AED]/10 p-5">
              <p className="font-bold text-white">
                ViewVault
              </p>

              <p className="mt-2">
                Titolare: Emanuele Starnoni
              </p>

              <p className="mt-2">
                Email:{" "}
                <a
                  href="mailto:info@viewvault.it"
                  className="font-semibold text-[#A78BFA] hover:text-white"
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