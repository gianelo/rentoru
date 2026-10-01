// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { PhotoStripNavigation } from "./PhotoStripNavigation";

const photos = [1, 2, 3].map((n) => ({
  strip: `strip-${n}`,
  detail: `detail-${n}`,
  thumb: `thumb-${n}`,
  alt: `Foto ${n} de 3`,
}));
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: true }),
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

it("keeps photo order and synchronizes the snapped photo after native scrolling", () => {
  act(() =>
    root.render(<PhotoStripNavigation photos={photos} base="https://photos.test" href="/ficha" />),
  );
  expect(host.querySelector('[role="status"]')?.getAttribute("aria-hidden")).toBe("false");
  expect(host.querySelector('nav a[aria-current="true"]')?.getAttribute("href")).toBe(
    "/ficha/foto/1",
  );
  const track = host.querySelector("ul") as HTMLUListElement;
  const items = [...track.children] as HTMLElement[];
  Object.defineProperty(track, "clientWidth", { value: 300 });
  items.forEach((item, index) => {
    Object.defineProperty(item, "offsetLeft", { value: index * 300 });
    Object.defineProperty(item, "offsetWidth", { value: 300 });
  });
  track.scrollLeft = 300;
  act(() => track.dispatchEvent(new Event("scrollend", { bubbles: true })));
  expect(host.querySelector('[role="status"]')?.getAttribute("aria-label")).toBe("Foto 2 de 3");
  expect(host.querySelectorAll('[data-selected="true"]')).toHaveLength(1);
  expect(host.querySelectorAll('nav a[aria-current="true"]')).toHaveLength(1);
  expect(host.querySelector('a[data-testid="photo-hero"]')?.getAttribute("href")).toBe(
    "/ficha/foto/2",
  );
  expect([...track.querySelectorAll("a")].map((link) => link.getAttribute("href"))).toEqual([
    "/ficha/foto/1",
    "/ficha/foto/2",
    "/ficha/foto/3",
  ]);
});

it("thumbnail navigation does not change the gallery before leaving", () => {
  act(() =>
    root.render(<PhotoStripNavigation photos={photos} base="https://photos.test" href="/ficha" />),
  );
  const link = host.querySelectorAll("nav a")[2] as HTMLAnchorElement;
  act(() => link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
  expect(link.getAttribute("href")).toBe("/ficha/foto/3");
  expect(host.querySelector('[role="status"]')?.getAttribute("aria-label")).toBe("Foto 1 de 3");
});
