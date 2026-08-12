import Navbar from "../../components/Navbar";

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-[#121212] text-[#F8FAFC]">
      <Navbar />

      <section className="mx-auto max-w-4xl px-6 pb-24 pt-32">
        <div className="mb-12">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8B5CF6]">
            Informazioni legali
          </p>

          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            Cookie Policy
          </h1>

          <p className="mt-5 text-lg leading-8 text-zinc-400">
            Questa informativa descrive l&apos;utilizzo di cookie
            e tecnologie analoghe su ViewVault.
          </p>

          <p className="mt-3 text-sm text-zinc-500">
            Ultimo aggiornamento: 11 agosto 2026
          </p>
        </div>

        <div className="space-y-12 leading-8 text-zinc-300">
          <section>
            <h2 className="text-2xl font-bold text-white">
              1. Cosa sono i cookie
            </h2>

            <p className="mt-4">
              I cookie sono piccoli file di testo che possono
              essere memorizzati sul dispositivo dell&apos;utente
              durante la navigazione su un sito web.
            </p>

            <p className="mt-4">
              Possono essere utilizzati, ad esempio, per mantenere
              attiva una sessione di autenticazione, ricordare
              determinate impostazioni o consentire il corretto
              funzionamento di alcune funzionalità.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">
              2. Cookie utilizzati da ViewVault
            </h2>

            <p className="mt-4">
              Allo stato attuale, ViewVault utilizza principalmente
              cookie e tecnologie tecniche necessarie al corretto
              funzionamento del servizio.
            </p>

            <p className="mt-4">
              In particolare, tali tecnologie vengono utilizzate
              per gestire l&apos;autenticazione, mantenere attiva la
              sessione dell&apos;utente e consentire l&apos;accesso alle
              funzionalità associate al proprio account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">
              3. Cookie di autenticazione Supabase
            </h2>

            <p className="mt-4">
              ViewVault utilizza Supabase per la gestione
              dell&apos;autenticazione e delle sessioni utente.
            </p>

            <p className="mt-4">
              Nell&apos;implementazione server-side utilizzata da
              ViewVault, le informazioni necessarie a mantenere la
              sessione autenticata vengono memorizzate mediante
              cookie tecnici.
            </p>

            <p className="mt-4">
              Questi cookie sono necessari per consentire al browser
              e al server di riconoscere correttamente l&apos;utente
              autenticato e mantenere sincronizzata la sessione.
            </p>

            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
              <p className="font-bold text-white">
                Finalità
              </p>

              <p className="mt-2">
                Autenticazione, mantenimento della sessione,
                sicurezza e accesso alle funzionalità personali
                dell&apos;account.
              </p>

              <p className="mt-4 font-bold text-white">
                Tipologia
              </p>

              <p className="mt-2">
                Cookie tecnici e strettamente necessari.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">
              4. Cookie di profilazione e pubblicità
            </h2>

            <p className="mt-4">
              Al momento ViewVault non utilizza sistemi pubblicitari,
              cookie destinati alla profilazione commerciale,
              strumenti di remarketing o piattaforme di advertising.
            </p>

            <p className="mt-4">
              ViewVault non utilizza attualmente Google Analytics,
              Google Tag Manager, Meta Pixel o altri strumenti
              equivalenti di tracciamento pubblicitario o
              comportamentale.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">
              5. Banner di consenso
            </h2>

            <p className="mt-4">
              Poiché allo stato attuale ViewVault utilizza soltanto
              tecnologie tecniche necessarie al funzionamento del
              servizio e non utilizza cookie di profilazione,
              ViewVault non presenta un banner per la raccolta del
              consenso ai cookie.
            </p>

            <p className="mt-4">
              Qualora in futuro vengano introdotti strumenti di
              analytics non assimilabili ai cookie tecnici,
              pubblicità, profilazione o altre tecnologie che
              richiedano il consenso preventivo dell&apos;utente,
              questa impostazione verrà rivalutata e verranno
              implementati gli strumenti di consenso richiesti dalla
              normativa applicabile.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">
              6. Trailer YouTube
            </h2>

            <p className="mt-4">
              ViewVault può mostrare trailer provenienti da YouTube
              mediante player incorporati.
            </p>

            <p className="mt-4">
              Quando disponibile, ViewVault utilizza il dominio
              youtube-nocookie.com per gli incorporamenti, cioè la
              modalità di privacy avanzata prevista da YouTube.
            </p>

            <p className="mt-4">
              L&apos;interazione volontaria dell&apos;utente con il
              contenuto incorporato o l&apos;apertura diretta del sito
              YouTube può comportare trattamenti effettuati
              direttamente da YouTube secondo le proprie condizioni
              e informative.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">
              7. Servizi esterni
            </h2>

            <p className="mt-4">
              Alcune funzionalità di ViewVault si appoggiano a
              fornitori esterni, tra cui Supabase, Vercel, TMDB,
              Google, GitHub e YouTube.
            </p>

            <p className="mt-4">
              Questi soggetti possono trattare dati tecnici secondo
              i rispettivi ruoli, condizioni contrattuali e
              informative privacy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">
              8. Gestione dei cookie dal browser
            </h2>

            <p className="mt-4">
              L&apos;utente può gestire o eliminare i cookie attraverso
              le impostazioni del proprio browser.
            </p>

            <p className="mt-4">
              La disabilitazione o cancellazione dei cookie tecnici
              necessari all&apos;autenticazione potrebbe tuttavia
              impedire il corretto funzionamento del login, della
              sessione e di alcune funzionalità personali di
              ViewVault.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">
              9. Modifiche alla Cookie Policy
            </h2>

            <p className="mt-4">
              La presente Cookie Policy potrà essere aggiornata
              qualora vengano introdotte nuove funzionalità,
              tecnologie o servizi esterni.
            </p>

            <p className="mt-4">
              La versione aggiornata sarà pubblicata su questa pagina
              con indicazione della relativa data di aggiornamento.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white">
              10. Contatti
            </h2>

            <p className="mt-4">
              Per informazioni sull&apos;utilizzo dei cookie e delle
              tecnologie impiegate da ViewVault è possibile
              contattare:
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