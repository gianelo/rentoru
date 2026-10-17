import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const { scripts } = JSON.parse(readFileSync("package.json", "utf8"));
const smoke = ["tests/e2e/publish-access.spec.ts", "tests/e2e/busqueda-inicio.spec.ts"];
const critical = [
  ...smoke,
  "tests/e2e/camino-de-lectura-sin-javascript.spec.ts",
  "tests/e2e/filtros-sin-javascript.spec.ts",
  "tests/e2e/sugerencias-sin-javascript.spec.ts",
  "tests/e2e/aviso-malformado-sin-javascript.spec.ts",
];

describe("public-read E2E profile commands", () => {
  it.each([
    ["test:e2e:smoke:read", smoke],
    ["test:e2e:critical:read", critical],
  ] as const)("%s selects existing reads with and without JavaScript", (name, files) => {
    expect(scripts[name]).toBe(
      ["playwright test", ...files, "--project=chromium", "--project=crawlability"].join(" "),
    );
  });

  it("preserves general E2E and the separate measurement harness", () => {
    expect(scripts["test:e2e"]).toBe("playwright test");
    expect(scripts["test:measure"]).toBe("playwright test --config=playwright.measure.config.ts");
  });
});
