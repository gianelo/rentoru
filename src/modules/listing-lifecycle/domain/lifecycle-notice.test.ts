import { describe, expect, it, vi } from "vitest";
import { composeNotice, noticeDueFor } from "./lifecycle-notice";

const EXPIRES_AT = new Date("2026-08-31T10:00:00.000Z");
// El ciclo del plan: publicado el día 1, vence el 30, purga el 45.
const DAY_27 = new Date("2026-08-28T10:00:00.000Z");
const DAY_40 = new Date("2026-09-10T10:00:00.000Z");

describe("noticeDueFor", () => {
  it("el día 27 toca el aviso de vencimiento", () => {
    expect(noticeDueFor(EXPIRES_AT, DAY_27)).toBe("expiry");
  });

  it("el día 40 toca el aviso de purga", () => {
    expect(noticeDueFor(EXPIRES_AT, DAY_40)).toBe("purge");
  });

  // La franja del medio: ya venció, todavía faltan más de 5 días para la
  // purga. No hay nada que decir, y decir algo sería el tercer correo que
  // nadie pidió.
  it("no toca nada entre el vencimiento y la anticipación de la purga", () => {
    expect(noticeDueFor(EXPIRES_AT, new Date("2026-09-02T10:00:00.000Z"))).toBeNull();
  });

  it("no toca nada mucho antes de vencer", () => {
    expect(noticeDueFor(EXPIRES_AT, new Date("2026-08-10T10:00:00.000Z"))).toBeNull();
  });

  // **Los dos correos son dos, y esto es lo que lo prueba.** Un solo aviso
  // dejaría a quien ignoró el primero sin segunda advertencia antes de una
  // borrada irreversible (19.5/19.8).
  it("el mismo aviso recibe DOS avisos distintos a lo largo de su ciclo", () => {
    expect(new Set([noticeDueFor(EXPIRES_AT, DAY_27), noticeDueFor(EXPIRES_AT, DAY_40)])).toEqual(
      new Set(["expiry", "purge"]),
    );
  });

  it("después de la purga ya no hay nada que avisar", () => {
    expect(noticeDueFor(EXPIRES_AT, new Date("2026-09-16T10:00:00.000Z"))).toBeNull();
  });
});

describe("composeNotice", () => {
  const listing = { id: "abc", title: "Apartamento 2 habitaciones", expiresAt: EXPIRES_AT };
  const URL = "https://rentoru.com/renovar/T";
  const TITLE = "«Apartamento 2 habitaciones»";
  const RENEW = [
    { kind: "action", label: "Renovar mi aviso", href: URL },
    { kind: "fallback", label: "O copia este enlace en tu navegador:", url: URL },
  ];
  const FOOTER = {
    kind: "footer",
    lines: [
      "Te escribimos porque publicaste este aviso en Rentoru.",
      "Rentoru · alquileres en Distrito Capital y Maracaibo",
    ],
  };

  // Los bloques de la lámina v1 (38.4), en su orden, con los textos cortos de L5.
  it("el aviso de vencimiento: días que faltan, fecha límite y botón de renovar", () => {
    expect(composeNotice("expiry", listing, DAY_27, URL)).toEqual({
      subject: "Tu aviso vence en 3 días",
      blocks: [
        { kind: "heading", text: "Tu aviso vence en 3 días" },
        {
          kind: "fact",
          label: "Vence el",
          value: "31 de agosto de 2026",
          note: TITLE,
          tone: "warn",
        },
        { kind: "paragraph", text: "¿Sigue disponible? Renuévalo y queda 30 días más." },
        ...RENEW,
        {
          kind: "paragraph",
          text: "Si no lo renuevas, deja de verse en las búsquedas. Puedes activarlo después.",
        },
        FOOTER,
      ],
    });
  });

  it("el último día lo dice en singular, en el asunto y en el título", () => {
    const notice = composeNotice("expiry", listing, new Date("2026-08-30T10:00:00.000Z"), URL);

    expect(notice.subject).toBe("Tu aviso vence en 1 día");
    expect(notice.blocks[0]).toEqual({ kind: "heading", text: "Tu aviso vence en 1 día" });
  });

  // El segundo correo tiene que nombrar la consecuencia —las fotos— y la
  // fecha. «Tu aviso vence» otra vez no le dice a nadie que va a perder algo.
  it("el aviso de purga: el día en que se borran las fotos y cuándo venció", () => {
    expect(composeNotice("purge", listing, DAY_40, URL)).toEqual({
      subject: "Las fotos de tu aviso se borran pronto",
      blocks: [
        { kind: "heading", text: "Las fotos de tu aviso se borran pronto" },
        {
          kind: "fact",
          label: "Las fotos se borran el",
          value: "15 de septiembre de 2026",
          note: `${TITLE} venció el 31 de agosto de 2026.`,
          tone: "warn",
        },
        { kind: "paragraph", text: "Renuévalo antes de esa fecha y conservas las fotos." },
        ...RENEW,
        { kind: "paragraph", text: "Pasada esa fecha, las fotos no se pueden recuperar." },
        FOOTER,
      ],
    });
  });

  // «30» no es un literal del correo: es `LISTING_LIFETIME_DAYS`. Con otra
  // vida del aviso, el correo promete esa otra, no la vieja.
  it("los días que promete renovar salen de la vida del aviso", async () => {
    vi.resetModules();
    vi.doMock("./expiry", async (original) => ({
      ...(await original<typeof import("./expiry")>()),
      LISTING_LIFETIME_DAYS: 45,
    }));
    const fresh = await import("./lifecycle-notice");
    vi.doUnmock("./expiry");

    expect(fresh.composeNotice("expiry", listing, DAY_27, URL).blocks[2]).toEqual({
      kind: "paragraph",
      text: "¿Sigue disponible? Renuévalo y queda 45 días más.",
    });
  });
});
