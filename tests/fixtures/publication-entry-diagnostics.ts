import type { Page, Request } from "@playwright/test";

type Phase =
  | "beforehome"
  | "prefetchheaders"
  | "activation"
  | "assertionfailed"
  | "destinationready";
type Row = Record<string, string | number>;
const paths = new Set([
  "/",
  "/publicar",
  "/publicar/paso/tipo",
  "/publicar/error-de-carga",
  "/api/auth/session",
]);

function safePath(value: string, origin: string) {
  try {
    const url = new URL(value);
    if (url.origin !== origin) return "[external]";
    // Only hashed public build assets, never arbitrary static directory names.
    if (
      /^\/_next\/static\/(?:chunks|css)\/(?:\d+|webpack|main-app|framework|polyfills|[a-f0-9]+)-?[a-f0-9]+\.(?:js|css)$/.test(
        url.pathname,
      )
    )
      return url.pathname.slice(0, 180);
    return paths.has(url.pathname) ? url.pathname : "[other]";
  } catch {
    return "[other]";
  }
}

function category(text: string) {
  if (/ChunkLoadError|Loading chunk \d+ failed/.test(text)) return "chunk-load";
  if (/net::ERR_ABORTED\b|NS_BINDING_ABORTED\b/.test(text)) return "aborted";
  if (/net::ERR_CONNECTION_REFUSED\b/.test(text)) return "connection-refused";
  if (/net::ERR_(?:FAILED|NETWORK_CHANGED|INTERNET_DISCONNECTED)\b/.test(text)) return "network";
  if (/net::ERR_TIMED_OUT\b/.test(text)) return "timed-out";
  return "other";
}

export function publicationEntryDiagnostics(
  page: Pick<Page, "on" | "off" | "evaluate">,
  origin: string,
  clock = () => performance.now(),
  emit = (value: string) => console.log(value),
) {
  const start = clock();
  const rows: Row[] = [];
  const milestones: Partial<Record<Phase, number>> = {};
  const ids = new WeakMap<Request, number>();
  let ordinal = 0;
  let dropped = 0;
  const elapsed = () => Math.min(3_600_000, Math.max(0, Math.round(clock() - start)));
  const record = (kind: string, data: Row = {}) => {
    if (rows.length >= 128) {
      dropped++;
      return;
    }
    rows.push({ elapsedMs: elapsed(), kind, ...data });
  };
  const transport = (request: Request): Row => {
    let id = ids.get(request);
    if (!id) {
      id = ++ordinal;
      ids.set(request, id);
    }
    const resource = request.resourceType();
    const method = request.method();
    return {
      request: id,
      pathname: safePath(request.url(), origin),
      resourceType: [
        "document",
        "fetch",
        "xhr",
        "script",
        "stylesheet",
        "image",
        "font",
        "other",
      ].includes(resource)
        ? resource
        : "other",
      method: ["GET", "POST", "HEAD", "OPTIONS", "PUT", "DELETE", "PATCH"].includes(method)
        ? method
        : "other",
    };
  };
  // Register synchronously on the new hot page, before its first goto.
  const listeners = {
    request: (request: Request) => record("requeststart", transport(request)),
    response: (response: import("@playwright/test").Response) =>
      record("responseheaders", { ...transport(response.request()), status: response.status() }),
    requestfinished: (request: Request) => record("requestfinished", transport(request)),
    requestfailed: (request: Request) =>
      record("requestfailed", {
        ...transport(request),
        category: category(request.failure()?.errorText ?? ""),
      }),
    framenavigated: (frame: import("@playwright/test").Frame) => {
      if (!frame.parentFrame())
        record("mainframepath", { pathname: safePath(frame.url(), origin) });
    },
    console: (message: import("@playwright/test").ConsoleMessage) => {
      if (["error", "warning"].includes(message.type()))
        record("console", { category: category(message.text()), level: message.type() });
    },
    pageerror: (error: Error) => record("pageerror", { category: category(error.message) }),
  };
  page.on("request", listeners.request);
  page.on("response", listeners.response);
  page.on("requestfinished", listeners.requestfinished);
  page.on("requestfailed", listeners.requestfailed);
  page.on("framenavigated", listeners.framenavigated);
  page.on("console", listeners.console);
  page.on("pageerror", listeners.pageerror);
  const report = () => ({ rows: [...rows], milestones: { ...milestones }, dropped });
  const milestone = (phase: Phase) => {
    milestones[phase] ??= elapsed();
  };
  return {
    report,
    milestone,
    dispose: () => {
      page.off("request", listeners.request);
      page.off("response", listeners.response);
      page.off("requestfinished", listeners.requestfinished);
      page.off("requestfailed", listeners.requestfailed);
      page.off("framenavigated", listeners.framenavigated);
      page.off("console", listeners.console);
      page.off("pageerror", listeners.pageerror);
    },
    failure: async (error: unknown): Promise<never> => {
      milestone("assertionfailed");
      let snapshot: unknown = { available: false };
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        snapshot = await Promise.race([
          page.evaluate((expectedOrigin) => {
            const scope = document.querySelector<HTMLElement>("[data-navigation-content]");
            const heading = [...document.querySelectorAll("h1")].some(
              (node) => node.textContent === "¿Qué vas a alquilar?",
            );
            const terminal = Boolean(document.querySelector("[data-navigation-terminal]"));
            const overlay = [...document.querySelectorAll('[role="status"]')].some(
              (node) => node.textContent === "Cargando publicación…",
            );
            // No text, HTML, attributes or URLs cross the browser boundary.
            const documentPath =
              location.origin !== expectedOrigin
                ? "[external]"
                : ["/", "/publicar", "/publicar/paso/tipo", "/publicar/error-de-carga"].includes(
                      location.pathname,
                    )
                  ? location.pathname
                  : "[other]";
            return {
              available: true,
              documentPath,
              destinationHeadingPresent: heading,
              terminal,
              overlay,
              contentHidden: Boolean(scope?.hidden),
            };
          }, origin),
          new Promise((resolve) => {
            timer = setTimeout(() => resolve({ available: false }), 200);
          }),
        ]);
      } catch {
        /* Best effort; never replace the assertion error. */
      } finally {
        clearTimeout(timer);
      }
      try {
        emit(JSON.stringify({ marker: "F365_HOT_ENTRY_DIAGNOSTIC", ...report(), snapshot }));
      } catch {
        /* Logging must not replace the original failure either. */
      }
      throw error;
    },
  };
}
