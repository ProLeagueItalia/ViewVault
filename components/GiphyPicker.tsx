"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

type GiphyPickerProps = {
  selectedGifUrl?: string;
  onSelect: (gifUrl: string) => void;
  onClear?: () => void;
};

type GiphyImage = {
  url?: string;
  width?: string;
  height?: string;
};

type GiphyGif = {
  id: string;
  title: string;
  images: {
    fixed_width?: GiphyImage;
    fixed_width_small?: GiphyImage;
    downsized?: GiphyImage;
    original?: GiphyImage;
  };
};

type GiphyResponse = {
  data?: GiphyGif[];
  meta?: {
    status?: number;
    msg?: string;
  };
};

const SEARCH_LIMIT = 18;

export default function GiphyPicker({
  selectedGifUrl = "",
  onSelect,
  onClear,
}: GiphyPickerProps) {
  const apiKey =
    process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? "";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GiphyGif[]>(
    []
  );

  const [isLoading, setIsLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadGifs = useCallback(
    async (
      searchTerm: string,
      signal?: AbortSignal
    ) => {
      if (!apiKey) {
        setResults([]);
        setErrorMessage(
          "Chiave GIPHY non configurata."
        );
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      const cleanQuery = searchTerm.trim();

      const params = new URLSearchParams({
        api_key: apiKey,
        limit: String(SEARCH_LIMIT),
        rating: "pg-13",
        lang: "it",
        bundle: "messaging_non_clips",
      });

      let endpoint =
        "https://api.giphy.com/v1/gifs/trending";

      if (cleanQuery) {
        endpoint =
          "https://api.giphy.com/v1/gifs/search";

        params.set("q", cleanQuery.slice(0, 50));
      }

      try {
        const response = await fetch(
          `${endpoint}?${params.toString()}`,
          {
            method: "GET",
            signal,
          }
        );

        const payload =
          (await response.json()) as GiphyResponse;

        if (!response.ok) {
          throw new Error(
            payload.meta?.msg ||
              "Richiesta GIPHY non riuscita."
          );
        }

        setResults(payload.data ?? []);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "Errore durante il recupero delle GIF:",
          error
        );

        setResults([]);

        setErrorMessage(
          "Non è stato possibile caricare le GIF."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey]
  );

  useEffect(() => {
    const controller = new AbortController();

    const timeout = window.setTimeout(() => {
      void loadGifs(query, controller.signal);
    }, query.trim() ? 450 : 0);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [loadGifs, query]);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    void loadGifs(query);
  }

  function getPreviewUrl(gif: GiphyGif) {
    return (
      gif.images.fixed_width_small?.url ||
      gif.images.fixed_width?.url ||
      gif.images.downsized?.url ||
      gif.images.original?.url ||
      ""
    );
  }

  function getSelectedUrl(gif: GiphyGif) {
    return (
      gif.images.fixed_width?.url ||
      gif.images.downsized?.url ||
      gif.images.original?.url ||
      ""
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-700 bg-[#101010] p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold text-white">
            Cerca una GIF
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Cerca e seleziona una GIF da aggiungere
            al commento.
          </p>
        </div>

        <span className="w-fit rounded-full border border-zinc-700 bg-black/30 px-3 py-1 text-xs font-bold text-zinc-300">
          Powered by GIPHY
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-4 flex gap-2"
      >
        <input
          type="search"
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          maxLength={50}
          placeholder="Cerca: film, emozione, reazione..."
          className="min-w-0 flex-1 rounded-full border border-zinc-700 bg-[#18181B] px-5 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C3AED]"
        />

        <button
          type="submit"
          disabled={isLoading}
          className="rounded-full bg-[#7C3AED] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cerca
        </button>
      </form>

      {selectedGifUrl && (
        <div className="mt-4 rounded-2xl border border-[#7C3AED]/40 bg-[#7C3AED]/10 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#C4B5FD]">
                GIF selezionata
              </p>

              <img
                src={selectedGifUrl}
                alt="GIF selezionata"
                className="mt-3 max-h-56 max-w-full rounded-xl object-contain"
              />
            </div>

            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/60 font-bold text-white transition hover:bg-red-600"
                aria-label="Rimuovi GIF"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-4">
        {isLoading ? (
          <div className="rounded-2xl border border-zinc-800 bg-black/20 px-5 py-10 text-center text-sm text-zinc-400">
            Caricamento GIF...
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-5 text-sm text-red-300">
            {errorMessage}
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-700 bg-black/20 px-5 py-10 text-center text-sm text-zinc-500">
            Nessuna GIF trovata.
          </div>
        ) : (
          <div className="grid max-h-[520px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
            {results.map((gif) => {
              const previewUrl =
                getPreviewUrl(gif);

              const selectedUrl =
                getSelectedUrl(gif);

              if (!previewUrl || !selectedUrl) {
                return null;
              }

              const isSelected =
                selectedGifUrl === selectedUrl;

              return (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() =>
                    onSelect(selectedUrl)
                  }
                  className={`group relative overflow-hidden rounded-xl border transition ${
                    isSelected
                      ? "border-[#A78BFA] ring-2 ring-[#7C3AED]/50"
                      : "border-zinc-800 hover:border-[#7C3AED]"
                  }`}
                  title={
                    gif.title || "Seleziona GIF"
                  }
                >
                  <img
                    src={previewUrl}
                    alt={
                      gif.title || "GIF GIPHY"
                    }
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />

                  <span className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1 text-center text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100">
                    {isSelected
                      ? "Selezionata"
                      : "Seleziona"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
