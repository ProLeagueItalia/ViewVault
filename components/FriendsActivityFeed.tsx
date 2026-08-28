"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "../lib/supabase/client";

type ActivityType =
  | "movie_watch"
  | "episode_watch"
  | "comment";

type MediaType = "movie" | "tv";

type ActivityRow = {
  activity_type: ActivityType;
  user_id: string;
  tmdb_id: number;
  media_type: MediaType;
  season_number: number | null;
  episode_number: number | null;
  content: string | null;
  gif_url: string | null;
  image_url: string | null;
  is_spoiler: boolean;
  occurred_at: string;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type MediaDetails = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterUrl: string | null;
};

type EpisodeReference = {
  seasonNumber: number | null;
  episodeNumber: number | null;
};

type FeedItem = ActivityRow & {
  profile: ProfileRow | null;
  media: MediaDetails | null;
  groupedEpisodes?: EpisodeReference[];
};

type TmdbMovieResponse = {
  id: number;
  title?: string;
  poster_path?: string | null;
};

type TmdbSeriesResponse = {
  id: number;
  name?: string;
  poster_path?: string | null;
};

const FEED_LIMIT = 30;

/*
 * Due visioni della stessa serie vengono considerate
 * appartenenti alla stessa sessione se distano
 * al massimo 6 ore.
 */
const EPISODE_GROUP_WINDOW_MS =
  6 * 60 * 60 * 1000;

