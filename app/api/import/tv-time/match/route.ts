import { NextResponse } from "next/server";
import { searchMoviesAndSeries } from "../../../../../lib/tmdb";

type MatchRequest = {
  seriesNames?: string[];
};

type MatchCandidate = {
  id: number;
  title: string;
  date: string;
  poster_path: string | null;
  vote_average: number;
  confidence: "exact" | "possible";
};

type SeriesMatch = {
  sourceTitle: string;
  status: "matched" | "ambiguous" | "not_found";
  bestMatch: MatchCandidate | null;
  candidates: MatchCandidate[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MatchRequest;

    const seriesNames = Array.from(
      new Set(
        (body.seriesNames ?? [])
          .map((name) => name.trim())
          .filter(Boolean)
      )
    );

    if (seriesNames.length === 0) {
      return NextResponse.json(
        {
          error: "Nessuna serie da riconoscere.",
        },
        {
          status: 400,
        }
      );
    }

    if (seriesNames.length > 200) {
      return NextResponse.json(
        {
          error:
            "Troppe serie in una singola richiesta. Limite: 200.",
        },
        {
          status: 400,
        }
      );
    }

    const matches: SeriesMatch[] = [];

    for (const sourceTitle of seriesNames) {
      const results =
        await searchMoviesAndSeries(sourceTitle);

      const normalizedSource =
        normalizeTitle(sourceTitle);

      const tvResults = results
        .filter(
          (result) =>
            result.media_type === "tv"
        )
        .slice(0, 8);

      const candidates: MatchCandidate[] =
        tvResults.map((result) => {
          const normalizedResult =
            normalizeTitle(result.title);

          return {
            id: result.id,
            title: result.title,
            date: result.date,
            poster_path: result.poster_path,
            vote_average:
              result.vote_average ?? 0,
            confidence:
              normalizedResult ===
              normalizedSource
                ? "exact"
                : "possible",
          };
        });

      const exactMatches =
        candidates.filter(
          (candidate) =>
            candidate.confidence === "exact"
        );

      if (exactMatches.length === 1) {
        matches.push({
          sourceTitle,
          status: "matched",
          bestMatch: exactMatches[0],
          candidates,
        });

        continue;
      }

      if (
        exactMatches.length > 1 ||
        candidates.length > 1
      ) {
        matches.push({
          sourceTitle,
          status: "ambiguous",
          bestMatch:
            exactMatches[0] ??
            candidates[0] ??
            null,
          candidates,
        });

        continue;
      }

      if (candidates.length === 1) {
        matches.push({
          sourceTitle,
          status: "matched",
          bestMatch: candidates[0],
          candidates,
        });

        continue;
      }

      matches.push({
        sourceTitle,
        status: "not_found",
        bestMatch: null,
        candidates: [],
      });
    }

    return NextResponse.json({
      total: matches.length,
      matched: matches.filter(
        (item) =>
          item.status === "matched"
      ).length,
      ambiguous: matches.filter(
        (item) =>
          item.status === "ambiguous"
      ).length,
      notFound: matches.filter(
        (item) =>
          item.status === "not_found"
      ).length,
      matches,
    });
  } catch (error) {
    console.error(
      "Errore matching TV Time → TMDB:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Errore durante il riconoscimento delle serie.",
      },
      {
        status: 500,
      }
    );
  }
}

function normalizeTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("it-IT")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}