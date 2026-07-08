import MovieCard from "./MovieCard";

const movies = [
  {
    title: "Superman",
    year: "2025",
    rating: "★★★★☆",
    image: "https://image.tmdb.org/t/p/w500/ombsmhYUqR4qqOLOxAyr5V8hbyv.jpg",
  },
  {
    title: "F1",
    year: "2025",
    rating: "★★★★★",
    image: "https://image.tmdb.org/t/p/w500/6H6p82aWQFEKEuVUiZll6JxV8Ft.jpg",
  },
  {
    title: "Jurassic World",
    year: "2025",
    rating: "★★★★☆",
    image: "https://placehold.co/500x750/121212/7C3AED?text=Jurassic+World",
  },
  {
    title: "Fantastic Four",
    year: "2025",
    rating: "★★★★☆",
    image: "https://image.tmdb.org/t/p/w500/x26MtUlwtWD26d0G0FXcppxCJio.jpg",
  },
];

export default function NewMovies() {
  return (
    <section className="mx-auto mt-20 max-w-7xl px-6">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-3xl font-bold">🎬 Nuovi Film</h2>

        <button className="text-sm font-semibold text-[#7C3AED] hover:text-[#2563EB]">
          Vedi tutti
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {movies.map((movie) => (
          <MovieCard
            key={movie.title}
            title={movie.title}
            year={movie.year}
            rating={movie.rating}
            image={movie.image}
            tag="Nuovo"
          />
        ))}
      </div>
    </section>
  );
}