import { NextResponse } from "next/server";

import { getMovie } from "../../../../../lib/tmdb";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json(
        {
          error: "ID film non valido.",
        },
        {
          status: 400,
        }
      );
    }

    const movie = await getMovie(id);

    return NextResponse.json(movie);
  } catch (error) {
    console.error(
      "Errore API dettaglio film TMDB:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Non è stato possibile recuperare il film.",
      },
      {
        status: 500,
      }
    );
  }
}