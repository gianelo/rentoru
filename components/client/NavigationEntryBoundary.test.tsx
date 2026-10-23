// @vitest-environment happy-dom
import { act, Component, type ReactNode, Suspense, use } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NavigationEntryBoundary } from "./NavigationEntryBoundary";

const policy = {
  deadlineMs: 10_000,
  label: "Cargando publicación…",
  exitLabel: "Volver al inicio",
  exitHref: "/",
  recoveryHref: "/publicar/error-de-carga",
};
let root: Root;
let host: HTMLDivElement;
let background: HTMLButtonElement;
let replace: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.useFakeTimers();
  background = document.createElement("button");
  background.textContent = "Fondo";
  background.inert = false;
  document.body.append(background);
  background.focus();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  replace = vi.spyOn(window.location, "replace").mockImplementation(() => {});
});
afterEach(() => {
  act(() => root.unmount());
  window.dispatchEvent(new Event("pagehide"));
  // A real document replacement owns this shield's end; test documents are reset.
  document.querySelectorAll("[data-navigation-terminal]").forEach((node) => {
    node.remove();
  });
  host.remove();
  background.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
function render(children: ReactNode = null) {
  act(() =>
    root.render(<NavigationEntryBoundary policy={policy}>{children}</NavigationEntryBoundary>),
  );
}

it("shows pending entry, focuses native exit and contains Tab and Escape", () => {
  render();
  const exit = host.querySelector("a");
  if (!exit) throw new Error("Pending entry must render a native exit");
  expect(host.textContent).toContain(policy.label);
  expect(exit.getAttribute("href")).toBe("/");
  expect(document.activeElement).toBe(exit);
  expect(background.inert).toBe(true);
  const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
  exit.dispatchEvent(tab);
  expect(tab.defaultPrevented).toBe(true);
  exit.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  expect(replace).toHaveBeenCalledWith("/");
});

it("persists through a null redirect commit and expires once at 10000 not 9999", () => {
  render();
  act(() => vi.advanceTimersByTime(9_999));
  render(null);
  expect(replace).not.toHaveBeenCalled();
  expect(host.textContent).toContain(policy.label);
  act(() => vi.advanceTimersByTime(1));
  expect(replace).toHaveBeenCalledExactlyOnceWith(policy.recoveryHref);
  act(() => vi.advanceTimersByTime(20_000));
  expect(replace).toHaveBeenCalledTimes(1);
});

it("restores focus and prior inert on success before deadline and never rearms", async () => {
  const originallyInert = document.createElement("div");
  originallyInert.inert = true;
  document.body.append(originallyInert);
  render();
  expect(host.textContent).toContain(policy.label);
  render(<h1>Destino</h1>);
  await act(async () => {
    await new Promise<void>((resolve) => queueMicrotask(resolve));
  });
  expect(host.textContent).not.toContain(policy.label);
  expect(background.inert).toBe(false);
  expect(originallyInert.inert).toBe(true);
  originallyInert.remove();
  expect(document.activeElement).toBe(background);
  render(null);
  act(() => vi.advanceTimersByTime(30_000));
  expect(replace).not.toHaveBeenCalled();
});

it("cleans timer focus inert and listeners on early unmount", () => {
  render();
  expect(host.textContent).toContain(policy.label);
  act(() => root.render(null));
  expect(background.inert).toBe(false);
  expect(document.activeElement).toBe(background);
  act(() => vi.advanceTimersByTime(20_000));
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  expect(replace).not.toHaveBeenCalled();
});

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <h1>Error resuelto</h1> : this.props.children;
  }
}

it("restores pending resources when an error boundary removes the entry", () => {
  let fail = false;
  function Destination() {
    if (fail) throw new Error("Destination failed");
    return null;
  }
  const presentation = () => (
    <ErrorBoundary>
      <NavigationEntryBoundary policy={policy}>
        <Destination />
      </NavigationEntryBoundary>
    </ErrorBoundary>
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
  act(() => root.render(presentation()));
  expect(host.textContent).toContain(policy.label);
  fail = true;
  act(() => root.render(presentation()));
  expect(host.textContent).toBe("Error resuelto");
  expect(background.inert).toBe(false);
  expect(document.activeElement).toBe(background);
  act(() => vi.advanceTimersByTime(20_000));
  expect(replace).not.toHaveBeenCalled();
});

it("waits for actual Suspense children rather than an empty fallback commit", async () => {
  let resolve!: (value: ReactNode) => void;
  const deferred = new Promise<ReactNode>((done) => {
    resolve = done;
  });
  function Destination() {
    return use(deferred);
  }
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <Destination />
      </Suspense>,
    );
  });
  expect(host.textContent).toContain(policy.label);
  act(() => vi.advanceTimersByTime(9_999));
  expect(replace).not.toHaveBeenCalled();
  await act(async () => {
    resolve(<h1>Destino listo</h1>);
  });
  expect(host.textContent).toBe("Destino listo");
  act(() => vi.advanceTimersByTime(20_000));
  expect(replace).not.toHaveBeenCalled();
});

it("overrides author display on late body children after terminal unmount", async () => {
  const stylesheet = document.createElement("style");
  stylesheet.textContent = ".terminal-dock { display: flex; }";
  document.head.append(stylesheet);
  const dock = document.createElement("nav");
  dock.className = "terminal-dock";
  try {
    render();
    act(() => vi.advanceTimersByTime(10_000));
    act(() => root.render(<h1>Otra ruta</h1>));
    document.body.append(dock);
    expect(getComputedStyle(dock).display).toBe("flex");
    await act(async () => {
      await new Promise<void>((resolve) => queueMicrotask(resolve));
    });
    expect(dock.hidden).toBe(true);
    expect(dock.inert).toBe(true);
    expect(getComputedStyle(dock).display).toBe("none");
    expect(document.querySelector("[data-navigation-terminal]")).not.toBeNull();
    expect(replace).toHaveBeenCalledExactlyOnceWith(policy.recoveryHref);
  } finally {
    dock.remove();
    stylesheet.remove();
  }
});

it("keeps late children and a new destination shielded after terminal unmount", () => {
  render();
  act(() => vi.advanceTimersByTime(10_000));
  render(<h1>Contenido tardío</h1>);
  expect(host.querySelector("[data-navigation-content]")?.hasAttribute("hidden")).toBe(true);
  act(() => root.render(<h1>Otra ruta</h1>));
  expect(document.querySelector("[data-navigation-terminal]")).not.toBeNull();
  expect(host.inert).toBe(true);
  expect(replace).toHaveBeenCalledTimes(1);
});
