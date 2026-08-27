import { NextResponse } from "next/server";

import { createClient } from "../../../../../lib/supabase/server";
import { getSeries } from "../../../../../lib/tmdb";

type ImportEpisode = {
  season_number: number;
  episode_number: number;
  watched_at?: string | null;
};

type ImportItem = {
  tmdb_id: number;
  status?: string | null;
  rating?: number | null;
  episodes?: ImportEpisode[];
};

type SeriesDetails = {
  id: number;
  number_of_episodes?: number;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Utente non autenticato.",
        },
        {
          status: 401,
        }
      );
    }

    const body = (await request.json()) as {
      items?: ImportItem[];
    };

    const items = body.items ?? [];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          error:
            "Nessuna serie disponibile per l'importazione.",
        },
        {
          status: 400,
        }
      );
    }

    if (items.length > 500) {
      return NextResponse.json(
        {
          error:
            "Troppe serie in una singola importazione.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Recuperiamo il numero REALE di episodi
     * direttamente da TMDB.
     *
     * Non utilizziamo il numero di episodi visti
     * contenuto nell'export come totale della serie.
     */
    const enrichedResults =
      await Promise.allSettled(
        items.map(async (item) => {
          if (
            !Number.isInteger(item.tmdb_id) ||
            item.tmdb_id <= 0
          ) {
            throw new Error(
              `TMDB ID non valido: ${item.tmdb_id}`
            );
          }

          const series =
            (await getSeries(
              String(item.tmdb_id)
            )) as SeriesDetails;

          const totalEpisodes =
            typeof series.number_of_episodes ===
              "number" &&
            series.number_of_episodes >= 0
              ? series.number_of_episodes
              : 0;

          const episodes = Array.isArray(
            item.episodes
          )
            ? item.episodes
                .filter(
                  (episode) =>
                    Number.isInteger(
                      episode.season_number
                    ) &&
                    Number.isInteger(
                      episode.episode_number
                    ) &&
                    episode.season_number >= 0 &&
                    episode.episode_number > 0
                )
                .map((episode) => ({
                  season_number:
                    episode.season_number,

                  episode_number:
                    episode.episode_number,

                  watched_at:
                    episode.watched_at ?? null,
                }))
            : [];

          const rating =
            typeof item.rating === "number" &&
            Number.isInteger(item.rating) &&
            item.rating >= 1 &&
            item.rating <= 10
              ? item.rating
              : null;

          return {
            tmdb_id: item.tmdb_id,
            total_episodes: totalEpisodes,
            status: item.status ?? null,
            rating,
            episodes,
          };
        })
      );

    const failedSeries: number[] = [];

    const importItems =
      enrichedResults.flatMap(
        (result, index) => {
          if (result.status === "fulfilled") {
            return [result.value];
          }

          failedSeries.push(
            items[index]?.tmdb_id ?? 0
          );

          console.error(
            "Serie esclusa dall'import TV Time:",
            result.reason
          );

          return [];
        }
      );

    if (importItems.length === 0) {
      return NextResponse.json(
        {
          error:
            "Non è stato possibile preparare nessuna serie per l'importazione.",
          failedSeries,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Scrittura atomica tramite la funzione
     * SECURITY DEFINER appena creata.
     *
     * auth.uid() viene comunque risolto
     * dall'utente autenticato corrente.
     */
    const { data, error } = await supabase.rpc(
      "import_tvtime_series",
      {
        p_items: importItems,
      }
    );

    if (error) {
      console.error(
        "Errore RPC import_tvtime_series:",
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
      );

      return NextResponse.json(
        {
          error:
            "L'importazione nel Vault non è riuscita.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      result: data,
      importedSeries: importItems.length,
      failedSeries,
    });
  } catch (error) {
    console.error(
      "Errore API import TV Time:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Errore imprevisto durante l'importazione TV Time.",
      },
      {
        status: 500,
      }
    );
  }
}