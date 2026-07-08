export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 z-50 w-full border-b border-zinc-800 bg-[#121212]/80 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-8">

        <h1 className="text-3xl font-bold tracking-tight">
          View<span className="text-[#7C3AED]">Vault</span>
        </h1>

        <nav className="hidden gap-8 text-lg md:flex">

          <a href="#" className="transition hover:text-[#7C3AED]">
            Home
          </a>

          <a href="#" className="transition hover:text-[#7C3AED]">
            Film
          </a>

          <a href="#" className="transition hover:text-[#7C3AED]">
            Serie TV
          </a>

          <a href="#" className="transition hover:text-[#7C3AED]">
            Statistiche
          </a>

        </nav>

        <button className="rounded-full bg-[#7C3AED] px-6 py-2 font-semibold transition hover:bg-[#2563EB]">
          Login
        </button>

      </div>
    </header>
  );
}