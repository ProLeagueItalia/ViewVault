import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(
  request: NextRequest
) {
  let supabaseResponse =
    NextResponse.next({
      request,
    });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          /*
           * Aggiorniamo prima i cookie della request.
           *
           * In questo modo i Server Components
           * ricevono immediatamente la sessione
           * aggiornata.
           */
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(
                name,
                value
              );
            }
          );

          /*
           * Ricreiamo la response usando la
           * request aggiornata.
           */
          supabaseResponse =
            NextResponse.next({
              request,
            });

          /*
           * Scriviamo gli stessi cookie anche
           * nella response inviata al browser.
           */
          cookiesToSet.forEach(
            ({
              name,
              value,
              options,
            }) => {
              supabaseResponse.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  /*
   * IMPORTANTE:
   *
   * Questa chiamata permette a Supabase
   * di verificare/aggiornare la sessione
   * prima che la richiesta raggiunga
   * i Server Components.
   */
  await supabase.auth.getClaims();

  return supabaseResponse;
}