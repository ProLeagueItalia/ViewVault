"use client";

import JSZip from "jszip";
import { useMemo, useState } from "react";

type ImportStatus =
  | "idle"
  | "ready"
  | "analyzing"
  | "analyzed"
  | "matching"
  | "matched"
  | "preview"
  | "importing"
  | "imported"
  | "unsupported"
  | "error";

type DetectedFile = {
  name: string;
  type: "csv" | "json" | "other";
  size: number;
  rows?: number;
  headers?: string[];
  signals?: string[];
};

type AnalysisResult = {
  archiveType: "zip" | "csv";
  totalFiles: number;
  usefulFiles: number;
  detectedFiles: DetectedFile[];
  possibleEpisodeFiles: number;
  possibleSeriesFiles: number;
  possibleRatingFiles: number;
  possibleRewatchFiles: number;
};

type ExtractedEpisode = {
  seasonNumber: number;
  episodeNumber: number;
  watchedAt?: string;
  rewatch?: boolean;
  rating?: number;
};

type ExtractedSeries = {
  title: string;
  status?: string;
  rating?: number;
  episodes: ExtractedEpisode[];
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

type MatchResponse = {
  total: number;
  matched: number;
  ambiguous: number;
  notFound: number;
  matches: SeriesMatch[];
};

type ImportPreviewItem = {
  sourceTitle: string;
  tmdbId: number;
  tmdbTitle: string;
  year: string | null;
  episodeCount: number;
  rewatchCount: number;
  status: string | null;
  rating: number | null;
  episodes: ExtractedEpisode[];
};

type ImportPreview = {
  totalSeries: number;
  totalEpisodes: number;
  totalRewatches: number;
  ratings: number;
  completed: number;
  inProgress: number;
  watchlist: number;
  items: ImportPreviewItem[];
};


type ImportRpcResult = {
  success?: boolean;
  series_processed?: number;
  episodes_added?: number;
  episodes_skipped?: number;
};

type ExecuteImportResponse = {
  success: true;
  result: ImportRpcResult | null;
  importedSeries: number;
  failedSeries: number[];
};

const EPISODE_WORDS = [
  "episode",
  "episode_number",
  "season",
  "season_number",
  "seen_episode",
  "watched_episode",
];

const SERIES_WORDS = [
  "show",
  "series",
  "tv_show",
  "followed_tv_show",
  "show_name",
  "series_name",
];

const RATING_WORDS = [
  "rating",
  "vote",
  "score",
];

const REWATCH_WORDS = [
  "rewatch",
  "rewatched",
  "watch_count",
  "times_watched",
];

const MANUAL_MATCH_STORAGE_KEY =
  "viewvault-tvtime-manual-matches-v1";

function readSavedManualMatches() {
  if (typeof window === "undefined") {
    return {} as Record<string, MatchCandidate>;
  }

  try {
    const raw = window.localStorage.getItem(
      MANUAL_MATCH_STORAGE_KEY
    );

    if (!raw) {
      return {} as Record<string, MatchCandidate>;
    }

    return JSON.parse(raw) as Record<
      string,
      MatchCandidate
    >;
  } catch {
    return {} as Record<string, MatchCandidate>;
  }
}

function saveManualMatch(
  sourceTitle: string,
  candidate: MatchCandidate
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const saved = readSavedManualMatches();

    saved[normalizeSeriesKey(sourceTitle)] =
      candidate;

    window.localStorage.setItem(
      MANUAL_MATCH_STORAGE_KEY,
      JSON.stringify(saved)
    );
  } catch {
    // Se localStorage non è disponibile, il matching
    // continua comunque a funzionare normalmente.
  }
}

function applySavedManualMatches(
  response: MatchResponse
): MatchResponse {
  const saved = readSavedManualMatches();

  const matches = response.matches.map((match) => {
    const remembered =
      saved[normalizeSeriesKey(match.sourceTitle)];

    if (!remembered) {
      return match;
    }

    const currentCandidate =
      match.candidates.find(
        (candidate) =>
          candidate.id === remembered.id
      ) ??
      (match.bestMatch?.id === remembered.id
        ? match.bestMatch
        : null);

    if (!currentCandidate) {
      return match;
    }

    return {
      ...match,
      status: "matched" as const,
      bestMatch: currentCandidate,
    };
  });

  return {
    ...response,
    matched: matches.filter(
      (match) => match.status === "matched"
    ).length,
    ambiguous: matches.filter(
      (match) => match.status === "ambiguous"
    ).length,
    notFound: matches.filter(
      (match) => match.status === "not_found"
    ).length,
    matches,
  };
}