export default function FriendsActivityFeed() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [items, setItems] = useState<FeedItem[]>(
    []
  );

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [revealedSpoilers, setRevealedSpoilers] =
    useState<Set<string>>(new Set());

  const loadFeed = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase.rpc(
        "get_friends_activity_feed",
        {
          p_limit: FEED_LIMIT,
        }
      );

      if (error) {
        throw error;
      }

      const activities =
        (data as ActivityRow[] | null) ?? [];

      if (activities.length === 0) {
        setItems([]);
        return;
      }

      /*
       * PROFILI
       */

      const userIds = Array.from(
        new Set(
          activities.map(
            (activity) => activity.user_id
          )
        )
      );

      const {
        data: profilesData,
        error: profilesError,
      } = await supabase
        .from("profiles")
        .select(
          "id, username, display_name, avatar_url"
        )
        .in("id", userIds);

      if (profilesError) {
        throw profilesError;
      }

      const profiles =
        (profilesData as ProfileRow[] | null) ??
        [];

      const profileMap = new Map(
        profiles.map((profile) => [
          profile.id,
          profile,
        ])
      );

      /*
       * CONTENUTI TMDB
       */

      const uniqueMedia = Array.from(
        new Map(
          activities.map((activity) => [
            `${activity.media_type}-${activity.tmdb_id}`,
            {
              tmdbId: Number(activity.tmdb_id),
              mediaType: activity.media_type,
            },
          ])
        ).values()
      );

      const mediaResults =
        await Promise.allSettled(
          uniqueMedia.map(async (media) => {
            const endpoint =
              media.mediaType === "movie"
                ? `/api/tmdb/movie/${media.tmdbId}`
                : `/api/tmdb/tv/${media.tmdbId}`;

            const response = await fetch(endpoint);

            if (!response.ok) {
              throw new Error(
                `TMDB request failed: ${response.status}`
              );
            }

            const result = (await response.json()) as
              | TmdbMovieResponse
              | TmdbSeriesResponse;

            const title =
              media.mediaType === "movie"
                ? (result as TmdbMovieResponse)
                    .title
                : (result as TmdbSeriesResponse)
                    .name;

            return {
              tmdbId: media.tmdbId,
              mediaType: media.mediaType,
              title:
                title ??
                "Contenuto ViewVault",
              posterUrl: result.poster_path
                ? `https://image.tmdb.org/t/p/w342${result.poster_path}`
                : null,
            } satisfies MediaDetails;
          })
        );

      const mediaMap = new Map<
        string,
        MediaDetails
      >();

      for (const result of mediaResults) {
        if (result.status === "fulfilled") {
          mediaMap.set(
            `${result.value.mediaType}-${result.value.tmdbId}`,
            result.value
          );
        }
      }

      /*
       * ARRICCHIMENTO EVENTI
       */

      const enrichedItems: FeedItem[] =
        activities.map((activity) => ({
          ...activity,
          profile:
            profileMap.get(activity.user_id) ??
            null,
          media:
            mediaMap.get(
              `${activity.media_type}-${activity.tmdb_id}`
            ) ?? null,
        }));

      /*
       * RAGGRUPPAMENTO EPISODI
       */

      const groupedItems =
        groupEpisodeActivities(
          enrichedItems
        );

      setItems(groupedItems);
    } catch (error) {
      console.error(
        "Errore caricamento feed amici:",
        error
      );

      setItems([]);

      setErrorMessage(
        "Non è stato possibile caricare le attività degli amici."
      );
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  function toggleSpoiler(key: string) {
    setRevealedSpoilers((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  return (
    <section className="mt-12 overflow-hidden rounded-[2rem] border border-zinc-800 bg-[#18181B]">
      <div className="border-b border-zinc-800 p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
              La tua rete
            </p>

            <h2 className="mt-2 text-3xl font-black text-white">
              👥 Attività degli amici
            </h2>

            <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
              Scopri cosa stanno guardando e
              commentando i tuoi amici su
              ViewVault.
            </p>
          </div>

          <button
            type="button"
            onClick={loadFeed}
            disabled={isLoading}
            className="w-fit rounded-full border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-300 transition hover:border-[#7C3AED] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading
              ? "Aggiornamento..."
              : "↻ Aggiorna"}
          </button>
        </div>
      </div>

      <div className="p-6 md:p-8">
        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-3xl border border-zinc-800 bg-black/20 px-6 py-14 text-center text-zinc-400">
            Caricamento attività...
          </div>
        ) : items.length === 0 ? (
          <EmptyFeed />
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => {
              const key =
                createFeedItemKey(
                  item,
                  index
                );

              const spoilerVisible =
                !item.is_spoiler ||
                revealedSpoilers.has(key);

              return (
                <ActivityCard
                  key={key}
                  item={item}
                  spoilerVisible={
                    spoilerVisible
                  }
                  onToggleSpoiler={() =>
                    toggleSpoiler(key)
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/*
 * CARD ATTIVITÀ
 */

function ActivityCard({
  item,
  spoilerVisible,
  onToggleSpoiler,
}: {
  item: FeedItem;
  spoilerVisible: boolean;
  onToggleSpoiler: () => void;
}) {
  const profile = item.profile;

  const displayName =
    profile?.display_name ||
    profile?.username ||
    "Utente ViewVault";

  const mediaTitle =
    item.media?.title ??
    "Contenuto ViewVault";

  const mediaHref =
    item.media_type === "movie"
      ? `/film/${item.tmdb_id}`
      : `/serie/${item.tmdb_id}`;

  const episodeSummary =
    item.activity_type ===
    "episode_watch"
      ? formatEpisodeSummary(
          item.groupedEpisodes ??
            [
              {
                seasonNumber:
                  item.season_number,
                episodeNumber:
                  item.episode_number,
              },
            ]
        )
      : null;

  return (
    <article className="overflow-hidden rounded-3xl border border-zinc-800 bg-black/20 transition hover:border-[#7C3AED]/40">
      <div className="flex gap-4 p-5 md:p-6">
        <ProfileAvatar
          profile={profile}
          displayName={displayName}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              {profile ? (
                <Link
                  href={`/u/${profile.username}`}
                  className="font-bold text-white transition hover:text-[#C4B5FD]"
                >
                  {displayName}
                </Link>
              ) : (
                <span className="font-bold text-white">
                  {displayName}
                </span>
              )}

              {profile?.username && (
                <span className="ml-2 text-sm text-zinc-500">
                  @{profile.username}
                </span>
              )}

              <p className="mt-2 leading-7 text-zinc-300">
                <ActivitySentence
                  item={item}
                  mediaTitle={mediaTitle}
                  mediaHref={mediaHref}
                />
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-500">
                {item.activity_type ===
                  "episode_watch" &&
                episodeSummary ? (
                  <span>
                    📺 {episodeSummary}
                  </span>
                ) : (
                  <span>
                    {activityIcon(
                      item.activity_type
                    )}{" "}
                    {activityLabel(
                      item.activity_type
                    )}
                  </span>
                )}

                <span>·</span>

                <span>
                  {formatRelativeDate(
                    item.occurred_at
                  )}
                </span>

                {item.is_spoiler && (
                  <>
                    <span>·</span>

                    <span className="text-amber-400">
                      ⚠️ Spoiler
                    </span>
                  </>
                )}
              </div>
            </div>

            <MediaPoster
              item={item}
              href={mediaHref}
              title={mediaTitle}
            />
          </div>

          {item.activity_type === "comment" && (
            <div className="mt-5">
              {item.is_spoiler &&
              !spoilerVisible ? (
                <button
                  type="button"
                  onClick={onToggleSpoiler}
                  className="w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-7 text-center transition hover:bg-amber-500/15"
                >
                  <span className="block font-bold text-amber-300">
                    ⚠️ Questo commento
                    contiene spoiler
                  </span>

                  <span className="mt-2 block text-sm text-zinc-400">
                    Clicca per mostrarlo
                  </span>
                </button>
              ) : (
                <CommentPreview
                  item={item}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/*
 * FRASE ATTIVITÀ
 */

function ActivitySentence({
  item,
  mediaTitle,
  mediaHref,
}: {
  item: FeedItem;
  mediaTitle: string;
  mediaHref: string;
}) {
  if (
    item.activity_type ===
    "movie_watch"
  ) {
    return (
      <>
        ha visto{" "}
        <MediaLink
          href={mediaHref}
          title={mediaTitle}
        />
      </>
    );
  }

  if (
    item.activity_type ===
    "episode_watch"
  ) {
    const episodeCount =
      item.groupedEpisodes?.length ?? 1;

    if (episodeCount > 1) {
      return (
        <>
          ha guardato{" "}
          <strong className="text-white">
            {episodeCount} episodi
          </strong>{" "}
          di{" "}
          <MediaLink
            href={mediaHref}
            title={mediaTitle}
          />
        </>
      );
    }

    return (
      <>
        ha guardato{" "}
        <strong className="text-white">
          S{item.season_number ?? "?"} E
          {item.episode_number ?? "?"}
        </strong>{" "}
        di{" "}
        <MediaLink
          href={mediaHref}
          title={mediaTitle}
        />
      </>
    );
  }

  return (
    <>
      ha commentato{" "}
      <MediaLink
        href={mediaHref}
        title={mediaTitle}
      />
    </>
  );
}

/*
 * LINK CONTENUTO
 */

function MediaLink({
  href,
  title,
}: {
  href: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="font-bold text-[#C4B5FD] transition hover:text-white"
    >
      {title}
    </Link>
  );
}

/*
 * AVATAR
 */

function ProfileAvatar({
  profile,
  displayName,
}: {
  profile: ProfileRow | null;
  displayName: string;
}) {
  const avatar =
    profile?.avatar_url;

  const content = avatar ? (
    <Image
      src={avatar}
      alt={displayName}
      fill
      sizes="48px"
      className="object-cover"
    />
  ) : (
    <span className="text-lg font-black text-[#C4B5FD]">
      {displayName
        .slice(0, 1)
        .toUpperCase() || "V"}
    </span>
  );

  if (profile) {
    return (
      <Link
        href={`/u/${profile.username}`}
        className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-900"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-900">
      {content}
    </div>
  );
}

/*
 * POSTER
 */

function MediaPoster({
  item,
  href,
  title,
}: {
  item: FeedItem;
  href: string;
  title: string;
}) {
  if (!item.media?.posterUrl) {
    return null;
  }

  return (
    <Link
      href={href}
      className="relative hidden h-24 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-800 sm:block"
    >
      <Image
        src={item.media.posterUrl}
        alt={title}
        fill
        sizes="64px"
        className="object-cover"
      />
    </Link>
  );
}

/*
 * COMMENTO
 */

function CommentPreview({
  item,
}: {
  item: FeedItem;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
      {item.content && (
        <p className="whitespace-pre-wrap break-words leading-7 text-zinc-300">
          {item.content}
        </p>
      )}

      {item.gif_url && (
        <img
          src={item.gif_url}
          alt="GIF del commento"
          className="mt-4 max-h-72 max-w-full rounded-xl border border-zinc-800 object-contain"
        />
      )}

      {item.image_url && (
        <img
          src={item.image_url}
          alt="Immagine del commento"
          className="mt-4 max-h-80 max-w-full rounded-xl border border-zinc-800 object-contain"
        />
      )}
    </div>
  );
}

/*
 * FEED VUOTO
 */

function EmptyFeed() {
  return (
    <div className="rounded-3xl border border-dashed border-zinc-700 bg-black/20 px-6 py-14 text-center">
      <div className="text-4xl">
        🍿
      </div>

      <h3 className="mt-4 text-xl font-bold text-white">
        Il feed è ancora tranquillo
      </h3>

      <p className="mx-auto mt-2 max-w-xl leading-7 text-zinc-500">
        Quando i tuoi amici pubblici
        guarderanno film o serie e
        parteciperanno alle discussioni, le
        loro attività appariranno qui.
      </p>
    </div>
  );
}

/*
 * RAGGRUPPAMENTO EPISODI
 */

function groupEpisodeActivities(
  items: FeedItem[]
): FeedItem[] {
  const result: FeedItem[] = [];

  /*
   * Memorizziamo l'ultimo gruppo aperto
   * per ogni combinazione utente + serie.
   */
  const activeGroups = new Map<
    string,
    {
      resultIndex: number;
      lastEventTime: number;
    }
  >();

  for (const item of items) {
    if (
      item.activity_type !==
      "episode_watch"
    ) {
      result.push(item);
      continue;
    }

    const groupKey =
      `${item.user_id}-${item.tmdb_id}`;

    const currentTime =
      new Date(
        item.occurred_at
      ).getTime();

    const existingGroup =
      activeGroups.get(groupKey);

    const canJoinGroup =
      existingGroup &&
      Number.isFinite(currentTime) &&
      Math.abs(
        existingGroup.lastEventTime -
          currentTime
      ) <= EPISODE_GROUP_WINDOW_MS;

    if (canJoinGroup) {
      const existingItem =
        result[
          existingGroup.resultIndex
        ];

      const episodes =
        existingItem.groupedEpisodes ??
        [
          {
            seasonNumber:
              existingItem.season_number,
            episodeNumber:
              existingItem.episode_number,
          },
        ];

      episodes.push({
        seasonNumber:
          item.season_number,
        episodeNumber:
          item.episode_number,
      });

      result[
        existingGroup.resultIndex
      ] = {
        ...existingItem,
        groupedEpisodes: episodes,
      };

      activeGroups.set(
        groupKey,
        {
          resultIndex:
            existingGroup.resultIndex,
          lastEventTime:
            currentTime,
        }
      );

      continue;
    }

    const resultIndex =
      result.length;

    result.push({
      ...item,
      groupedEpisodes: [
        {
          seasonNumber:
            item.season_number,
          episodeNumber:
            item.episode_number,
        },
      ],
    });

    activeGroups.set(
      groupKey,
      {
        resultIndex,
        lastEventTime:
          currentTime,
      }
    );
  }

  return result;
}

/*
 * RIASSUNTO EPISODI
 *
 * Esempi:
 *
 * S1 · E1
 * S1 · E1–E4
 * S1 · E1, E6–E7
 * S1 · E1–E3 · S2 · E1–E2
 */

function formatEpisodeSummary(
  episodes: EpisodeReference[]
) {
  const seasons = new Map<
    number,
    number[]
  >();

  for (const episode of episodes) {
    if (
      episode.seasonNumber === null ||
      episode.episodeNumber === null
    ) {
      continue;
    }

    const current =
      seasons.get(
        episode.seasonNumber
      ) ?? [];

    current.push(
      episode.episodeNumber
    );

    seasons.set(
      episode.seasonNumber,
      current
    );
  }

  if (seasons.size === 0) {
    return `${episodes.length} ${
      episodes.length === 1
        ? "episodio"
        : "episodi"
    }`;
  }

  return Array.from(
    seasons.entries()
  )
    .sort(
      ([seasonA], [seasonB]) =>
        seasonA - seasonB
    )
    .map(
      ([seasonNumber, episodeNumbers]) => {
        return `S${seasonNumber} · ${formatEpisodeNumbers(
          episodeNumbers
        )}`;
      }
    )
    .join(" · ");
}

/*
 * Trasforma:
 *
 * [1,2,3,6,7]
 *
 * in:
 *
 * E1–E3, E6–E7
 */

function formatEpisodeNumbers(
  episodeNumbers: number[]
) {
  /*
   * Manteniamo anche eventuali rewatch.
   * Se un episodio compare più volte
   * mostriamo per esempio E1 ×2.
   */

  const counts = new Map<
    number,
    number
  >();

  for (const episode of episodeNumbers) {
    counts.set(
      episode,
      (counts.get(episode) ?? 0) + 1
    );
  }

  const uniqueEpisodes =
    Array.from(
      counts.keys()
    ).sort((a, b) => a - b);

  const pieces: string[] = [];

  let index = 0;

  while (
    index <
    uniqueEpisodes.length
  ) {
    const start =
      uniqueEpisodes[index];

    let end = start;

    while (
      index + 1 <
        uniqueEpisodes.length &&
      uniqueEpisodes[index + 1] ===
        end + 1 &&
      counts.get(
        uniqueEpisodes[index + 1]
      ) === 1 &&
      counts.get(start) === 1
    ) {
      index += 1;

      end =
        uniqueEpisodes[index];
    }

    const startCount =
      counts.get(start) ?? 1;

    if (
      start === end
    ) {
      pieces.push(
        startCount > 1
          ? `E${start} ×${startCount}`
          : `E${start}`
      );
    } else {
      pieces.push(
        `E${start}–E${end}`
      );
    }

    index += 1;
  }

  return pieces.join(", ");
}

/*
 * CHIAVE CARD
 */

function createFeedItemKey(
  item: FeedItem,
  index: number
) {
  if (
    item.activity_type ===
    "episode_watch"
  ) {
    return [
      item.activity_type,
      item.user_id,
      item.tmdb_id,
      item.occurred_at,
      item.groupedEpisodes?.length ??
        1,
      index,
    ].join("-");
  }

  return [
    item.activity_type,
    item.user_id,
    item.tmdb_id,
    item.occurred_at,
    index,
  ].join("-");
}

/*
 * ICONE
 */

function activityIcon(
  type: ActivityType
) {
  switch (type) {
    case "movie_watch":
      return "🎬";

    case "episode_watch":
      return "📺";

    case "comment":
      return "💬";
  }
}

function activityLabel(
  type: ActivityType
) {
  switch (type) {
    case "movie_watch":
      return "Film";

    case "episode_watch":
      return "Serie TV";

    case "comment":
      return "Commento";
  }
}

/*
 * DATA RELATIVA
 */

function formatRelativeDate(
  date: string
) {
  const target =
    new Date(date);

  const now =
    new Date();

  const seconds =
    Math.round(
      (target.getTime() -
        now.getTime()) /
        1000
    );

  const absoluteSeconds =
    Math.abs(seconds);

  const formatter =
    new Intl.RelativeTimeFormat(
      "it",
      {
        numeric: "auto",
      }
    );

  if (absoluteSeconds < 60) {
    return formatter.format(
      seconds,
      "second"
    );
  }

  const minutes =
    Math.round(
      seconds / 60
    );

  if (
    Math.abs(minutes) < 60
  ) {
    return formatter.format(
      minutes,
      "minute"
    );
  }

  const hours =
    Math.round(
      minutes / 60
    );

  if (
    Math.abs(hours) < 24
  ) {
    return formatter.format(
      hours,
      "hour"
    );
  }

  const days =
    Math.round(
      hours / 24
    );

  if (
    Math.abs(days) < 7
  ) {
    return formatter.format(
      days,
      "day"
    );
  }

  return new Intl.DateTimeFormat(
    "it-IT",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(target);
}