// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildSearchPanel,
  type SearchPanelInput,
} from "@/modules/listing-search/domain/search-panel";
import { SearchPanel } from "./SearchPanel";

const COUNTS = {
  total: 16,
  byZone: { chacao: 12, altamira: 9, rosal: 0 },
  byMinRooms: { 1: 16, 2: 9, 3: 4, 4: 0 },
  byMinBathrooms: { 1: 16, 2: 7, 3: 0 },
  byAttribute: {
    hasPowerPlant: 9,
    hasRegularWater: 12,
    isFurnished: 4,
    hasParking: 11,
    hasSecurity: 0,
    hasAppliances: 3,
  },
  byPublisherType: { owner: 11, broker: 5 },
  withoutFilter: {
    zone: 40,
    price: 22,
    rooms: 31,
    bathrooms: 31,
    publisherType: 25,
    hasPowerPlant: 18,
    hasRegularWater: 19,
    isFurnished: 20,
    hasParking: 24,
    hasSecurity: 21,
    hasAppliances: 23,
    area: 27,
  },
  byPriceBucket: [
    { count: 1, lowestUsd: 200, highestUsd: 240 },
    { count: 2, lowestUsd: 300, highestUsd: 380 },
    { count: 4, lowestUsd: 400, highestUsd: 495 },
    { count: 3, lowestUsd: 505, highestUsd: 590 },
    { count: 3, lowestUsd: 610, highestUsd: 690 },
    { count: 1, lowestUsd: 720, highestUsd: 780 },
    { count: 1, lowestUsd: 880, highestUsd: 880 },
    { count: 1, lowestUsd: 1000, highestUsd: 1000 },
  ],
  cityTotal: 70,
} as const;

const INPUT: SearchPanelInput = {
  basePath: "/alquiler/distrito-capital",
  cityPath: "/alquiler/distrito-capital",
  query: { filtros: "todos" },
  cityName: "Distrito Capital",
  zones: [
    { id: "chacao", name: "Chacao", slug: "chacao", path: "/alquiler/distrito-capital/chacao" },
    {
      id: "altamira",
      name: "Altamira",
      slug: "altamira",
      path: "/alquiler/distrito-capital/altamira",
    },
  ],
  chosenZoneIds: [],
  counts: COUNTS,
  criteria: {},
};

function panel() {
  return <SearchPanel model={buildSearchPanel(INPUT)} />;
}

describe("SearchPanel — mejora modal con JavaScript (28.2)", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.history.replaceState(null, "", "/alquiler/distrito-capital?filtros=todos");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function renderOpen() {
    act(() => root.render(panel()));
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
  }

  it("Escape cierra el modal sin navegar", () => {
    renderOpen();

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(window.location.pathname + window.location.search).toBe(
      "/alquiler/distrito-capital?filtros=todos",
    );
  });

  it("un clic afuera cierra el modal sin aplicar filtros", () => {
    renderOpen();

    act(() => {
      document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    });

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(window.location.search).toBe("?filtros=todos");
  });

  function findOption(param: string, value: string) {
    const link = Array.from(container.querySelectorAll("a")).find((candidate) => {
      const url = new URL(candidate.href, window.location.href);
      return url.searchParams.get(param) === value;
    }) as HTMLAnchorElement | undefined;

    expect(link).toBeDefined();
    return link;
  }

  it("las opciones actualizan un borrador: la URL de fondo no cambia hasta Aplicar filtros", () => {
    renderOpen();
    const roomTwo = findOption("hab", "2");

    act(() => roomTwo?.click());

    expect(window.location.search).toBe("?filtros=todos");
    const confirm = container.querySelector('[data-testid="search-confirm"]') as HTMLElement;

    act(() => confirm.click());

    expect(window.location.pathname + window.location.search).toBe(
      "/alquiler/distrito-capital?hab=2",
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("compone dos opciones consecutivas en el borrador sin navegar antes de confirmar", () => {
    renderOpen();
    const roomTwo = findOption("hab", "2");
    const bathroomTwo = findOption("banos", "2");

    act(() => roomTwo?.click());
    expect(window.location.search).toBe("?filtros=todos");

    act(() => bathroomTwo?.click());
    expect(window.location.search).toBe("?filtros=todos");

    const confirm = container.querySelector('[data-testid="search-confirm"]') as HTMLElement;
    act(() => confirm.click());

    expect(window.location.pathname + window.location.search).toBe(
      "/alquiler/distrito-capital?hab=2&banos=2",
    );
    expect(window.location.search).not.toContain("filtros=todos");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("quita una opción agregada sólo al borrador cuando se vuelve a tocar antes de aplicar", () => {
    renderOpen();
    const roomTwo = findOption("hab", "2");

    act(() => roomTwo?.click());
    expect(window.location.search).toBe("?filtros=todos");

    act(() => roomTwo?.click());
    expect(window.location.search).toBe("?filtros=todos");

    const confirm = container.querySelector('[data-testid="search-confirm"]') as HTMLElement;
    act(() => confirm.click());

    expect(window.location.pathname + window.location.search).toBe("/alquiler/distrito-capital");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("Limpiar todo aplica la búsqueda limpia y cierra la dirección del modal", () => {
    renderOpen();
    const clear = Array.from(container.querySelectorAll("a")).find(
      (link) => link.textContent?.trim() === "Limpiar todo",
    ) as HTMLAnchorElement;

    act(() => clear.click());

    expect(window.location.pathname + window.location.search).toBe("/alquiler/distrito-capital");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});
