import Link from "next/link";

type MovieCardProps = {
  id?: number;
  title: string;
  year: string;
  rating: string;
  image: string;
  tag?: string;
  genre?: string;
  duration?: string;
};

export default function MovieCard({
  id,
  title,
  year,
  rating,
  image,
  tag,
  genre = "Cinema",
  duration = "120 min",
}: MovieCardProps) {
  const href = id ? `/film/${id}` : "#";

  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 transition hover:-translate-y-2 hover:border-[#7C3AED] hover:shadow-[0_0_30px_rgba(124,58,237,0.25)]"
    >
      <div className="relative h-72 w-full overflow-hidden bg-zinc-800">
        {tag && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-[#7C3AED] px-3 py-1 text-xs font-bold text-white">
            {tag}
          </span>
        )}

        <span className="absolute right-3 top-3 z-10 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-[#F4C542]">
          {rating}
        </span>

        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        <div className="absolute bottom-4 left-4 right-4 rounded-full bg-white/10 py-2 text-center text-sm font-semibold text-white backdrop-blur-md transition group-hover:bg-[#7C3AED]">
          Apri scheda
        </div>
      </div>

      <div className="p-4">
        <h3 className="line-clamp-1 text-lg font-bold">{title}</h3>

        <p className="mt-1 text-sm text-zinc-400">
          {year} • {genre} • {duration}
        </p>
      </div>
    </Link>
  );
}