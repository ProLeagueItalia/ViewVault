"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "../lib/supabase/client";
import VaultCardActions from "./VaultCardActions";

export type VaultMediaItem = {
  vaultId: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  year: string;
  posterUrl: string;
  voteAverage: number;
  runtimeLabel: string;
  vaultStatus: "watched" | "watchlist";
  progressStatus:
    | "watchlist"
    | "in_progress"
    | "watched"
    | null;
  watchedEpisodes: number;
  totalEpisodes: number;
  isFavorite: boolean;
  createdAt: string | null;
  watchCount: number;
};

type FilterType =
  | "all"
  | "movie"
  | "tv"
  | "in_progress"
  | "watched"
  | "watchlist"
  | "favorites";

type SortType =
  | "recent"
  | "title_asc"
  | "title_desc"
  | "rating_desc"
  | "year_desc";

type VaultLibraryProps = {
  items: VaultMediaItem[];
};

export default function VaultLibrary({
  items,
}: VaultLibraryProps) {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();

  const urlFilter = getValidFilter(
    searchParams.get("filter")
  );

  const urlMediaType = getValidMediaType(
    searchParams.get("type")
  );

  const [libraryItems, setLibraryItems] =
    useState<VaultMediaItem[]>(items);

  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<FilterType>(urlFilter);

  const [mediaTypeFilter, setMediaTypeFilter] =
    useState<"movie" | "tv" | null>(urlMediaType);
  const [sortBy, setSortBy] =
    useState<SortType>("recent");

  const [
    savingFavoriteVaultId,
    setSavingFavoriteVaultId,
  ] = useState<string | null>(null);

  const [favoriteMessage, setFavoriteMessage] =
    useState("");

  useEffect(() => {
    setLibraryItems(items);
  }, [items]);

  useEffect(() => {
    setActiveFilter(urlFilter);
    setMediaTypeFilter(urlMediaType);
  }, [urlFilter, urlMediaType]);

  function updateItemStatus(
    vaultId: string,
    newStatus: "watched" | "watchlist"
  ) {
    setLibraryItems((currentItems) =>
      currentItems.map((item) =>
        item.vaultId === vaultId
          ? {
              ...item,
              vaultStatus: newStatus,
            }
          : item
      )
    );
  }

  function removeItem(vaultId: string) {
    setLibraryItems((currentItems) =>
      currentItems.filter(
        (item) => item.vaultId !== vaultId
      )
    );
  }

  async function toggleFavorite(
    vaultId: string,
    currentValue: boolean
  ) {
    if (savingFavoriteVaultId) {
      return;
    }

    setSavingFavoriteVaultId(vaultId);
    setFavoriteMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setFavoriteMessage(
        "Effettua il login per gestire i Preferiti."
      );
      setSavingFavoriteVaultId(null);
      return;
    }

    const newValue = !currentValue;

    const { error } = await supabase
      .from("vault_items")
      .update({
        is_favorite: newValue,
      })
      .eq("id", vaultId)
      .eq("user_id", user.id);

    if (error) {
      console.error(
        "Errore durante l'aggiornamento del Preferito:",
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
      );

      setFavoriteMessage(
        "Non è stato possibile aggiornare i Preferiti."
      );
      setSavingFavoriteVaultId(null);
      return;
    }

    setLibraryItems((currentItems) =>
      currentItems.map((item) =>
        item.vaultId === vaultId
          ? {
              ...item,
              isFavorite: newValue,
            }
          : item
      )
    );

    setFavoriteMessage(
      newValue
        ? "Contenuto aggiunto ai Preferiti."
        : "Contenuto rimosso dai Preferiti."
    );

    setSavingFavoriteVaultId(null);
  }

  const filteredItems = useMemo(() => {
    const normalizedQuery = query
      .trim()
      .toLowerCase();

    const filtered = libraryItems.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        item.title
          .toLowerCase()
          .includes(normalizedQuery) ||
        item.year
          .toLowerCase()
          .includes(normalizedQuery);

      if (!matchesQuery) {
        return false;
      }

      if (
        mediaTypeFilter &&
        item.mediaType !== mediaTypeFilter
      ) {
        return false;
      }

      if (activeFilter === "movie") {
        return item.mediaType === "movie";
      }

      if (activeFilter === "tv") {
        return item.mediaType === "tv";
      }

      if (activeFilter === "favorites") {
        return item.isFavorite;
      }

      if (activeFilter === "in_progress") {
        return (
          item.mediaType === "tv" &&
          item.progressStatus === "in_progress"
        );
      }

      if (activeFilter === "watched") {
        if (item.mediaType === "tv") {
          return item.progressStatus === "watched";
        }

        return item.vaultStatus === "watched";
      }

      if (activeFilter === "watchlist") {
        if (
          item.mediaType === "tv" &&
          (item.progressStatus === "in_progress" ||
            item.progressStatus === "watched")
        ) {
          return false;
        }

        return item.vaultStatus === "watchlist";
      }

      return true;
    });

    return [...filtered].sort((first, second) => {
      if (sortBy === "title_asc") {
        return first.title.localeCompare(
          second.title,
          "it"
        );
      }

      if (sortBy === "title_desc") {
        return second.title.localeCompare(
          first.title,
          "it"
        );
      }

      if (sortBy === "rating_desc") {
        return (
          second.voteAverage -
          first.voteAverage
        );
      }

      if (sortBy === "year_desc") {
        return (
          Number(second.year) -
          Number(first.year)
        );
      }

      const firstDate = first.createdAt
        ? new Date(first.createdAt).getTime()
        : 0;

      const secondDate = second.createdAt
        ? new Date(second.createdAt).getTime()
        : 0;

      return secondDate - firstDate;
    });
  }, [
    activeFilter,
    libraryItems,
    mediaTypeFilter,
    query,
    sortBy,
  ]);

  const filmCount = libraryItems.filter(
    (item) => item.mediaType === "movie"
  ).length;

  const seriesCount = libraryItems.filter(
    (item) => item.mediaType === "tv"
  ).length;

  const inProgressCount = libraryItems.filter(
    (item) =>
      item.mediaType === "tv" &&
      item.progressStatus === "in_progress"
  ).length;

  const watchedCount = libraryItems.filter(
    (item) => {
      if (item.mediaType === "tv") {
        return item.progressStatus === "watched";
      }

      return item.vaultStatus === "watched";
    }
  ).length;

  const watchlistCount = libraryItems.filter(
    (item) => {
      if (
        item.mediaType === "tv" &&
        (item.progressStatus === "in_progress" ||
          item.progressStatus === "watched")
      ) {
        return false;
      }

      return item.vaultStatus === "watchlist";
    }
  ).length;

  const favoritesCount = libraryItems.filter(
    (item) => item.isFavorite
  ).length;

  const filters: {
    value: FilterType;
    label: string;
    count: number;
  }[] = [
    {
      value: "all",
      label: "Tutti",
      count: libraryItems.length,
    },
    {
      value: "movie",
      label: "Film",
      count: filmCount,
    },
    {
      value: "tv",
      label: "Serie TV",
      count: seriesCount,
    },
    {
      value: "in_progress",
      label: "In corso",
      count: inProgressCount,
    },
    {
      value: "watched",
      label: "Completati",
      count: watchedCount,
    },
    {
      value: "watchlist",
      label: "Da vedere",
      count: watchlistCount,
    },
    {
      value: "favorites",
      label: "Preferiti",
      count: favoritesCount,
    },
  ];

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Contenuti"
          value={libraryItems.length}
          icon="🎞️"
        />

        <StatCard
          label="Film"
          value={filmCount}
          icon="🎬"
        />

        <StatCard
          label="Serie TV"
          value={seriesCount}
          icon="📺"
        />

        <StatCard
          label="In corso"
          value={inProgressCount}
          icon="🕒"
        />

        <StatCard
          label="Completati"
          value={watchedCount}
          icon="✅"
        />
      </section>

      <section className="mt-8 rounded-3xl border border-zinc-800 bg-[#151515] p-5 md:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
          <input
            id="vault-search"
            type="search"
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="🔎 Cerca nel tuo Vault..."
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-[#7C3AED]"
          />

          <select
            id="vault-sort"
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target.value as SortType
              )
            }
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-4 text-white outline-none transition focus:border-[#7C3AED]"
          >
            <option value="recent">
              Ultimi aggiunti
            </option>

            <option value="title_asc">
              Titolo A-Z
            </option>

            <option value="title_desc">
              Titolo Z-A
            </option>

            <option value="rating_desc">
              Voto più alto
            </option>

            <option value="year_desc">
              Più recenti
            </option>
          </select>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {filters.map((filter) => {
            const isActive =
              activeFilter === filter.value;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setActiveFilter(filter.value);
                  setMediaTypeFilter(null);
                }}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  isActive
                    ? "bg-[#7C3AED] text-white"
                    : "border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-[#7C3AED]"
                }`}
              >
                {filter.label}

                <span className="ml-2 opacity-70">
                  {filter.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {favoriteMessage && (
        <p className="mt-4 text-center text-sm text-zinc-300">
          {favoriteMessage}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B5CF6]">
            Libreria personale
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            {getFilterTitle(activeFilter, mediaTypeFilter)}
          </h2>
        </div>

        <p className="text-sm text-zinc-400">
          {filteredItems.length}{" "}
          {filteredItems.length === 1
            ? "contenuto trovato"
            : "contenuti trovati"}
        </p>
      </div>

      {filteredItems.length > 0 ? (
        <section className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => (
            <VaultCard
              key={`${item.mediaType}-${item.vaultId}`}
              item={item}
              favoriteSaving={
                savingFavoriteVaultId ===
                item.vaultId
              }
              onFavoriteToggle={() =>
                toggleFavorite(
                  item.vaultId,
                  item.isFavorite
                )
              }
              onStatusChange={(newStatus) =>
                updateItemStatus(
                  item.vaultId,
                  newStatus
                )
              }
              onRemoved={() =>
                removeItem(item.vaultId)
              }
              onWatchCountChange={(newWatchCount) =>
                setLibraryItems((currentItems) =>
                  currentItems.map((currentItem) =>
                    currentItem.vaultId === item.vaultId
                      ? {
                          ...currentItem,
                          watchCount: newWatchCount,
                          vaultStatus: "watched",
                        }
                      : currentItem
                  )
                )
              }
            />
          ))}
        </section>
      ) : (
        <section className="mt-6 rounded-3xl border border-dashed border-zinc-700 bg-[#151515] px-6 py-16 text-center">
          <p className="text-4xl">🗂️</p>

          <h3 className="mt-5 text-2xl font-bold">
            Nessun contenuto trovato
          </h3>

          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActiveFilter("all");
              setMediaTypeFilter(null);
            }}
            className="mt-6 rounded-full bg-[#7C3AED] px-6 py-3 font-bold text-white transition hover:bg-[#6D28D9]"
          >
            Mostra tutto
          </button>
        </section>
      )}
    </>
  );
}

function VaultCard({
  item,
  favoriteSaving,
  onFavoriteToggle,
  onStatusChange,
  onRemoved,
  onWatchCountChange,
}: {
  item: VaultMediaItem;
  favoriteSaving: boolean;
  onFavoriteToggle: () => void;
  onStatusChange: (
    newStatus: "watched" | "watchlist"
  ) => void;
  onRemoved: () => void;
  onWatchCountChange: (newWatchCount: number) => void;
}) {
  const isSeries = item.mediaType === "tv";

  const percentage =
    item.totalEpisodes > 0
      ? Math.round(
          (item.watchedEpisodes /
            item.totalEpisodes) *
            100
        )
      : 0;

  const href = isSeries
    ? `/serie/${item.tmdbId}`
    : `/film/${item.tmdbId}`;

  let statusLabel = "👀 Da vedere";
  let statusClass = "bg-[#7C3AED] text-white";

  if (
    isSeries &&
    item.progressStatus === "in_progress"
  ) {
    statusLabel = `🕒 In corso · ${percentage}%`;
    statusClass = "bg-amber-500 text-black";
  } else if (
    (isSeries &&
      item.progressStatus === "watched") ||
    (!isSeries &&
      item.vaultStatus === "watched")
  ) {
    statusLabel = "✓ Completato";
    statusClass = "bg-green-600 text-white";
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-[#151515] transition hover:-translate-y-1 hover:border-[#7C3AED]">
      <div className="relative">
        <Link href={href} className="block">
          <div className="relative h-96 overflow-hidden bg-zinc-900">
            <img
              src={item.posterUrl}
              alt={item.title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

            <span className="absolute left-3 top-3 rounded-full bg-black/75 px-3 py-1 text-xs font-bold text-white">
              {isSeries ? "Serie TV" : "Film"}
            </span>

            <span className="absolute right-3 top-3 rounded-full bg-black/75 px-3 py-1 text-xs font-bold text-[#F4C542]">
              ⭐ {item.voteAverage.toFixed(1)}
            </span>

            <span
              className={`absolute bottom-4 left-4 rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}
            >
              {statusLabel}
            </span>
          </div>
        </Link>

        <button
          type="button"
          onClick={onFavoriteToggle}
          disabled={favoriteSaving}
          title={
            item.isFavorite
              ? "Rimuovi dai Preferiti"
              : "Aggiungi ai Preferiti"
          }
          aria-label={
            item.isFavorite
              ? "Rimuovi dai Preferiti"
              : "Aggiungi ai Preferiti"
          }
          className={`absolute bottom-4 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border text-3xl shadow-xl backdrop-blur-md transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60 ${
            item.isFavorite
              ? "border-red-400 bg-red-600 text-white"
              : "border-white/40 bg-black/70 text-white hover:border-red-400 hover:text-red-400"
          }`}
        >
          {favoriteSaving
            ? "…"
            : item.isFavorite
              ? "♥"
              : "♡"}
        </button>
      </div>

      <Link href={href} className="block">
        <div className="p-5">
          <h3 className="line-clamp-1 text-xl font-bold">
            {item.title}
          </h3>

          <p className="mt-2 text-sm text-zinc-400">
            {item.year} • {item.runtimeLabel}
          </p>

          {isSeries &&
            item.progressStatus ===
              "in_progress" && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>
                    {item.watchedEpisodes} di{" "}
                    {item.totalEpisodes} episodi
                  </span>

                  <span>{percentage}%</span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-[#7C3AED]"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>
            )}

          <div
            className={`mt-5 rounded-full px-4 py-2 text-center text-sm font-bold ${
              isSeries &&
              item.progressStatus === "in_progress"
                ? "bg-amber-500/15 text-amber-300"
                : item.vaultStatus === "watched"
                  ? "bg-green-600/15 text-green-300"
                  : "bg-[#7C3AED]/15 text-[#A78BFA]"
            }`}
          >
            {isSeries &&
            item.progressStatus === "in_progress"
              ? "Continua"
              : item.vaultStatus === "watched"
                ? isSeries
                  ? "Serie completata"
                  : "Film completato"
                : "Apri scheda"}
          </div>
        </div>
      </Link>

      <div className="mt-auto">
        <VaultCardActions
          vaultId={item.vaultId}
          tmdbId={item.tmdbId}
          mediaType={item.mediaType}
          vaultStatus={item.vaultStatus}
          progressStatus={item.progressStatus}
          watchCount={item.watchCount}
          onStatusChange={onStatusChange}
          onRemoved={onRemoved}
          onWatchCountChange={onWatchCountChange}
        />
      </div>
    </article>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <article className="rounded-3xl border border-zinc-800 bg-[#151515] p-5">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>

        <span className="rounded-full bg-[#7C3AED]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#A78BFA]">
          Vault
        </span>
      </div>

      <p className="mt-5 text-3xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-sm text-zinc-400">
        {label}
      </p>
    </article>
  );
}

function getFilterTitle(
  filter: FilterType,
  mediaType: "movie" | "tv" | null
) {
  if (filter === "movie") {
    return "Film";
  }

  if (filter === "tv") {
    return "Serie TV";
  }

  if (filter === "in_progress") {
    return "Serie in corso";
  }

  if (filter === "watched") {
    if (mediaType === "movie") {
      return "Film visti";
    }

    if (mediaType === "tv") {
      return "Serie completate";
    }

    return "Contenuti completati";
  }

  if (filter === "watchlist") {
    return "Da vedere";
  }

  if (filter === "favorites") {
    return "Preferiti";
  }

  return "Tutto il Vault";
}

function getValidFilter(
  value: string | null
): FilterType {
  if (
    value === "movie" ||
    value === "tv" ||
    value === "in_progress" ||
    value === "watched" ||
    value === "watchlist" ||
    value === "favorites"
  ) {
    return value;
  }

  return "all";
}

function getValidMediaType(
  value: string | null
): "movie" | "tv" | null {
  if (value === "movie" || value === "tv") {
    return value;
  }

  return null;
}