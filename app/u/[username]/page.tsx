import Link from "next/link";
import { notFound } from "next/navigation";

import Navbar from "../../../components/Navbar";
import FriendshipButton from "../../../components/FriendshipButton";

import { createClient } from "../../../lib/supabase/server";

import {
  getMovie,
  getPosterUrl,
  getSeries,
} from "../../../lib/tmdb";

type UserProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
};

type VaultItem = {
  id: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  status: string;
  rating: number | null;
  review: string | null;
  created_at: string | null;
};

type SeriesProgress = {
  series_id: number;
  status:
    | "watchlist"
    | "in_progress"
    | "watched";
  watched_episodes: number;
  total_episodes: number;
};

type MovieDetails = {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
};

type SeriesDetails = {
  id: number;
  name: string;
  first_air_date: string;
  poster_path: string | null;
};

type RecentContent = {
  id: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  year: string;
  posterUrl: string;
  status: string;
  rating: number | null;
  review: string | null;
  createdAt: string | null;
};

type FriendshipStatus =
  | "none"
  | "sent"
  | "received"
  | "accepted"
  | "rejected";

function getActivityLabel(
  displayName: string,
  content: RecentContent
) {
  if (content.review) {
    return `${displayName} ha recensito`;
  }

  if (content.rating !== null) {
    return `${displayName} ha dato ${content.rating}/10 a`;
  }

  if (content.status === "watched") {
    return content.mediaType === "movie"
      ? `${displayName} ha visto`
      : `${displayName} ha completato`;
  }

  if (content.status === "watchlist") {
    return `${displayName} ha aggiunto alla watchlist`;
  }

  return `${displayName} ha aggiornato`;
}

