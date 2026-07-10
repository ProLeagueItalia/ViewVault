import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

const stats = [
  {
    label: "Film visti",
    value: "0",
    icon: "🎬",
  },
  {
    label: "Serie TV",
    value: "0",
    icon: "📺",
  },
  {
    label: "Ore guardate",
    value: "0",
    icon: "⏱️",
  },
  {
    label: "Media voti",
    value: "0.0",
    icon: "⭐",
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Chi non è autenticato torna alla Home.
  if (!user) {
    redirect("/");
  }

  const metadata = user.user_metadata ?? {};

  const displayName =
    metadata.full_name ||
    metadata.name ||
    metadata.user_name ||
    metadata.preferred_username ||
    user.email?.split("@")[0] ||
    "Utente";

  const avatarUrl =
    metadata.avatar_url ||
    metadata.picture ||
    null;

  return (
    <main className="min-h-screen bg-[#0d0d0d] px-6 pb-16 pt-28 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-[#8b5cf6]">
              Dashboard personale
            </p>

            <h1 className="text-4xl font-bold md:text-5xl">
              Ciao,{" "}
              <span className="text-[#7c3aed]">{displayName}</span>
            </h1>

            <p className="mt-4 max-w-2xl text-lg text-zinc-400">
              Bentornato nel tuo Vault. Qui troverai film, serie TV,
              recensioni e statistiche personali.
            </p>
          </div>

          <article className="flex items-center gap-4 rounded-3xl border border-zinc-800 bg-[#151515] p-4 pr-6">
            {avatarUrl ? (
              <div
                className="h-16 w-16 shrink-0 rounded-full border-2 border-[#7c3aed] bg-cover bg-center"
                style={{ backgroundImage: `url("${avatarUrl}")` }}
                aria-label={`Avatar di ${displayName}`}
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[#7c3aed] bg-[#7c3aed]/20 text-2xl font-bold text-[#a78bfa]">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate font-bold">{displayName}</p>

              <p className="max-w-64 truncate text-sm text-zinc-400">
                {user.email}
              </p>

              <span className="mt-2 inline-block rounded-full bg-[#7c3aed]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#a78bfa]">
                Account attivo
              </span>
            </div>
          </article>
        </section>

        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <article
              key={stat.label}
              className="rounded-3xl border border-zinc-800 bg-[#151515] p-6 shadow-lg transition hover:-translate-y-1 hover:border-[#7c3aed]"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="text-3xl">{stat.icon}</span>

                <span className="rounded-full bg-[#7c3aed]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#a78bfa]">
                  Personale
                </span>
              </div>

              <p className="text-4xl font-bold">{stat.value}</p>
              <p className="mt-2 text-zinc-400">{stat.label}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-3">
          <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-6 lg:col-span-2">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-[#8b5cf6]">
                  Attività
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  Ultimi contenuti aggiunti
                </h2>
              </div>

              <button className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold transition hover:border-[#7c3aed]">
                Vedi tutto
              </button>
            </div>

            <div className="flex min-h-52 items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-black/20 px-6 text-center">
              <div>
                <p className="text-lg font-semibold">
                  Il tuo Vault è ancora vuoto
                </p>

                <p className="mt-2 text-zinc-500">
                  Aggiungi il primo film o la prima serie TV.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#8b5cf6]">
              Accesso rapido
            </p>

            <h2 className="mt-1 text-2xl font-bold">Le tue liste</h2>

            <div className="mt-6 space-y-3">
              <button className="w-full rounded-2xl bg-[#7c3aed] px-5 py-4 text-left font-bold transition hover:bg-[#6d28d9]">
                ❤️ Preferiti
              </button>

              <button className="w-full rounded-2xl bg-zinc-900 px-5 py-4 text-left font-bold transition hover:bg-zinc-800">
                📌 Watchlist
              </button>

              <button className="w-full rounded-2xl bg-zinc-900 px-5 py-4 text-left font-bold transition hover:bg-zinc-800">
                📝 Recensioni
              </button>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}