// @vitest-environment happy-dom
import { runInNewContext } from "node:vm";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * **La pantalla de espera, en los bytes que salen de la ruta** (15.9, láminas
 * 8c/9c). Trampa 4 del plan: que `magicLinkWaitFor` conteste bien y que la
 * pantalla lo dibuje son dos afirmaciones distintas.
 *
 * **El «sin un solo script» NO se afirma acá**, por lo mismo que en
 * `entrar-servida.test.tsx`: fuera del compilador de Next una Server Action es
 * una función común y React inyecta su propio `<script>` de reenvío. Esa
 * medición vive en `tests/e2e/entrar-sin-javascript.spec.ts`, con el script
 * apagado y contra la compilación de producción.
 */
const { RedirectSignal, redirect, jar } = vi.hoisted(() => {
  class RedirectSignal extends Error {
    readonly url: string;
    constructor(url: string) {
      super(`NEXT_REDIRECT:${url}`);
      this.name = "RedirectSignal";
      this.url = url;
    }
  }

  return {
    RedirectSignal,
    redirect: vi.fn((url: string): never => {
      throw new RedirectSignal(url);
    }),
    jar: new Map<string, string>(),
  };
});

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
  }),
}));
vi.mock("@/modules/identity/infrastructure/auth", () => ({ signIn: vi.fn() }));

const { default: EsperaPage, metadata } = await import("./page");
const { TICKET_COOKIE } = await import("../enlace");
const { MAGIC_LINK_RESEND_COOLDOWN_SECONDS, serialiseMagicLinkTicket } = await import(
  "@/modules/identity/domain/magic-link-request"
);

const AHORA = Date.UTC(2026, 7, 29, 12, 0, 0);
const FICHA = "/alquiler/distrito-capital/chacao/apartamento-2h";
const CORREO = "maria.f@gmail.com";
const AVISO_NEUTRO =
  "Abriste el enlace en otro dispositivo. Puedes seguir ahí: aquí ya no hace falta esperar.";
const SONDEO = "/signin/revisa-tu-correo/estado";

function conComprobante(sentAtMs: number, returnTo: string | null = FICHA) {
  jar.set(TICKET_COOKIE, serialiseMagicLinkTicket({ address: CORREO, sentAtMs, returnTo }));
}

/** Con huella hay sondeo; sin ella la pantalla es la misma menos el aviso. */
function conHuella(sentAtMs: number) {
  jar.set(
    TICKET_COOKIE,
    serialiseMagicLinkTicket({
      address: CORREO,
      sentAtMs,
      returnTo: FICHA,
      linkFingerprint: "4f1a".repeat(16),
      seal: "c0de".repeat(16),
    }),
  );
}

async function servida(): Promise<string> {
  return renderToStaticMarkup(await EsperaPage());
}

function titulo(html: string): string {
  return html.match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1] ?? "";
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(AHORA);
  jar.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  document.body.replaceChildren();
  jar.clear();
  vi.clearAllTimers();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** Ejecuta los bytes exactos del sondeo servido, no el script de React. */
async function sondeoServido(fetch: ReturnType<typeof vi.fn>) {
  document.body.innerHTML = await servida();
  const scripts = Array.from(document.querySelectorAll("script")).filter((script) =>
    script.textContent?.includes(SONDEO),
  );
  expect(scripts).toHaveLength(1);
  const script = scripts[0];
  const aviso = document.querySelector<HTMLElement>('[data-testid="espera-entro"]');
  if (!script || !aviso) throw new Error("Falta el sondeo o el aviso servido");
  const detener = vi.fn(clearInterval);
  runInNewContext(script.textContent ?? "", {
    document,
    window: { fetch },
    fetch,
    Date,
    setInterval,
    clearInterval: detener,
  });
  return { aviso, detener };
}