function formatActivityDate(
  date: string | null
) {
  if (!date) {
    return null;
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

export default async function UserProfilePage({
  params,
}: UserProfilePageProps) {
  const { username } = await params;

  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      `
        id,
        username,
        display_name,
        bio,
        avatar_url,
        cover_url,
        favorite_genres,
        profile_visibility
      `
    )
    .eq("username", username)
    .single();

  if (
    profileError ||
    !profile
  ) {
    notFound();
  }

  const isOwnProfile =
    user?.id === profile.id;

  const displayName =
    profile.display_name?.trim() ||
    profile.username;

  const profileInitial =
    displayName
      .charAt(0)
      .toUpperCase();

  /*
   * RELAZIONE DI AMICIZIA
   */
  let friendshipId:
    | string
    | null = null;

  let friendshipStatus:
    FriendshipStatus = "none";

  let friendshipRequesterId:
    | string
    | null = null;

  let friendshipReceiverId:
    | string
    | null = null;

  if (
    user &&
    !isOwnProfile
  ) {
    const {
      data: friendship,
      error: friendshipError,
    } = await supabase
      .from("friendships")
      .select(
        `
          id,
          requester_id,
          receiver_id,
          status
        `
      )
      .or(
        `and(requester_id.eq.${user.id},receiver_id.eq.${profile.id}),and(requester_id.eq.${profile.id},receiver_id.eq.${user.id})`
      )
      .maybeSingle();

    if (friendshipError) {
      console.error(
        "Errore amicizia:",
        friendshipError
      );
    }

    if (friendship) {
      friendshipId =
        friendship.id;

      friendshipRequesterId =
        friendship.requester_id;

      friendshipReceiverId =
        friendship.receiver_id;

      if (
        friendship.status ===
        "accepted"
      ) {
        friendshipStatus =
          "accepted";
      } else if (
        friendship.status ===
        "rejected"
      ) {
        friendshipStatus =
          "rejected";
      } else if (
        friendship.requester_id ===
        user.id
      ) {
        friendshipStatus =
          "sent";
      } else {
        friendshipStatus =
          "received";
      }
    }
  }

  const isFriend =
  friendshipStatus === "accepted";

const isPrivate =
  profile.profile_visibility === "private" &&
  !isOwnProfile &&
  !isFriend;

  if (isPrivate) {
    return (
      <main className="min-h-screen bg-[#121212] text-[#F8FAFC]">
        <Navbar />

        <section className="mx-auto max-w-6xl px-6 pb-24 pt-32">
          <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-[#18181B]">
            {profile.cover_url ? (
              <div
                className="h-44 bg-cover bg-center md:h-56"
                style={{
                  backgroundImage: `url("${profile.cover_url}")`,
                }}
              />
            ) : (
              <div className="h-44 bg-gradient-to-r from-[#7C3AED]/40 via-[#18181B] to-[#2563EB]/30 md:h-56" />
            )}

            <div className="px-6 pb-10 md:px-10">
              <div className="-mt-14 flex flex-col gap-5 md:-mt-16 md:flex-row md:items-end">
                {profile.avatar_url ? (
                  <div
                    className="h-28 w-28 shrink-0 rounded-full border-4 border-[#18181B] bg-cover bg-center shadow-2xl md:h-32 md:w-32"
                    style={{
                      backgroundImage: `url("${profile.avatar_url}")`,
                    }}
                  />
                ) : (
                  <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-4 border-[#18181B] bg-[#7C3AED] text-4xl font-bold text-white shadow-2xl md:h-32 md:w-32">
                    {profileInitial}
                  </div>
                )}

                <div className="pb-2">
                  <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#A78BFA]">
                    Profilo ViewVault
                  </p>

                  <h1 className="mt-2 text-4xl font-bold md:text-5xl">
                    {displayName}
                  </h1>

                  <p className="mt-2 text-lg text-zinc-400">
                    @{profile.username}
                  </p>
                </div>
              </div>

              {user &&
                !isOwnProfile && (
                  <div className="mt-8">
                    <FriendshipButton
                      currentUserId={
                        user.id
                      }
                      profileUserId={
                        profile.id
                      }
                      initialFriendshipId={
                        friendshipId
                      }
                      initialStatus={
                        friendshipStatus
                      }
                      initialRequesterId={
                        friendshipRequesterId
                      }
                      initialReceiverId={
                        friendshipReceiverId
                      }
                    />
                  </div>
                )}

              <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
                <div className="text-4xl">
                  🔒
                </div>

                <h2 className="mt-4 text-2xl font-bold">
                  Profilo privato
                </h2>

                <p className="mx-auto mt-3 max-w-xl leading-7 text-zinc-400">
                  Questo utente ha scelto di mantenere
                  privati il proprio Vault, le statistiche
                  e le attività.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const [
    vaultResponse,
    progressResponse,
    watchedEpisodesResponse,
  ] = await Promise.all([
    supabase
      .from("vault_items")
      .select(
        "id, tmdb_id, media_type, status, rating, review, created_at"
      )
      .eq(
        "user_id",
        profile.id
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      ),

    supabase
      .from(
        "series_progress"
      )
      .select(
        "series_id, status, watched_episodes, total_episodes"
      )
      .eq(
        "user_id",
        profile.id
      ),

    supabase
      .from(
        "watched_episodes"
      )
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "user_id",
        profile.id
      ),
  ]);

  const vaultItems =
    (vaultResponse.data as
      | VaultItem[]
      | null) ?? [];

  const seriesProgress =
    (progressResponse.data as
      | SeriesProgress[]
      | null) ?? [];

  const watchedMoviesCount =
    vaultItems.filter(
      (item) =>
        item.media_type ===
          "movie" &&
        item.status ===
          "watched"
    ).length;

  const watchedSeriesCount =
    seriesProgress.filter(
      (item) =>
        item.status ===
        "watched"
    ).length;

  const watchedEpisodesCount =
    watchedEpisodesResponse.count ??
    0;

  const ratings =
    vaultItems
      .map(
        (item) =>
          item.rating
      )
      .filter(
        (
          rating
        ): rating is number =>
          typeof rating ===
          "number"
      );

  const averageRating =
    ratings.length > 0
      ? (
          ratings.reduce(
            (
              total,
              rating
            ) =>
              total +
              rating,
            0
          ) /
          ratings.length
        ).toFixed(1)
      : null;

  const recentVaultItems =
    vaultItems.slice(0, 8);

  const recentResults =
    await Promise.allSettled(
      recentVaultItems.map(
        async (
          item
        ): Promise<RecentContent> => {
          if (
            item.media_type ===
            "movie"
          ) {
            const movie =
              (await getMovie(
                String(
                  item.tmdb_id
                )
              )) as MovieDetails;

            return {
              id: item.id,
              tmdbId:
                movie.id,
              mediaType:
                "movie",
              title:
                movie.title,
              year:
                movie.release_date
                  ? movie.release_date.slice(
                      0,
                      4
                    )
                  : "N/D",
              posterUrl:
                getPosterUrl(
                  movie.poster_path
                ),
              status:
                item.status,
              rating:
                item.rating,
              review:
                item.review,
              createdAt:
                item.created_at,
            };
          }

          const series =
            (await getSeries(
              String(
                item.tmdb_id
              )
            )) as SeriesDetails;

          return {
            id: item.id,
            tmdbId:
              series.id,
            mediaType:
              "tv",
            title:
              series.name,
            year:
              series.first_air_date
                ? series.first_air_date.slice(
                    0,
                    4
                  )
                : "N/D",
            posterUrl:
              getPosterUrl(
                series.poster_path
              ),
            status:
              item.status,
            rating:
              item.rating,
            review:
              item.review,
            createdAt:
              item.created_at,
          };
        }
      )
    );

  const recentContents =
    recentResults
      .filter(
        (
          result
        ): result is PromiseFulfilledResult<RecentContent> =>
          result.status ===
          "fulfilled"
      )
      .map(
        (result) =>
          result.value
      );

  return (
    <main className="min-h-screen bg-[#121212] text-[#F8FAFC]">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-32">
        {/* PROFILO */}
        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-[#18181B]">
          {profile.cover_url ? (
            <div
              className="h-44 bg-cover bg-center md:h-56"
              style={{
                backgroundImage: `url("${profile.cover_url}")`,
              }}
            />
          ) : (
            <div className="h-44 bg-gradient-to-r from-[#7C3AED]/40 via-[#18181B] to-[#2563EB]/30 md:h-56" />
          )}

          <div className="px-6 pb-8 md:px-10">
            <div className="-mt-14 flex flex-col gap-6 md:-mt-16 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-5 md:flex-row md:items-end">
                {profile.avatar_url ? (
                  <div
                    className="h-28 w-28 shrink-0 rounded-full border-4 border-[#18181B] bg-cover bg-center shadow-2xl md:h-32 md:w-32"
                    style={{
                      backgroundImage: `url("${profile.avatar_url}")`,
                    }}
                  />
                ) : (
                  <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-4 border-[#18181B] bg-[#7C3AED] text-4xl font-bold text-white shadow-2xl md:h-32 md:w-32">
                    {profileInitial}
                  </div>
                )}

                <div className="pb-2">
                  <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#A78BFA]">
                    Profilo ViewVault
                  </p>

                  <h1 className="mt-2 text-4xl font-bold md:text-5xl">
                    {displayName}
                  </h1>

                  <p className="mt-2 text-lg text-zinc-400">
                    @{profile.username}
                  </p>
                </div>
              </div>

              {isOwnProfile ? (
                <Link
                  href="/account/profile"
                  className="mb-2 inline-flex w-fit items-center justify-center rounded-full bg-[#7C3AED] px-6 py-3 font-bold text-white transition hover:bg-[#2563EB]"
                >
                  Modifica profilo
                </Link>
              ) : (
                user && (
                  <div className="mb-2">
                    <FriendshipButton
                      currentUserId={
                        user.id
                      }
                      profileUserId={
                        profile.id
                      }
                      initialFriendshipId={
                        friendshipId
                      }
                      initialStatus={
                        friendshipStatus
                      }
                      initialRequesterId={
                        friendshipRequesterId
                      }
                      initialReceiverId={
                        friendshipReceiverId
                      }
                    />
                  </div>
                )
              )}
            </div>

            {profile.bio && (
              <p className="mt-8 max-w-3xl text-lg leading-8 text-zinc-300">
                {profile.bio}
              </p>
            )}

            {profile.favorite_genres &&
              profile
                .favorite_genres
                .length >
                0 && (
                <div className="mt-8">
                  <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-zinc-500">
                    Generi preferiti
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {profile.favorite_genres.map(
                      (
                        genre: string
                      ) => (
                        <span
                          key={
                            genre
                          }
                          className="rounded-full border border-[#7C3AED]/40 bg-[#7C3AED]/10 px-4 py-2 text-sm font-semibold text-[#C4B5FD]"
                        >
                          {
                            genre
                          }
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* STATISTICHE */}
        <section className="mt-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#8B5CF6]">
            Il Vault di{" "}
            {displayName}
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Statistiche
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: "🎬",
                label:
                  "Film visti",
                value:
                  watchedMoviesCount,
              },
              {
                icon: "📺",
                label:
                  "Serie completate",
                value:
                  watchedSeriesCount,
              },
              {
                icon: "🍿",
                label:
                  "Episodi visti",
                value:
                  watchedEpisodesCount,
              },
              {
                icon: "⭐",
                label:
                  "Media voti",
                value:
                  averageRating ??
                  "—",
              },
            ].map(
              (stat) => (
                <div
                  key={
                    stat.label
                  }
                  className="rounded-3xl border border-zinc-800 bg-[#18181B] p-6"
                >
                  <div className="text-3xl">
                    {
                      stat.icon
                    }
                  </div>

                  <p className="mt-5 text-sm font-semibold text-zinc-500">
                    {
                      stat.label
                    }
                  </p>

                  <p className="mt-2 text-4xl font-bold">
                    {
                      stat.value
                    }
                  </p>
                </div>
              )
            )}
          </div>
        </section>

        {/* ATTIVITÀ */}
        <section className="mt-10 rounded-3xl border border-zinc-800 bg-[#18181B] p-6 md:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
            Attività
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Attività recente
          </h2>

          <p className="mt-2 text-zinc-500">
            Gli ultimi
            aggiornamenti pubblici
            di {displayName}.
          </p>

          {recentContents.length >
          0 ? (
            <div className="mt-7 space-y-4">
              {recentContents.map(
                (
                  content
                ) => {
                  const href =
                    content.mediaType ===
                    "movie"
                      ? `/film/${content.tmdbId}`
                      : `/serie/${content.tmdbId}`;

                  const activityLabel =
                    getActivityLabel(
                      displayName,
                      content
                    );

                  const activityDate =
                    formatActivityDate(
                      content.createdAt
                    );

                  return (
                    <article
                      key={
                        content.id
                      }
                      className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5 transition hover:border-[#7C3AED]/60"
                    >
                      <div className="flex gap-4">
                        <Link
                          href={
                            href
                          }
                          className="shrink-0"
                        >
                          <img
                            src={
                              content.posterUrl
                            }
                            alt={
                              content.title
                            }
                            className="h-32 w-24 rounded-2xl object-cover"
                          />
                        </Link>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm text-zinc-400">
                                {
                                  activityLabel
                                }
                              </p>

                              <Link
                                href={
                                  href
                                }
                                className="mt-1 block text-xl font-bold transition hover:text-[#A78BFA]"
                              >
                                {
                                  content.title
                                }
                              </Link>

                              <p className="mt-1 text-sm text-zinc-500">
                                {content.mediaType ===
                                "movie"
                                  ? "Film"
                                  : "Serie TV"}{" "}
                                ·{" "}
                                {
                                  content.year
                                }
                              </p>
                            </div>

                            {activityDate && (
                              <span className="shrink-0 text-xs text-zinc-600">
                                {
                                  activityDate
                                }
                              </span>
                            )}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                content.status ===
                                "watched"
                                  ? "bg-green-600/20 text-green-400"
                                  : "bg-[#7C3AED]/15 text-[#A78BFA]"
                              }`}
                            >
                              {content.status ===
                              "watched"
                                ? "✓ Visto"
                                : "📌 Watchlist"}
                            </span>

                            {content.rating !==
                              null && (
                              <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">
                                ⭐{" "}
                                {
                                  content.rating
                                }
                                /10
                              </span>
                            )}
                          </div>

                          {content.review && (
                            <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/20 p-4">
                              <p className="text-xs font-bold uppercase tracking-wider text-[#A78BFA]">
                                Recensione
                              </p>

                              <p className="mt-2 line-clamp-3 leading-6 text-zinc-300">
                                “
                                {
                                  content.review
                                }
                                ”
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-12 text-center">
              <div className="text-4xl">
                🎞️
              </div>

              <p className="mt-4 font-semibold">
                Nessuna attività
                ancora
              </p>
            </div>
          )}
        </section>

        {/* COMMUNITY */}
        <section className="mt-8 rounded-3xl border border-[#7C3AED]/30 bg-[#7C3AED]/10 p-6 md:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
            Community
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Amici nel Vault
          </h2>

          <p className="mt-3 max-w-2xl leading-7 text-zinc-300">
            Connettiti con altri
            utenti ViewVault,
            condividi ciò che
            guardi e scopri nuovi
            titoli attraverso i
            tuoi amici.
          </p>
        </section>
      </section>
    </main>
  );
}