export default function TVTimeImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] =
    useState<ImportStatus>("idle");

  const [analysis, setAnalysis] =
    useState<AnalysisResult | null>(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [extractedSeries, setExtractedSeries] =
    useState<ExtractedSeries[]>([]);

  const [matchResult, setMatchResult] =
    useState<MatchResponse | null>(null);

  const [importPreview, setImportPreview] =
    useState<ImportPreview | null>(null);


  const [showImportConfirmation, setShowImportConfirmation] =
    useState(false);

  const [importResult, setImportResult] =
    useState<ExecuteImportResponse | null>(null);

  const [importError, setImportError] =
    useState("");

  const fileSize = useMemo(() => {
    if (!file) {
      return null;
    }

    return formatBytes(file.size);
  }, [file]);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0] ?? null;

    setFile(selectedFile);
    setAnalysis(null);
    setExtractedSeries([]);
    setMatchResult(null);
    setImportPreview(null);
    setShowImportConfirmation(false);
    setImportResult(null);
    setImportError("");
    setErrorMessage("");

    if (!selectedFile) {
      setStatus("idle");
      return;
    }

    const normalizedName =
      selectedFile.name.toLowerCase();

    const isSupported =
      normalizedName.endsWith(".zip") ||
      normalizedName.endsWith(".csv");

    setStatus(
      isSupported ? "ready" : "unsupported"
    );
  }

  function clearFile() {
    setFile(null);
    setStatus("idle");
    setAnalysis(null);
    setExtractedSeries([]);
    setMatchResult(null);
    setImportPreview(null);
    setShowImportConfirmation(false);
    setImportResult(null);
    setImportError("");
    setErrorMessage("");
  }

  async function analyzeFile() {
    if (!file) {
      return;
    }

    try {
      setStatus("analyzing");
      setAnalysis(null);
      setErrorMessage("");

      const normalizedName =
        file.name.toLowerCase();

      if (normalizedName.endsWith(".zip")) {
        const result = await analyzeZip(file);
        const series = await extractSeriesFromZip(file);

        setAnalysis(result);
        setExtractedSeries(series);
        setMatchResult(null);
        setImportPreview(null);
        setShowImportConfirmation(false);
        setImportResult(null);
        setImportError("");
        setStatus("analyzed");
        return;
      }

      if (normalizedName.endsWith(".csv")) {
        const result = await analyzeSingleCsv(file);
        const series = await extractSeriesFromSingleCsv(file);

        setAnalysis(result);
        setExtractedSeries(series);
        setMatchResult(null);
        setImportPreview(null);
        setShowImportConfirmation(false);
        setImportResult(null);
        setImportError("");
        setStatus("analyzed");
        return;
      }

      setStatus("unsupported");
    } catch (error) {
      console.error(
        "Errore analisi export TV Time:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Errore sconosciuto durante l'analisi."
      );

      setStatus("error");
    }
  }


  async function matchSeriesWithTmdb() {
    if (extractedSeries.length === 0) {
      setErrorMessage(
        "Non sono stati trovati titoli di serie da riconoscere."
      );
      return;
    }

    try {
      setStatus("matching");
      setErrorMessage("");
      setMatchResult(null);
      setImportPreview(null);
      setShowImportConfirmation(false);
      setImportResult(null);
      setImportError("");

      const response = await fetch(
        "/api/import/tv-time/match",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            seriesNames: extractedSeries.map(
              (series) => series.title
            ),
          }),
        }
      );

      const data = (await response.json()) as
        | MatchResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Matching TMDB non riuscito."
        );
      }

      const resolvedMatchResult =
        applySavedManualMatches(
          data as MatchResponse
        );

      setMatchResult(resolvedMatchResult);
      setStatus("matched");
    } catch (error) {
      console.error(
        "Errore riconoscimento TV Time → TMDB:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Errore sconosciuto durante il riconoscimento."
      );

      setStatus("analyzed");
    }
  }


  function selectManualMatch(
    sourceTitle: string,
    candidate: MatchCandidate
  ) {
    saveManualMatch(
      sourceTitle,
      candidate
    );

    setMatchResult((current) => {
      if (!current) {
        return current;
      }

      const matches = current.matches.map((match) =>
        match.sourceTitle === sourceTitle
          ? {
              ...match,
              status: "matched" as const,
              bestMatch: candidate,
            }
          : match
      );

      return {
        ...current,
        matched: matches.filter(
          (match) => match.status === "matched"
        ).length,
        ambiguous: matches.filter(
          (match) => match.status === "ambiguous"
        ).length,
        notFound: matches.filter(
          (match) => match.status === "not_found"
        ).length,
        matches,
      };
    });

    // Se l'utente cambia una corrispondenza, un'eventuale
    // anteprima precedente non deve più essere considerata valida.
    setImportPreview(null);
    setShowImportConfirmation(false);
    setImportResult(null);
    setImportError("");
    setStatus("matched");
  }


  function prepareImportPreview() {
    if (!matchResult) {
      return;
    }

    const matchedItems = matchResult.matches
      .filter(
        (match) =>
          match.status === "matched" &&
          match.bestMatch
      )
      .map((match) => {
        const source = extractedSeries.find(
          (series) =>
            normalizeSeriesKey(series.title) ===
            normalizeSeriesKey(match.sourceTitle)
        );

        if (!source || !match.bestMatch) {
          return null;
        }

        const rewatchCount = source.episodes.filter(
          (episode) => episode.rewatch === true
        ).length;

        return {
          sourceTitle: source.title,
          tmdbId: match.bestMatch.id,
          tmdbTitle: match.bestMatch.title,
          year: match.bestMatch.date
            ? match.bestMatch.date.slice(0, 4)
            : null,
          episodeCount: source.episodes.length,
          rewatchCount,
          status: source.status ?? null,
          rating:
            typeof source.rating === "number"
              ? source.rating
              : null,
          episodes: source.episodes,
        } satisfies ImportPreviewItem;
      })
      .filter(
        (item): item is ImportPreviewItem =>
          item !== null
      );

    const preview: ImportPreview = {
      totalSeries: matchedItems.length,
      totalEpisodes: matchedItems.reduce(
        (sum, item) => sum + item.episodeCount,
        0
      ),
      totalRewatches: matchedItems.reduce(
        (sum, item) => sum + item.rewatchCount,
        0
      ),
      ratings: matchedItems.filter(
        (item) => item.rating !== null
      ).length,
      completed: matchedItems.filter(
        (item) =>
          normalizeImportedStatus(item.status) ===
          "completed"
      ).length,
      inProgress: matchedItems.filter(
        (item) =>
          normalizeImportedStatus(item.status) ===
          "in_progress"
      ).length,
      watchlist: matchedItems.filter(
        (item) =>
          normalizeImportedStatus(item.status) ===
          "watchlist"
      ).length,
      items: matchedItems,
    };

    setImportPreview(preview);
    setShowImportConfirmation(false);
    setImportResult(null);
    setImportError("");
    setStatus("preview");
  }



  async function executeImport() {
    if (!importPreview || importPreview.items.length === 0) {
      setImportError(
        "Non ci sono serie disponibili per l'importazione."
      );
      return;
    }

    try {
      setStatus("importing");
      setImportError("");
      setImportResult(null);

      const response = await fetch(
        "/api/import/tv-time/execute",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: importPreview.items.map((item) => ({
              tmdb_id: item.tmdbId,
              status: item.status,
              rating: item.rating,
              episodes: item.episodes.map((episode) => ({
                season_number: episode.seasonNumber,
                episode_number: episode.episodeNumber,
                watched_at: episode.watchedAt ?? null,
              })),
            })),
          }),
        }
      );

      const data = (await response.json()) as
        | ExecuteImportResponse
        | {
            error?: string;
            failedSeries?: number[];
          };

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Importazione non riuscita."
        );
      }

      setImportResult(data as ExecuteImportResponse);
      setShowImportConfirmation(false);
      setStatus("imported");
    } catch (error) {
      console.error(
        "Errore importazione TV Time:",
        error
      );

      setImportError(
        error instanceof Error
          ? error.message
          : "Errore sconosciuto durante l'importazione."
      );

      setStatus("preview");
    }
  }

  return (
    <div className="mt-10 space-y-8">
      <section className="rounded-3xl border border-zinc-800 bg-[#18181B] p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#7C3AED]/15 text-2xl">
            📦
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">
              Carica il tuo export TV Time
            </h2>

            <p className="mt-2 max-w-2xl leading-7 text-zinc-400">
              Puoi selezionare il file ZIP originale
              oppure un file CSV esportato in precedenza.
            </p>
          </div>
        </div>

        <label className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-700 bg-black/20 px-6 py-12 text-center transition hover:border-[#7C3AED] hover:bg-[#7C3AED]/5">
          <span className="text-5xl">
            📁
          </span>

          <span className="mt-4 text-lg font-bold text-white">
            Seleziona un file
          </span>

          <span className="mt-2 text-sm text-zinc-500">
            Formati supportati: .zip, .csv
          </span>

          <input
            type="file"
            accept=".zip,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {file && (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-black/25 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#A78BFA]">
                  File selezionato
                </p>

                <p className="mt-2 truncate font-bold text-white">
                  {file.name}
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  {fileSize}
                </p>
              </div>

              <button
                type="button"
                onClick={clearFile}
                className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-semibold text-zinc-300 transition hover:border-red-500/60 hover:text-white"
              >
                Rimuovi
              </button>
            </div>
          </div>
        )}

        {status === "unsupported" && (
          <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            Questo formato non è supportato.
            Seleziona un file .zip oppure .csv.
          </div>
        )}

        {status === "ready" && (
          <div className="mt-5">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              File pronto per l&apos;analisi.
              Nessun dato è stato ancora importato.
            </div>

            <button
              type="button"
              onClick={analyzeFile}
              className="mt-5 w-full rounded-full bg-[#7C3AED] px-6 py-4 font-bold text-white transition hover:bg-[#6D28D9] hover:shadow-[0_0_30px_rgba(124,58,237,0.35)]"
            >
              🔍 Analizza export
            </button>
          </div>
        )}

        {status === "analyzing" && (
          <div className="mt-5 rounded-2xl border border-[#7C3AED]/30 bg-[#7C3AED]/10 p-5">
            <p className="font-bold text-white">
              🔬 Analisi in corso...
            </p>

            <p className="mt-2 text-sm text-zinc-400">
              ViewVault sta controllando la struttura
              dell&apos;export senza modificare il tuo Vault.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <p className="font-bold text-red-200">
              Analisi non riuscita
            </p>

            <p className="mt-2 text-sm text-red-200/80">
              {errorMessage}
            </p>
          </div>
        )}
      </section>

      {analysis && (
        <>
          <AnalysisPreview analysis={analysis} />

          <ExtractedSeriesPreview
            series={extractedSeries}
          />

          {extractedSeries.length > 0 &&
            !matchResult && (
              <section className="rounded-3xl border border-[#7C3AED]/30 bg-[#18181B] p-6 md:p-8">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
                  Step 2
                </p>

                <h2 className="mt-2 text-2xl font-bold text-white">
                  Riconoscimento TMDB
                </h2>

                <p className="mt-3 text-zinc-400">
                  Sono state estratte{" "}
                  <strong className="text-white">
                    {extractedSeries.length}
                  </strong>{" "}
                  serie uniche. Ora ViewVault può cercare
                  la corrispondenza su TMDB.
                </p>

                <button
                  type="button"
                  onClick={matchSeriesWithTmdb}
                  disabled={status === "matching"}
                  className="mt-6 w-full rounded-full bg-[#7C3AED] px-6 py-4 font-bold text-white transition hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === "matching"
                    ? "🔎 Riconoscimento in corso..."
                    : "🔎 Riconosci serie su TMDB"}
                </button>
              </section>
            )}

          {matchResult && (
            <>
              <MatchPreview
                result={matchResult}
                extractedSeries={extractedSeries}
                onSelectCandidate={selectManualMatch}
              />

              {!importPreview && (
                <section className="rounded-3xl border border-[#7C3AED]/30 bg-[#18181B] p-6 md:p-8">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
                    Step 3
                  </p>

                  <h2 className="mt-2 text-2xl font-bold text-white">
                    Anteprima importazione
                  </h2>

                  <p className="mt-3 max-w-3xl text-zinc-400">
                    ViewVault preparerà il riepilogo esatto delle serie,
                    degli episodi, degli stati, dei voti e dei rewatch
                    che verrebbero importati. Ancora nessuna scrittura
                    su Supabase.
                  </p>

                  <button
                    type="button"
                    onClick={prepareImportPreview}
                    className="mt-6 w-full rounded-full bg-[#7C3AED] px-6 py-4 font-bold text-white transition hover:bg-[#6D28D9] hover:shadow-[0_0_30px_rgba(124,58,237,0.35)]"
                  >
                    👁️ Prepara anteprima
                  </button>
                </section>
              )}

              {importPreview && (
                <>
                  <ImportPreviewSection
                    preview={importPreview}
                  />

                  <ImportExecutionSection
                    preview={importPreview}
                    status={status}
                    showConfirmation={showImportConfirmation}
                    onOpenConfirmation={() => {
                      setImportError("");
                      setShowImportConfirmation(true);
                    }}
                    onCancelConfirmation={() =>
                      setShowImportConfirmation(false)
                    }
                    onConfirmImport={executeImport}
                    result={importResult}
                    errorMessage={importError}
                  />
                </>
              )}
            </>
          )}
        </>
      )}

      <section className="rounded-3xl border border-zinc-800 bg-[#18181B] p-6 md:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
          Come funzionerà
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <StepCard
            number="1"
            title="Analisi"
            text="ViewVault legge la struttura dell'export."
            active={
              status === "ready" ||
              status === "analyzing"
            }
            completed={
              status === "analyzed" ||
              status === "matching" ||
              status === "matched"
            }
          />

          <StepCard
            number="2"
            title="Riconoscimento"
            text="Le serie vengono abbinate ai titoli TMDB."
            active={status === "matching"}
            completed={
              status === "matched" ||
              status === "preview" ||
              status === "importing" ||
              status === "imported"
            }
          />

          <StepCard
            number="3"
            title="Anteprima"
            text="Controlli cosa verrà importato."
            active={status === "matched"}
            completed={
              status === "preview" ||
              status === "importing" ||
              status === "imported"
            }
          />

          <StepCard
            number="4"
            title="Importazione"
            text="Solo dopo la conferma aggiorniamo il tuo Vault."
            active={status === "importing"}
            completed={status === "imported"}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-[#7C3AED]/30 bg-[#7C3AED]/5 p-6 md:p-8">
        <div className="flex gap-4">
          <div className="text-2xl">
            🛡️
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">
              Importazione sicura
            </h2>

            <p className="mt-2 leading-7 text-zinc-400">
              Analisi, riconoscimento e anteprima non modificano il Vault.
              La scrittura nel database avviene soltanto nello Step 4,
              dopo una conferma esplicita dell&apos;utente.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}