describe("35.2b: metadata y DOM del sondeo servido", () => {
  it("exporta el título neutro y conserva el canonical, no mide el title servido", () => {
    expect(metadata).toEqual({
      title: "Revisa tu correo — Rentoru",
      alternates: { canonical: "/signin/revisa-tu-correo" },
    });
  });

  it("false mantiene oculto; true revela el aviso neutro completo y detiene el sondeo", async () => {
    conHuella(AHORA);
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ status: 200, json: async () => ({ entro: false }) })
      .mockResolvedValueOnce({ status: 200, json: async () => ({ entro: true }) });
    const { aviso, detener } = await sondeoServido(fetch);
    expect(aviso.hidden).toBe(true);
    expect(aviso.getAttribute("role")).toBe("status");
    await vi.advanceTimersByTimeAsync(5_000);
    expect(aviso.hidden).toBe(true);
    expect(detener).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(SONDEO, { headers: { accept: "application/json" } });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(aviso.hidden).toBe(false);
    expect(detener).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(aviso.textContent).toBe(AVISO_NEUTRO);
  });

  it.each(["204", "rechazo"])("%s mantiene el aviso oculto y detiene el sondeo", async (caso) => {
    conHuella(AHORA);
    const json = vi.fn();
    const fetch = vi.fn();
    if (caso === "204") fetch.mockResolvedValue({ status: 204, json });
    else fetch.mockRejectedValue(new Error("Red no disponible"));
    const { aviso, detener } = await sondeoServido(fetch);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(aviso.hidden).toBe(true);
    expect(detener).toHaveBeenCalledTimes(1);
    expect(json).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(aviso.hidden).toBe(true);
  });

  it("el tick estrictamente posterior al vencimiento detiene sin fetch ni revelar", async () => {
    conHuella(AHORA);
    const fetch = vi.fn();
    const { aviso, detener } = await sondeoServido(fetch);
    vi.setSystemTime(AHORA + 15 * 60 * 1000 + 1);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(detener).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
    expect(aviso.hidden).toBe(true);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("el HTML de un enlace ya vencido no sirve script de sondeo y mantiene el aviso oculto", async () => {
    conHuella(AHORA - 15 * 60 * 1000 - 1);
    const html = await servida();
    expect(html).not.toContain(SONDEO);
    document.body.innerHTML = html;
    expect(document.querySelector<HTMLElement>('[data-testid="espera-entro"]')?.hidden).toBe(true);
  });
});

