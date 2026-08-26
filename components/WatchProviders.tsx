import {
  getPosterUrl,
  type TMDBWatchProvider,
  type TMDBWatchProvidersCountry,
} from "../lib/tmdb";

type WatchProvidersProps = {
  providers: TMDBWatchProvidersCountry | null;
  title: string;
  countryLabel?: string;
};

type ProviderGroupProps = {
  title: string;
  providers: TMDBWatchProvider[];
  link?: string;
};

export default function WatchProviders({
  providers,
  title,
  countryLabel = "Italia",
}: WatchProvidersProps) {
  const streaming = providers?.flatrate ?? [];
  const rent = providers?.rent ?? [];
  const buy = providers?.buy ?? [];

  const hasAnyProvider =
    streaming.length > 0 ||
    rent.length > 0 ||
    buy.length > 0;

  return (
    <section className="mt-16">
      <div className="mb-7">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
          Disponibilità
        </p>

        <h2 className="mt-2 text-3xl font-bold text-white">
          📺 Dove guardarlo in {countryLabel}
        </h2>

        <p className="mt-3 max-w-3xl leading-7 text-zinc-400">
          Scopri su quali servizi è disponibile in streaming,
          a noleggio o per l&apos;acquisto.
        </p>
      </div>

      {hasAnyProvider ? (
        <div className="space-y-6">
          {streaming.length > 0 && (
            <ProviderGroup
              title="Streaming"
              providers={streaming}
              link={providers?.link}
            />
          )}

          {rent.length > 0 && (
            <ProviderGroup
              title="Noleggio"
              providers={rent}
              link={providers?.link}
            />
          )}

          {buy.length > 0 && (
            <ProviderGroup
              title="Acquisto"
              providers={buy}
              link={providers?.link}
            />
          )}

          {providers?.link && (
            <div className="pt-2">
              <a
                href={providers.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-zinc-700 px-6 py-3 text-sm font-bold text-zinc-200 transition hover:border-[#7C3AED] hover:text-white"
              >
                Apri tutte le opzioni
              </a>

              <p className="mt-3 text-xs leading-5 text-zinc-500">
                Disponibilità fornita da JustWatch tramite TMDB.
                I servizi possono variare nel tempo e in base alla località.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-zinc-700 bg-[#18181B] px-6 py-12 text-center">
          <p className="text-4xl">🍿</p>

          <h3 className="mt-4 text-xl font-bold text-white">
            Nessuna disponibilità trovata
          </h3>

          <p className="mx-auto mt-3 max-w-xl text-zinc-400">
            Al momento TMDB non segnala servizi di streaming,
            noleggio o acquisto per {title} in {countryLabel}.
          </p>
        </div>
      )}
    </section>
  );
}

function ProviderGroup({
  title,
  providers,
  link,
}: ProviderGroupProps) {
  const uniqueProviders = Array.from(
    new Map(
      providers.map((provider) => [
        provider.provider_id,
        provider,
      ])
    ).values()
  ).sort(
    (first, second) =>
      first.display_priority -
      second.display_priority
  );

  return (
    <div className="rounded-3xl border border-zinc-800 bg-[#18181B] p-5 md:p-6">
      <h3 className="text-lg font-bold text-white">
        {title}
      </h3>

      <div className="mt-5 flex flex-wrap gap-4">
        {uniqueProviders.map((provider) => {
          const logoUrl = provider.logo_path
            ? getPosterUrl(provider.logo_path)
            : "/viewvault-logo.svg";

          const cardClassName =
            "group flex min-w-[170px] items-center gap-3 rounded-2xl border border-zinc-800 bg-black/25 p-3 transition hover:-translate-y-1 hover:border-[#7C3AED]/70 hover:bg-[#7C3AED]/10 hover:shadow-[0_10px_30px_rgba(124,58,237,0.15)]";

          const content = (
            <>
              <img
                src={logoUrl}
                alt={provider.provider_name}
                className="h-12 w-12 rounded-xl object-cover"
              />

              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">
                  {provider.provider_name}
                </p>

                <p className="mt-1 text-xs text-zinc-500 transition group-hover:text-[#C4B5FD]">
                  {link ? `${title} ↗` : title}
                </p>
              </div>
            </>
          );

          if (!link) {
            return (
              <div
                key={provider.provider_id}
                className={cardClassName}
              >
                {content}
              </div>
            );
          }

          return (
            <a
              key={provider.provider_id}
              href={link}
              target="_blank"
              rel="noreferrer"
              className={cardClassName}
              aria-label={`Apri le opzioni per ${provider.provider_name}`}
            >
              {content}
            </a>
          );
        })}
      </div>
    </div>
  );
}