function ExtractedSeriesPreview({
  series,
}: {
  series: ExtractedSeries[];
}) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-[#18181B] p-6 md:p-8">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
        Dati estratti
      </p>

      <h2 className="mt-2 text-2xl font-bold text-white">
        Serie trovate nell&apos;export
      </h2>

      <p className="mt-3 text-zinc-400">
        Questi dati sono ancora soltanto in memoria nel browser.
      </p>

      {series.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-amber-100">
          Nessun titolo di serie riconoscibile è stato estratto.
          Con un export reale potremo aggiungere altre varianti di colonne.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {series.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-zinc-800 bg-black/20 p-5"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-white">
                    {item.title}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    {item.episodes.length} episodi trovati
                    {item.status
                      ? ` • stato: ${item.status}`
                      : ""}
                    {typeof item.rating === "number"
                      ? ` • voto: ${item.rating}`
                      : ""}
                  </p>
                </div>

                <span className="w-fit rounded-full bg-[#7C3AED]/15 px-3 py-1 text-xs font-bold text-[#C4B5FD]">
                  TV
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MatchPreview({
  result,
  extractedSeries,
  onSelectCandidate,
}: {
  result: MatchResponse;
  extractedSeries: ExtractedSeries[];
  onSelectCandidate: (
    sourceTitle: string,
    candidate: MatchCandidate
  ) => void;
}) {
  const episodeCountFor = (title: string) =>
    extractedSeries.find(
      (series) => series.title === title
    )?.episodes.length ?? 0;

  return (
    <section className="rounded-3xl border border-emerald-500/20 bg-[#18181B] p-6 md:p-8">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
        Step 2 completato
      </p>

      <h2 className="mt-2 text-2xl font-bold text-white">
        Riconoscimento TMDB
      </h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatBox value={result.total} label="Serie analizzate" />
        <StatBox value={result.matched} label="Riconosciute" />
        <StatBox value={result.ambiguous} label="Da verificare" />
        <StatBox value={result.notFound} label="Non trovate" />
      </div>

      <div className="mt-8 space-y-3">
        {result.matches.map((match) => {
          const badge =
            match.status === "matched"
              ? "✅ Riconosciuta"
              : match.status === "ambiguous"
                ? "⚠️ Da verificare"
                : "❌ Non trovata";

          return (
            <div
              key={match.sourceTitle}
              className="rounded-2xl border border-zinc-800 bg-black/20 p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-bold text-white">
                    {match.sourceTitle}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    {episodeCountFor(match.sourceTitle)} episodi nell&apos;export
                  </p>

                  {match.bestMatch && (
                    <p className="mt-2 text-sm text-zinc-300">
                      TMDB:{" "}
                      <strong>
                        {match.bestMatch.title}
                      </strong>{" "}
                      • ID {match.bestMatch.id}
                      {match.bestMatch.date
                        ? ` • ${match.bestMatch.date.slice(0, 4)}`
                        : ""}
                    </p>
                  )}
                </div>

                <span
                  className={[
                    "w-fit rounded-full px-3 py-1 text-xs font-bold",
                    match.status === "matched"
                      ? "bg-emerald-500/10 text-emerald-300"
                      : match.status === "ambiguous"
                        ? "bg-amber-500/10 text-amber-200"
                        : "bg-red-500/10 text-red-200",
                  ].join(" ")}
                >
                  {badge}
                </span>
              </div>

              {match.status === "ambiguous" &&
                match.candidates.length > 1 && (
                  <div className="mt-4 border-t border-zinc-800 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                      Possibili corrispondenze
                    </p>

                    <p className="mt-2 text-sm text-zinc-400">
                      Seleziona il titolo corretto per confermare manualmente
                      la corrispondenza TMDB. ViewVault ricorderà questa scelta
                      per le prossime importazioni sullo stesso dispositivo.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {match.candidates.slice(0, 5).map(
                        (candidate) => (
                          <button
                            key={candidate.id}
                            type="button"
                            onClick={() =>
                              onSelectCandidate(
                                match.sourceTitle,
                                candidate
                              )
                            }
                            className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition hover:border-[#7C3AED] hover:bg-[#7C3AED]/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/60"
                          >
                            {candidate.title}
                            {candidate.date
                              ? ` (${candidate.date.slice(0, 4)})`
                              : ""}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-[#7C3AED]/30 bg-[#7C3AED]/5 p-5">
        <p className="font-bold text-white">
          🔒 Ancora nessuna importazione
        </p>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Il matching è soltanto un&apos;anteprima. Nessun episodio,
          progresso o serie è stato scritto su Supabase.
        </p>
      </div>
    </section>
  );
}


function ImportPreviewSection({
  preview,
}: {
  preview: ImportPreview;
}) {
  return (
    <section className="rounded-3xl border border-[#7C3AED]/30 bg-[#18181B] p-6 md:p-8">
      <div className="flex items-start gap-4">
        <div className="text-3xl">👁️</div>

        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
            Step 3 completato
          </p>

          <h2 className="mt-2 text-2xl font-bold text-white">
            Anteprima dell&apos;importazione
          </h2>

          <p className="mt-2 text-zinc-400">
            Questo è ciò che ViewVault importerebbe dopo la tua conferma.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatBox value={preview.totalSeries} label="Serie da importare" />
        <StatBox value={preview.totalEpisodes} label="Episodi visti" />
        <StatBox value={preview.totalRewatches} label="Rewatch rilevati" />
        <StatBox value={preview.ratings} label="Valutazioni" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <StatBox value={preview.completed} label="Completate" />
        <StatBox value={preview.inProgress} label="In corso" />
        <StatBox value={preview.watchlist} label="Watchlist" />
      </div>

      <div className="mt-8 space-y-4">
        {preview.items.map((item) => (
          <PreviewSeriesCard
            key={item.tmdbId}
            item={item}
          />
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <p className="font-bold text-emerald-200">
          ✅ Anteprima pronta
        </p>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Lo Step 3 è solo una simulazione dell&apos;importazione.
          Nessun record è stato creato, modificato o eliminato nel tuo Vault.
        </p>
      </div>

    </section>
  );
}


function ImportExecutionSection({
  preview,
  status,
  showConfirmation,
  onOpenConfirmation,
  onCancelConfirmation,
  onConfirmImport,
  result,
  errorMessage,
}: {
  preview: ImportPreview;
  status: ImportStatus;
  showConfirmation: boolean;
  onOpenConfirmation: () => void;
  onCancelConfirmation: () => void;
  onConfirmImport: () => void;
  result: ExecuteImportResponse | null;
  errorMessage: string;
}) {
  const isImporting = status === "importing";
  const isImported = status === "imported";

  if (isImported && result) {
    const rpc = result.result ?? {};
    const seriesProcessed =
      rpc.series_processed ?? result.importedSeries;
    const episodesAdded =
      rpc.episodes_added ?? 0;
    const episodesSkipped =
      rpc.episodes_skipped ?? 0;

    return (
      <section className="rounded-3xl border border-emerald-500/30 bg-[#18181B] p-6 md:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
          Step 4 completato
        </p>

        <h2 className="mt-2 text-2xl font-bold text-white">
          ✅ Importazione completata
        </h2>

        <p className="mt-3 max-w-3xl text-zinc-400">
          I dati compatibili con ViewVault sono stati elaborati con successo.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatBox
            value={seriesProcessed}
            label="Serie elaborate"
          />

          <StatBox
            value={episodesAdded}
            label="Nuovi episodi importati"
          />

          <StatBox
            value={episodesSkipped}
            label="Episodi già presenti"
          />

          <StatBox
            value={result.failedSeries.length}
            label="Serie non importate"
          />
        </div>

        {result.failedSeries.length > 0 && (
          <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
            <p className="font-bold text-amber-200">
              ⚠️ Alcune serie non sono state importate
            </p>

            <p className="mt-2 text-sm text-zinc-400">
              TMDB ID: {result.failedSeries.join(", ")}
            </p>
          </div>
        )}

        <a
          href="/vault"
          className="mt-8 flex w-full items-center justify-center rounded-full bg-[#7C3AED] px-6 py-4 font-bold text-white transition hover:bg-[#6D28D9] hover:shadow-[0_0_30px_rgba(124,58,237,0.35)]"
        >
          🎬 Vai al mio Vault
        </a>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-red-500/20 bg-[#18181B] p-6 md:p-8">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A78BFA]">
        Step 4
      </p>

      <h2 className="mt-2 text-2xl font-bold text-white">
        Importa nel mio Vault
      </h2>

      <p className="mt-3 max-w-3xl leading-7 text-zinc-400">
        Da questo passaggio ViewVault inizierà a scrivere realmente
        nel database. L&apos;operazione è progettata per evitare duplicati:
        gli episodi già presenti verranno ignorati.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatBox
          value={preview.totalSeries}
          label="Serie"
        />

        <StatBox
          value={preview.totalEpisodes}
          label="Episodi nell'export"
        />

        <StatBox
          value={preview.ratings}
          label="Valutazioni"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
        <p className="font-bold text-amber-200">
          ⚠️ Nota sui rewatch
        </p>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          I rewatch degli episodi rilevati nell&apos;export non vengono
          ancora salvati: l&apos;attuale struttura del database conserva
          un solo record per episodio. Serie, episodi, stati e voti
          compatibili verranno invece importati.
        </p>
      </div>

      {errorMessage && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
          <p className="font-bold text-red-200">
            Importazione non riuscita
          </p>

          <p className="mt-2 text-sm text-red-200/80">
            {errorMessage}
          </p>
        </div>
      )}

      {!showConfirmation ? (
        <button
          type="button"
          onClick={onOpenConfirmation}
          disabled={isImporting}
          className="mt-8 w-full rounded-full bg-[#7C3AED] px-6 py-4 font-bold text-white transition hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-60"
        >
          🔐 Importa nel mio Vault
        </button>
      ) : (
        <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
          <p className="text-lg font-bold text-white">
            Confermi l&apos;importazione?
          </p>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Stai per aggiungere i dati mostrati nell&apos;anteprima
            al tuo account ViewVault. Gli elementi già presenti
            non verranno duplicati.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onCancelConfirmation}
              disabled={isImporting}
              className="flex-1 rounded-full border border-zinc-700 px-5 py-3 font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:opacity-50"
            >
              Annulla
            </button>

            <button
              type="button"
              onClick={onConfirmImport}
              disabled={isImporting}
              className="flex-1 rounded-full bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isImporting
                ? "⏳ Importazione in corso..."
                : "Conferma e importa"}
            </button>
          </div>
        </div>
      )}

      {isImporting && (
        <div className="mt-5 rounded-2xl border border-[#7C3AED]/30 bg-[#7C3AED]/10 p-5">
          <p className="font-bold text-white">
            ⏳ Importazione in corso...
          </p>

          <p className="mt-2 text-sm text-zinc-400">
            ViewVault sta verificando i dati con TMDB e aggiornando
            il tuo Vault. Non chiudere questa pagina.
          </p>
        </div>
      )}
    </section>
  );
}

function PreviewSeriesCard({
  item,
}: {
  item: ImportPreviewItem;
}) {
  const normalizedStatus =
    normalizeImportedStatus(item.status);

  const statusLabel =
    normalizedStatus === "completed"
      ? "✅ Completata"
      : normalizedStatus === "in_progress"
        ? "▶️ In corso"
        : normalizedStatus === "watchlist"
          ? "🔖 Watchlist"
          : "Stato non specificato";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/20 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-lg font-bold text-white">
            {item.tmdbTitle}
          </p>

          <p className="mt-1 text-sm text-zinc-500">
            TV Time: {item.sourceTitle}
          </p>

          <p className="mt-2 text-sm text-zinc-300">
            TMDB ID {item.tmdbId}
            {item.year ? ` • ${item.year}` : ""}
          </p>
        </div>

        <span className="w-fit rounded-full bg-[#7C3AED]/15 px-3 py-1 text-xs font-bold text-[#C4B5FD]">
          {statusLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MiniInfo
          label="Episodi"
          value={String(item.episodeCount)}
        />

        <MiniInfo
          label="Rewatch"
          value={String(item.rewatchCount)}
        />

        <MiniInfo
          label="Voto"
          value={
            item.rating !== null
              ? String(item.rating)
              : "—"
          }
        />
      </div>

      {item.episodes.length > 0 && (
        <div className="mt-5 border-t border-zinc-800 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
            Episodi rilevati
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {item.episodes
              .slice(0, 30)
              .map((episode) => (
                <span
                  key={`${episode.seasonNumber}-${episode.episodeNumber}`}
                  className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-300"
                >
                  S{String(episode.seasonNumber).padStart(2, "0")}
                  E{String(episode.episodeNumber).padStart(2, "0")}
                  {episode.rewatch ? " 🔁" : ""}
                </span>
              ))}

            {item.episodes.length > 30 && (
              <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-500">
                +{item.episodes.length - 30} altri
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">
        {label}
      </p>

      <p className="mt-1 font-bold text-white">
        {value}
      </p>
    </div>
  );
}

function AnalysisPreview({
  analysis,
}: {
  analysis: AnalysisResult;
}) {
  return (
    <section className="rounded-3xl border border-emerald-500/20 bg-[#18181B] p-6 md:p-8">
      <div className="flex items-start gap-4">
        <div className="text-3xl">
          ✅
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
            Analisi completata
          </p>

          <h2 className="mt-2 text-2xl font-bold text-white">
            Struttura dell&apos;export
          </h2>

          <p className="mt-2 text-zinc-400">
            ViewVault ha analizzato il file senza
            importare alcun dato.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatBox
          value={analysis.totalFiles}
          label="File trovati"
        />

        <StatBox
          value={analysis.usefulFiles}
          label="File analizzabili"
        />

        <StatBox
          value={analysis.possibleEpisodeFiles}
          label="Possibili file episodi"
        />

        <StatBox
          value={analysis.possibleSeriesFiles}
          label="Possibili file serie"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatBox
          value={analysis.possibleRatingFiles}
          label="Possibili rating"
        />

        <StatBox
          value={analysis.possibleRewatchFiles}
          label="Possibili rewatch"
        />
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-bold text-white">
          File rilevati
        </h3>

        <div className="mt-4 space-y-3">
          {analysis.detectedFiles.length > 0 ? (
            analysis.detectedFiles.map(
              (detectedFile) => (
                <DetectedFileCard
                  key={detectedFile.name}
                  file={detectedFile}
                />
              )
            )
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-700 p-6 text-center text-zinc-500">
              Nessun CSV o JSON rilevato.
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
        <p className="font-bold text-amber-200">
          ⚠️ Diagnostica preliminare
        </p>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          In questa fase ViewVault riconosce soltanto
          la struttura del file. Il prossimo passaggio
          analizzerà realmente serie, stagioni ed episodi
          prima di effettuare il matching con TMDB.
        </p>
      </div>
    </section>
  );
}

function DetectedFileCard({
  file,
}: {
  file: DetectedFile;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/20 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="break-all font-bold text-white">
            {file.name}
          </p>

          <p className="mt-1 text-sm text-zinc-500">
            {file.type.toUpperCase()} •{" "}
            {formatBytes(file.size)}
            {typeof file.rows === "number"
              ? ` • ${file.rows} righe`
              : ""}
          </p>
        </div>

        <span className="w-fit rounded-full bg-[#7C3AED]/15 px-3 py-1 text-xs font-bold text-[#C4B5FD]">
          {file.type.toUpperCase()}
        </span>
      </div>

      {file.headers &&
        file.headers.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
              Colonne rilevate
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {file.headers
                .slice(0, 20)
                .map((header) => (
                  <span
                    key={header}
                    className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-300"
                  >
                    {header}
                  </span>
                ))}
            </div>
          </div>
        )}

      {file.signals &&
        file.signals.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
              Segnali trovati
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {file.signals.map((signal) => (
                <span
                  key={signal}
                  className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300"
                >
                  {signal}
                </span>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}

function StatBox({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/20 p-5">
      <p className="text-3xl font-bold text-white">
        {value}
      </p>

      <p className="mt-2 text-sm text-zinc-500">
        {label}
      </p>
    </div>
  );
}

function StepCard({
  number,
  title,
  text,
  active = false,
  completed = false,
}: {
  number: string;
  title: string;
  text: string;
  active?: boolean;
  completed?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-5 transition",
        completed
          ? "border-emerald-500/30 bg-emerald-500/5"
          : active
            ? "border-[#7C3AED]/50 bg-[#7C3AED]/10"
            : "border-zinc-800 bg-black/20",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white",
          completed
            ? "bg-emerald-600"
            : "bg-[#7C3AED]",
        ].join(" ")}
      >
        {completed ? "✓" : number}
      </div>

      <h3 className="mt-4 font-bold text-white">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-zinc-500">
        {text}
      </p>
    </div>
  );
}

async function analyzeZip(
  file: File
): Promise<AnalysisResult> {
  const zip = await JSZip.loadAsync(file);

  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir);

  const detectedFiles: DetectedFile[] = [];

  for (const entry of entries) {
    const normalizedName =
      entry.name.toLowerCase();

    if (normalizedName.endsWith(".csv")) {
      const content =
        await entry.async("string");

      detectedFiles.push(
        analyzeCsvContent(
          entry.name,
          content,
          content.length
        )
      );

      continue;
    }

    if (normalizedName.endsWith(".json")) {
      const content =
        await entry.async("string");

      detectedFiles.push(
        analyzeJsonContent(
          entry.name,
          content,
          content.length
        )
      );
    }
  }

  return buildAnalysisResult(
    "zip",
    entries.length,
    detectedFiles
  );
}

async function analyzeSingleCsv(
  file: File
): Promise<AnalysisResult> {
  const content = await file.text();

  const detectedFile =
    analyzeCsvContent(
      file.name,
      content,
      file.size
    );

  return buildAnalysisResult(
    "csv",
    1,
    [detectedFile]
  );
}

function analyzeCsvContent(
  name: string,
  content: string,
  size: number
): DetectedFile {
  const lines = content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  const firstLine =
    lines[0] ?? "";

  const separator =
    detectSeparator(firstLine);

  const headers = parseCsvLine(
    firstLine,
    separator
  )
    .map((header) =>
      normalizeHeader(header)
    )
    .filter(Boolean);

  const signals =
    detectSignals(
      name,
      headers
    );

  return {
    name,
    type: "csv",
    size,
    rows: Math.max(
      0,
      lines.length - 1
    ),
    headers,
    signals,
  };
}

function analyzeJsonContent(
  name: string,
  content: string,
  size: number
): DetectedFile {
  let headers: string[] = [];

  try {
    const parsed: unknown =
      JSON.parse(content);

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      headers = Object.keys(
        parsed as Record<string, unknown>
      ).map(normalizeHeader);
    }

    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed[0] &&
      typeof parsed[0] === "object"
    ) {
      headers = Object.keys(
        parsed[0] as Record<
          string,
          unknown
        >
      ).map(normalizeHeader);
    }
  } catch {
    // Manteniamo comunque il file
    // nell'elenco diagnostico.
  }

  return {
    name,
    type: "json",
    size,
    headers,
    signals: detectSignals(
      name,
      headers
    ),
  };
}

function buildAnalysisResult(
  archiveType: "zip" | "csv",
  totalFiles: number,
  detectedFiles: DetectedFile[]
): AnalysisResult {
  return {
    archiveType,
    totalFiles,
    usefulFiles:
      detectedFiles.length,

    detectedFiles,

    possibleEpisodeFiles:
      detectedFiles.filter((file) =>
        file.signals?.includes(
          "Episodi"
        )
      ).length,

    possibleSeriesFiles:
      detectedFiles.filter((file) =>
        file.signals?.includes(
          "Serie TV"
        )
      ).length,

    possibleRatingFiles:
      detectedFiles.filter((file) =>
        file.signals?.includes(
          "Valutazioni"
        )
      ).length,

    possibleRewatchFiles:
      detectedFiles.filter((file) =>
        file.signals?.includes(
          "Rewatch"
        )
      ).length,
  };
}

function detectSignals(
  fileName: string,
  headers: string[]
) {
  const searchable =
    `${fileName.toLowerCase()} ${headers.join(
      " "
    )}`;

  const signals: string[] = [];

  if (
    EPISODE_WORDS.some((word) =>
      searchable.includes(word)
    )
  ) {
    signals.push("Episodi");
  }

  if (
    SERIES_WORDS.some((word) =>
      searchable.includes(word)
    )
  ) {
    signals.push("Serie TV");
  }

  if (
    RATING_WORDS.some((word) =>
      searchable.includes(word)
    )
  ) {
    signals.push("Valutazioni");
  }

  if (
    REWATCH_WORDS.some((word) =>
      searchable.includes(word)
    )
  ) {
    signals.push("Rewatch");
  }

  return signals;
}

function normalizeHeader(
  value: string
) {
  return value
    .trim()
    .replace(/^["']|["']$/g, "")
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function detectSeparator(
  line: string
) {
  const candidates = [
    ",",
    ";",
    "\t",
  ];

  let bestSeparator = ",";
  let bestCount = -1;

  for (const candidate of candidates) {
    const count =
      line.split(candidate).length - 1;

    if (count > bestCount) {
      bestSeparator = candidate;
      bestCount = count;
    }
  }

  return bestSeparator;
}

function parseCsvLine(
  line: string,
  separator: string
) {
  const values: string[] = [];

  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const character =
      line[index];

    const nextCharacter =
      line[index + 1];

    if (character === '"') {
      if (
        insideQuotes &&
        nextCharacter === '"'
      ) {
        current += '"';
        index++;
        continue;
      }

      insideQuotes =
        !insideQuotes;

      continue;
    }

    if (
      character === separator &&
      !insideQuotes
    ) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);

  return values;
}


async function extractSeriesFromZip(
  file: File
): Promise<ExtractedSeries[]> {
  const zip = await JSZip.loadAsync(file);
  const accumulator = new Map<string, ExtractedSeries>();

  for (const entry of Object.values(zip.files)) {
    if (
      entry.dir ||
      !entry.name.toLowerCase().endsWith(".csv")
    ) {
      continue;
    }

    const content = await entry.async("string");
    extractSeriesFromCsvContent(content, accumulator);
  }

  return sortExtractedSeries(accumulator);
}

async function extractSeriesFromSingleCsv(
  file: File
): Promise<ExtractedSeries[]> {
  const accumulator = new Map<string, ExtractedSeries>();
  const content = await file.text();

  extractSeriesFromCsvContent(content, accumulator);

  return sortExtractedSeries(accumulator);
}

function extractSeriesFromCsvContent(
  content: string,
  accumulator: Map<string, ExtractedSeries>
) {
  const lines = content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return;
  }

  const separator = detectSeparator(lines[0]);
  const headers = parseCsvLine(
    lines[0],
    separator
  ).map(normalizeHeader);

  const titleIndex = findHeaderIndex(headers, [
    "show_name",
    "series_name",
    "tv_show_name",
    "show",
    "series",
    "tv_show",
    "title",
  ]);

  if (titleIndex === -1) {
    return;
  }

  const seasonIndex = findHeaderIndex(headers, [
    "season_number",
    "season",
  ]);

  const episodeIndex = findHeaderIndex(headers, [
    "episode_number",
    "episode",
  ]);

  const watchedAtIndex = findHeaderIndex(headers, [
    "watched_at",
    "seen_at",
    "watch_date",
    "date",
  ]);

  const rewatchIndex = findHeaderIndex(headers, [
    "rewatch",
    "rewatched",
    "is_rewatch",
  ]);

  const ratingIndex = findHeaderIndex(headers, [
    "rating",
    "vote",
    "score",
  ]);

  const statusIndex = findHeaderIndex(headers, [
    "status",
    "state",
  ]);

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line, separator);
    const title = (values[titleIndex] ?? "").trim();

    if (!title) {
      continue;
    }

    const key = normalizeSeriesKey(title);
    const existing =
      accumulator.get(key) ?? {
        title,
        episodes: [],
      };

    if (statusIndex !== -1) {
      const status = (values[statusIndex] ?? "").trim();

      if (status) {
        existing.status = status;
      }
    }

    if (ratingIndex !== -1) {
      const rating = Number(values[ratingIndex]);

      if (Number.isFinite(rating)) {
        existing.rating = rating;
      }
    }

    if (
      seasonIndex !== -1 &&
      episodeIndex !== -1
    ) {
      const seasonNumber = Number(
        values[seasonIndex]
      );
      const episodeNumber = Number(
        values[episodeIndex]
      );

      if (
        Number.isInteger(seasonNumber) &&
        Number.isInteger(episodeNumber) &&
        seasonNumber >= 0 &&
        episodeNumber > 0
      ) {
        const episode: ExtractedEpisode = {
          seasonNumber,
          episodeNumber,
        };

        if (watchedAtIndex !== -1) {
          const watchedAt =
            (values[watchedAtIndex] ?? "").trim();

          if (watchedAt) {
            episode.watchedAt = watchedAt;
          }
        }

        if (rewatchIndex !== -1) {
          episode.rewatch = parseBooleanLike(
            values[rewatchIndex]
          );
        }

        if (ratingIndex !== -1) {
          const episodeRating = Number(
            values[ratingIndex]
          );

          if (Number.isFinite(episodeRating)) {
            episode.rating = episodeRating;
          }
        }

        const duplicate = existing.episodes.some(
          (item) =>
            item.seasonNumber === seasonNumber &&
            item.episodeNumber === episodeNumber
        );

        if (!duplicate) {
          existing.episodes.push(episode);
        }
      }
    }

    accumulator.set(key, existing);
  }
}

function findHeaderIndex(
  headers: string[],
  aliases: string[]
) {
  return headers.findIndex((header) =>
    aliases.includes(header)
  );
}

function normalizeSeriesKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("it-IT")
    .trim()
    .replace(/\s+/g, " ");
}

function parseBooleanLike(
  value: string | undefined
) {
  const normalized = (value ?? "")
    .trim()
    .toLowerCase();

  return [
    "1",
    "true",
    "yes",
    "y",
    "si",
    "sì",
  ].includes(normalized);
}

function sortExtractedSeries(
  accumulator: Map<string, ExtractedSeries>
) {
  return Array.from(accumulator.values())
    .map((series) => ({
      ...series,
      episodes: [...series.episodes].sort(
        (a, b) =>
          a.seasonNumber - b.seasonNumber ||
          a.episodeNumber - b.episodeNumber
      ),
    }))
    .sort((a, b) =>
      a.title.localeCompare(b.title, "it")
    );
}


function normalizeImportedStatus(
  status: string | null | undefined
) {
  const normalized = (status ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  if (
    [
      "completed",
      "complete",
      "watched",
      "finished",
    ].includes(normalized)
  ) {
    return "completed";
  }

  if (
    [
      "in_progress",
      "inprogress",
      "watching",
      "started",
    ].includes(normalized)
  ) {
    return "in_progress";
  }

  if (
    [
      "watchlist",
      "to_watch",
      "towatch",
      "planned",
      "planning",
    ].includes(normalized)
  ) {
    return "watchlist";
  }

  return "unknown";
}

function formatBytes(
  bytes: number
) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes =
    bytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(
      kilobytes < 10 ? 1 : 0
    )} KB`;
  }

  const megabytes =
    kilobytes / 1024;

  return `${megabytes.toFixed(2)} MB`;
}