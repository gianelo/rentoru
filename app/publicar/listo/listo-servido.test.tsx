import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublishedListingReading } from "@/modules/listing-publication/application/read-published-listing";

/**
 * tasks.md 37.4 — the Listo screen, served. The read itself (owner, active,
 * not expired, in the WHERE) is proven against Postgres in
 * `tests/integration/published-listing.test.ts`; here the page is the
 * subject: what it draws, and that every unreadable listing lands on the same
 * redirect, so a typed id cannot tell "missing" from "someone else's".
 */
const { redirect, read } = vi.hoisted(() => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  }),
  read: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/shared/db/client", () => ({ db: {} }));
vi.mock("../../_lib/require-session", () => ({
  requireSession: async () => ({ userId: "publicador-1", email: "dueno@ejemplo.com" }),
}));
vi.mock("@/modules/listing-publication/application/read-published-listing", () => ({
  readPublishedListing: read,
}));
vi.mock("@/modules/listing-discovery/infrastructure/photo-public-base-url", () => ({
  readPhotoPublicBaseUrl: () => "https://fotos.example",
}));

import buttons from "@/../components/atoms/Button.module.css";
import listo from "./listo.module.css";
import PublishDonePage from "./page";

const ID = "0b6f2c9e-4d1a-4f7b-9c3e-2a5d8e1f7b40";
const READING: PublishedListingReading = {
  listing: {
    id: ID,
    title: "Apartamento con vista",
    propertyType: "apartamento",
    cityName: "Distrito Capital",
    zoneName: "Los Palos Grandes",
    priceUsd: 450,
    rooms: 2,
    bathrooms: 2,
    areaM2: 78,
    publisherType: "owner",
    expiresAt: new Date("2026-11-22T12:00:00Z"),
  },
  cover: { position: 0, keys: { thumb: "l/a/thumb.webp", card: "l/a/card.webp" }, photoCount: 3 },
};

async function served(id: string | undefined): Promise<string> {
  return renderToStaticMarkup(await PublishDonePage({ searchParams: Promise.resolve({ id }) }));
}

beforeEach(() => {
  read.mockReset();
  redirect.mockClear();
});

describe("pantalla Listo servida (37.4)", () => {
  it("reads the listing for the signed-in publisher with the raw id from the URL", async () => {
    read.mockResolvedValue(READING);
    await served(ID);
    expect(read).toHaveBeenCalledWith("publicador-1", ID, expect.any(Date), expect.anything());
  });

  it("draws the published listing, its expiry and the three real destinations", async () => {
    read.mockResolvedValue(READING);
    const html = await served(ID);

    expect(html).toMatch(/<h1[^>]*>Tu aviso está publicado<\/h1>/);
    expect(html).toContain("Ya aparece en las búsquedas y cualquiera puede verlo.");
    expect(html).toContain('srcSet="https://fotos.example/l/a/card.webp"');
    expect(html).toMatch(/<img[^>]*src="https:\/\/fotos\.example\/l\/a\/thumb\.webp"/);
    expect(html).toContain('alt="Foto 1 de 3 — Apartamento con vista, Los Palos Grandes"');
    expect(html).toContain("$450");
    expect(html).toContain("Apartamento · Los Palos Grandes");
    expect(html).toContain("2 hab · 2 baños · 78 m²");
    expect(html).toContain(">Dueño<");
    expect(html).toContain('<time dateTime="2026-11-22">22 de noviembre de 2026</time>');
    expect(html).toContain(
      "Dura 30 días. Te avisamos por correo antes de que venza para que puedas renovarlo.",
    );
    expect(html).toMatch(
      /<a [^>]*href="\/alquiler\/distrito-capital\/los-palos-grandes\/apartamento-con-vista-0b6f2c9e[^"]*"[^>]*>Ver mi aviso<\/a>/,
    );
    expect(html).toMatch(/<a [^>]*href="\/mis-avisos"[^>]*>Ir a Mis avisos<\/a>/);
    expect(html).toMatch(/<a [^>]*href="\/publicar"[^>]*>Publicar otro aviso<\/a>/);
  });

  it("no longer shows the internal id or says the listing page is being built", async () => {
    read.mockResolvedValue(READING);
    const html = await served(ID);
    expect(html).not.toContain(`>${ID}<`);
    expect(html).not.toContain("Referencia");
    expect(html).not.toContain("se está construyendo");
  });

  it("sends every unreadable listing to Mis avisos the same way, whatever the reason", async () => {
    read.mockResolvedValue(null);
    for (const id of [ID, "otro-id", undefined]) {
      await expect(served(id)).rejects.toThrow("NEXT_REDIRECT:/mis-avisos");
    }
    expect(redirect.mock.calls).toEqual([["/mis-avisos"], ["/mis-avisos"], ["/mis-avisos"]]);
  });
});

describe("diseño de la pantalla Listo (37.4b)", () => {
  it("draws one primary action, a neutral one and a text link, as the system's hierarchy asks", async () => {
    read.mockResolvedValue(READING);
    const html = await served(ID);
    const classOf = (label: string) =>
      html.match(new RegExp(`<a [^>]*class="([^"]*)"[^>]*>${label}</a>`))?.[1]?.split(" ") ?? [];

    expect(classOf("Ver mi aviso")).toContain(buttons.action);
    expect(classOf("Ir a Mis avisos")).toContain(buttons.neutral);
    expect(classOf("Publicar otro aviso")).toEqual([listo.textLink]);
    expect(html.match(new RegExp(buttons.action ?? "^$", "g"))).toHaveLength(1);
  });

  it("gives the check mark its own confirmation role, not the loading one", async () => {
    read.mockResolvedValue(READING);
    expect(await served(ID)).toContain(`<span class="${listo.mark}" aria-hidden="true">✓</span>`);
    const css = readFileSync("app/publicar/listo/listo.module.css", "utf8");
    const mark = css.match(/\.mark\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(mark).toContain("var(--done-mark-size)");
    expect(mark).toContain("var(--done-mark-fs)");
    expect(css).not.toContain("--wait-mark");
    expect(readFileSync("src/styles/tokens.css", "utf8")).toMatch(
      /--done-mark-size:\s*56px;\s*--done-mark-fs:\s*22px;/,
    );
  });
});
