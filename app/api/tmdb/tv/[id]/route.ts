import { NextResponse } from "next/server";

import { getSeries } from "../../../../../lib/tmdb";

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
          error: "ID serie TV non valido.",
        },
        {
          status: 400,
        }
      );
    }

    const series = await getSeries(id);

    return NextResponse.json(series);
  } catch (error) {
    console.error(
      "Errore API dettaglio serie TMDB:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Non è stato possibile recuperare la serie TV.",
      },
      {
        status: 500,
      }
    );
  }
}