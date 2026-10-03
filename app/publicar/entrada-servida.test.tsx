import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import PublicationLayout from "./layout";

const request = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock("next/headers", () => ({ headers: async () => request.headers }));
beforeEach(() => {
  request.headers = new Headers();
});

it("serves the actual publication caller with policy label and native exit on client entry", async () => {
  request.headers.set("sec-fetch-dest", "empty");
  const body = renderToStaticMarkup(await PublicationLayout({ children: null }));
  expect(body).toContain("Cargando publicación…");
  expect(body).toContain('href="/"');
  expect(body).toContain("Volver al inicio");
});

it.each([
  {},
  { "sec-fetch-dest": "document" },
  { "sec-fetch-dest": "empty", "next-action": "action" },
  { "sec-fetch-dest": "empty", "content-type": "multipart/form-data" },
])("keeps native document and action transport outside entry enhancement: %j", async (headers) => {
  request.headers = new Headers(headers as Record<string, string>);
  const body = renderToStaticMarkup(await PublicationLayout({ children: <h1>Destino nativo</h1> }));
  expect(body).toBe("<h1>Destino nativo</h1>");
});
