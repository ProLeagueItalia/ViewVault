export default function StatsCards() {
  return (
    <section className="mx-auto mt-16 max-w-6xl px-6">

      <h2 className="mb-8 text-3xl font-bold">
        📊 Le tue statistiche
      </h2>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">

        <div className="rounded-3xl bg-zinc-900 p-8 text-center border border-zinc-800">
          <h3 className="text-5xl font-bold text-violet-500">0</h3>
          <p className="mt-3 text-zinc-400">Film visti</p>
        </div>

        <div className="rounded-3xl bg-zinc-900 p-8 text-center border border-zinc-800">
          <h3 className="text-5xl font-bold text-blue-500">0</h3>
          <p className="mt-3 text-zinc-400">Serie TV</p>
        </div>

        <div className="rounded-3xl bg-zinc-900 p-8 text-center border border-zinc-800">
          <h3 className="text-5xl font-bold text-yellow-400">0h</h3>
          <p className="mt-3 text-zinc-400">Ore viste</p>
        </div>

        <div className="rounded-3xl bg-zinc-900 p-8 text-center border border-zinc-800">
          <h3 className="text-5xl font-bold text-green-500">0</h3>
          <p className="mt-3 text-zinc-400">Recensioni</p>
        </div>

      </div>

    </section>
  );
}