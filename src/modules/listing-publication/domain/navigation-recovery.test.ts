import { describe, expect, it } from "vitest";
import { NAVIGATION_RECOVERY } from "./navigation-recovery";

describe("navigation recovery", () => {
  it("offers retry and home without inventing a publication outcome", () => {
    expect(NAVIGATION_RECOVERY).toEqual({
      heading: "La navegación tardó demasiado",
      body: "Puedes reintentar la navegación o volver al inicio.",
      reference: null,
      retry: { href: "/publicar", label: "Reintentar" },
      exit: { href: "/", label: "Inicio" },
    });
    expect(JSON.stringify(NAVIGATION_RECOVERY)).not.toMatch(
      /guardad|publicación fall|registrad|digest|stack/i,
    );
  });
});
