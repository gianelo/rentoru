import { expect, it } from "vitest";
import { navigationEntryPolicy } from "./navigation-entry-policy";

it("owns the serializable initial entry deadline and native recovery destinations", () => {
  expect(JSON.parse(JSON.stringify(navigationEntryPolicy()))).toEqual({
    deadlineMs: 10_000,
    label: "Cargando publicación…",
    exitLabel: "Volver al inicio",
    exitHref: "/",
    recoveryHref: "/publicar/error-de-carga",
  });
});