describe("la pantalla de espera sale entera en el HTML (15.9)", () => {
  /**
   * **Falla cerrado** (§7). La dirección tecleada sólo existe en el
   * comprobante, así que sin él no hay nada que mostrar — y dibujar «Revisá tu
   * correo» sin decir cuál sería una pantalla que no informa nada.
   */
  it("sin comprobante no hay pantalla: vuelve a la puerta", async () => {
    await expect(servida()).rejects.toThrow(RedirectSignal);
    expect(redirect).toHaveBeenCalledWith("/signin");
  });

  it("muestra de vuelta la dirección tecleada, que es como se caza el tipeo sin volver", async () => {
    conComprobante(AHORA);
    const html = await servida();

    expect(titulo(html)).toBe("Revisa tu correo");
    expect(html).not.toContain("Al entrar aceptás los ");
    expect(html).not.toContain('href="/legal/terminos"');
    expect(html).not.toContain('href="/legal/privacidad"');
    // La frase entera y la dirección DENTRO del `<b>`: la lámina la destaca, y
    // afirmar sólo que la cadena aparece pasaría con la dirección en cualquier
    // parte del documento.
    expect(html).toMatch(new RegExp(`Le mandamos un enlace a <b[^>]*>${CORREO}</b>`));
    expect(html).toContain("Ábrelo y entras sin escribir nada más.");
    // **Y a nadie más.** La dirección no viaja en ninguna dirección web: ni en
    // la barra, ni en un enlace, ni en el historial de quien mira por encima
    // del hombro. Sale del comprobante y vuelve a la pantalla.
    expect(html).not.toMatch(new RegExp(`href="[^"]*${CORREO.replace("@", "(@|%40)")}`));
  });

  it("explica por qué podría no llegar, con las tres razones de la lámina", async () => {
    conComprobante(AHORA);
    const html = await servida();

    expect(html).toContain("Si no llega");
    expect(html).toContain("Puede tardar hasta dos minutos.");
    expect(html).toContain("Mira en correo no deseado.");
    expect(html).toContain("El enlace sirve una sola vez y vence en 15 minutos.");
  });

  /**
   * **Dos frases dibujadas que este producto no puede decir hoy.** La 8c
   * escribe «Abrí el enlace en este mismo teléfono», que es la regla de mismo
   * dispositivo que el fundador quitó en la 15.6 (y que la 15.15 manda corregir
   * en la lámina). La 9c escribe «te avisamos acá cuando pase», que la cumple
   * el sondeo de la 15.12 — que no está construido. Prometer cualquiera de las
   * dos es la casilla que miente de §5.
   */
  it("no promete la regla que se quitó ni el aviso que todavía nadie manda", async () => {
    conComprobante(AHORA);
    const html = await servida();

    expect(html).not.toContain("este mismo teléfono");
    expect(html).not.toContain("esta misma computadora");
    expect(html).not.toContain("te avisamos");
  });

  /**
   * **La cuenta va en la cara del control, y el control no es un botón muerto**
   * — la nota de la 8c: «reenviar con cuenta regresiva, no deshabilitado sin
   * explicación». Dentro de la ventana no hay nada que apretar porque no hay
   * nada que hacer todavía, y el número dice cuándo lo habrá.
   */
  it("dentro de la ventana el reenvío es la cuenta, y no un formulario", async () => {
    conComprobante(AHORA - 18_000);
    const html = await servida();

    expect(html).toContain("Volver a enviar en 0:42");
    expect(html).not.toContain("Volver a enviar el enlace");
    // El único formulario que queda es la salida a Google.
    expect(html.match(/<form/g)).toHaveLength(1);
  });

  it("pasada la ventana el reenvío es un formulario de verdad, con su dirección", async () => {
    conComprobante(AHORA - (MAGIC_LINK_RESEND_COOLDOWN_SECONDS + 1) * 1000);
    const html = await servida();

    expect(html).toContain(">Volver a enviar el enlace</button>");
    expect(html).not.toContain("Volver a enviar en");
    expect(html.match(/<form/g)).toHaveLength(2);
    expect(html).toMatch(
      new RegExp(`<input[^>]*type="hidden"[^>]*name="correo"[^>]*value="${CORREO}"`),
    );
  });

  /** F20: dos salidas visibles, y las dos conservan el aviso al que se vuelve. */
  it("deja salir a Google y a cambiar de correo sin perder el destino", async () => {
    conComprobante(AHORA);
    const html = await servida();

    expect(html).toContain(">Mejor entro con Google</button>");
    expect(html).toContain(`href="/signin?callbackUrl=${encodeURIComponent(FICHA)}"`);
    expect(html).toContain("← Cambiar de correo");
    expect(html).toMatch(
      new RegExp(`<input[^>]*type="hidden"[^>]*name="callbackUrl"[^>]*value="${FICHA}"`),
    );
  });

  /**
   * **El aviso de la 9c sale servido y escondido** (15.14). Que el texto viaje
   * en el HTML y el guion sólo le quite el `hidden` es lo que mantiene la copia
   * de producto adentro del dominio: si el guion la escribiera, la frase
   * viviría en el frente.
   */
  it("el aviso de que el enlace se abrió en otro dispositivo va servido y oculto", async () => {
    conHuella(AHORA);
    const html = await servida();

    expect(html).toMatch(/<p[^>]*data-testid="espera-entro"[^>]*role="status"[^>]*hidden[^>]*>/);
    expect(html).toContain(`${AVISO_NEUTRO}</p>`);
  });

  /**
   * **El sondeo no lleva la dirección a ninguna parte**, que es la tarea 15.14
   * entera: lo que identifica a quien pregunta es el comprobante `httpOnly`, y
   * una dirección en la ruta la haría preguntable por cualquiera.
   */
  it("el sondeo va en línea y no escribe la dirección en ninguna parte", async () => {
    conHuella(AHORA);
    const html = await servida();

    // El `<script>` de reenvío de formularios que React inyecta fuera del
    // compilador de Next también está acá (ver el encabezado), así que se
    // busca el que lleva el sondeo y no «el primero».
    const guion =
      html
        .match(/<script>([\s\S]*?)<\/script>/g)
        ?.find((etiqueta) => etiqueta.includes("/signin/revisa-tu-correo/estado")) ?? "";

    expect(guion).not.toBe("");
    expect(guion).not.toContain(CORREO);
    expect(guion).not.toContain("@");
  });

  /** Sin huella no hay nada que preguntar: no se dibuja el sondeo. */
  it("sin huella no se sirve el sondeo", async () => {
    conComprobante(AHORA);

    expect(await servida()).not.toContain("/signin/revisa-tu-correo/estado");
  });

  /** Un destino forjado en la cookie no llega a la pantalla (§7). */
  it("un destino que la regla no admite no aparece en los bytes servidos", async () => {
    jar.set(
      TICKET_COOKIE,
      JSON.stringify({ a: CORREO, t: AHORA, r: "https://evil.test/publicar" }),
    );
    const html = await servida();

    expect(html).not.toContain("evil.test");
    expect(html).toContain('href="/signin"');
  });
});
