// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import ts from "typescript";
import { expect, it, vi } from "vitest";
import { SearchPill } from "./SearchPill";

function screenshotCaret(): "hide" | "initial" {
  const source = ts.createSourceFile(
    "nav-search-width.spec.ts",
    readFileSync("tests/measure/nav-search-width.spec.ts", "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const options: ts.ObjectLiteralExpression[] = [];
  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(source) === "page" &&
      node.expression.name.text === "screenshot"
    ) {
      const argument = node.arguments[0];
      if (!argument || !ts.isObjectLiteralExpression(argument))
        throw new Error("Expected literal screenshot options");
      options.push(argument);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (options.length !== 1) throw new Error("Expected one Nav screenshot");
  const caret = options[0]?.properties.find(
    (property) => property.name?.getText(source) === "caret",
  );
  if (!caret) return "hide"; // Playwright's default.
  if (!ts.isPropertyAssignment(caret) || !ts.isStringLiteral(caret.initializer))
    throw new Error("Expected literal caret option");
  const value = caret.initializer.text;
  if (value !== "hide" && value !== "initial") throw new Error("Unknown caret option");
  return value;
}

// Resolve through the installed dependency chain; core is not a root dependency.
const require = createRequire(import.meta.url);
const playwrightRequire = createRequire(require.resolve("@playwright/test"));
const coreRequire = createRequire(playwrightRequire.resolve("playwright"));
const bundle = readFileSync(
  join(dirname(coreRequire.resolve("playwright-core/package.json")), "lib/coreBundle.js"),
  "utf8",
);
const start = bundle.indexOf("function inPagePrepareForScreenshots(");
if (start < 0) throw new Error("Installed screenshot preparation not found");
// Bound parsing to this standalone function, never parse or execute the bundle.
const bounded = bundle.slice(start, start + 16000);
const end = bounded.indexOf("\nfunction trimClipToSize(");
if (end < 0) throw new Error("Installed screenshot preparation boundary not found");
const preparationSource = bounded.slice(0, end);
const parsed = ts.createSourceFile("preparation.js", preparationSource, ts.ScriptTarget.Latest);
const declaration = parsed.statements[0];
if (parsed.statements.length !== 1 || !declaration || !ts.isFunctionDeclaration(declaration))
  throw new Error("Expected one standalone preparation function");
const prepare = new Function(`return (${preparationSource});`)() as (
  style: string,
  hideCaret: boolean,
  disableAnimations: boolean,
  syncAnimations: boolean,
) => void;

type ScreenshotWindow = Window & { __pwCleanupScreenshot?: () => void };

async function hydrateDuringScreenshot(caret: "hide" | "initial") {
  const container = document.createElement("div");
  const element = (
    <SearchPill
      action="/measure/nav"
      name="q"
      value=""
      placeholder="¿En qué zona buscás?"
      submitLabel="Buscar"
      state={{ kind: "empty" }}
      suggestions={{
        cities: [{ id: "dc", name: "Distrito Capital" }],
        zones: [{ id: "chacao", name: "Chacao", cityId: "dc", parentName: null, count: 12 }],
        aliases: [],
      }}
    />
  );
  const actKey = "IS_REACT_ACT_ENVIRONMENT";
  const previousAct = Object.getOwnPropertyDescriptor(globalThis, actKey);
  const screenshotWindow = window as ScreenshotWindow;
  const previousCleanup = Object.getOwnPropertyDescriptor(window, "__pwCleanupScreenshot");
  let root: Root | undefined;
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const recoverable: unknown[] = [];
  try {
    Object.defineProperty(globalThis, actKey, { configurable: true, value: true });
    container.innerHTML = renderToString(element);
    document.body.appendChild(container);
    const input = container.querySelector("input");
    expect(input).not.toBeNull();
    expect(input?.hasAttribute("style")).toBe(false);
    expect(document.activeElement).not.toBe(input);
    prepare("", caret === "hide", false, false);
    const caretHidden = input?.style.getPropertyValue("caret-color") === "transparent";
    expect(caretHidden).toBe(caret === "hide");
    if (caretHidden) expect(input?.style.getPropertyPriority("caret-color")).toBe("important");
    await act(async () => {
      root = hydrateRoot(container, element, {
        onRecoverableError: (error) => recoverable.push(error),
      });
    });
    // Inspect actual React calls privately: never emit the raw HTML/error diff.
    const messages = errors.mock.calls.map((call) => call.map(String).join(" "));
    return {
      errors: messages.length,
      recoverable: recoverable.length,
      inputStyleMismatch: messages.some(
        (message) =>
          message.includes("https://react.dev/link/hydration-mismatch") &&
          /<SearchPill[\s\S]*<input[\s\S]*\n\s*-\s+style=/.test(message),
      ),
    };
  } finally {
    try {
      if (root) await act(async () => root?.unmount());
    } finally {
      screenshotWindow.__pwCleanupScreenshot?.();
      if (previousCleanup) Object.defineProperty(window, "__pwCleanupScreenshot", previousCleanup);
      else delete screenshotWindow.__pwCleanupScreenshot;
      container.remove();
      errors.mockRestore();
      if (previousAct) Object.defineProperty(globalThis, actKey, previousAct);
      else Reflect.deleteProperty(globalThis, actKey);
    }
  }
}

it("Nav screenshot options preserve served SearchPill HTML during actual React hydration", async () => {
  expect(await hydrateDuringScreenshot(screenshotCaret())).toEqual({
    errors: 0,
    recoverable: 0,
    inputStyleMismatch: false,
  });
});

it("installed Playwright caret hide causes an input style hydration attribute diff", async () => {
  expect(await hydrateDuringScreenshot("hide")).toEqual({
    errors: 1,
    recoverable: 0,
    inputStyleMismatch: true,
  });
});

it("installed Playwright caret initial leaves served input attributes intact", async () => {
  expect(await hydrateDuringScreenshot("initial")).toEqual({
    errors: 0,
    recoverable: 0,
    inputStyleMismatch: false,
  });
});
