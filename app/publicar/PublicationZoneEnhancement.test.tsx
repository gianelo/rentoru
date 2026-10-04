// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicationZoneOption } from "../../src/modules/listing-publication/domain/zone-search";
import { PublicationZoneReference } from "./PublicationZoneControls";
import {
  PublicationZoneEnhancement,
  PublicationZoneResults,
  PublicationZoneSearch,
} from "./PublicationZoneEnhancement";

const saved = { zoneId: "saved", label: "Zona guardada" };
const fresh = {
  zoneId: "fresh",
  cityId: "dc",
  label: "Alta Florida",
  scope: "Libertador · Distrito Capital",
};
const other = { zoneId: "other", cityId: "mc", label: "Alta Florida", scope: "Maracaibo" };
let container: HTMLDivElement;
let root: Root;
const fetchMock = vi.fn();

function deferred() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function response(options: readonly PublicationZoneOption[], ok = true) {
  return { ok, json: async () => options } as Response;
}
function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing test control");
  return value;
}
function query() {
  return required(container.querySelector<HTMLInputElement>("#q"));
}
function form() {
  return required(container.querySelector<HTMLFormElement>('form[method="post"]'));
}
function values() {
  return new FormData(form()).getAll("zoneId");
}
function type(value: string) {
  act(() => {
    // React tracks the setter; a native input event must bypass its tracker.
    required(Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set).call(
      query(),
      value,
    );
    query().dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function debounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(250);
  });
}
async function answer(
  request: ReturnType<typeof deferred>,
  options: readonly PublicationZoneOption[],
  ok = true,
) {
  await act(async () => {
    request.resolve(response(options, ok));
  });
}
function mount(results: readonly PublicationZoneOption[] = []) {
  act(() =>
    root.render(
      <PublicationZoneEnhancement enabled results={results} selected={saved}>
        <PublicationZoneSearch query="initial" />
        <form method="post">
          <PublicationZoneResults results={results} selected={saved} />
          <PublicationZoneReference reference="Original" />
          <button type="submit">Seguir</button>
        </form>
      </PublicationZoneEnhancement>,
    ),
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockResolvedValue(response([fresh, other]));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("sugerencias progresivas en el POST existente", () => {
  it("teclear sin Buscar actualiza radios en el POST, conserva alcance y foco", async () => {
    mount();
    query().focus();
    type("alta");
    await debounce();
    expect(form().textContent).toContain("Alta Florida");
    expect(form().textContent).toContain("Libertador · Distrito Capital");
    expect(form().textContent).toContain("Maracaibo");
    expect(form().querySelectorAll('input[name="zoneId"]')).toHaveLength(3);
    expect(document.activeElement).toBe(query());
    expect(values()).toEqual(["saved"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/publicar/zonas?q=alta",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
  it("conserva la zona guardada en nueva, vacía y error", async () => {
    mount();
    for (const result of [response([fresh]), response([]), response([], false)]) {
      fetchMock.mockResolvedValueOnce(result);
      type(`saved${fetchMock.mock.calls.length}`);
      await debounce();
      expect(values()).toEqual(["saved"]);
      expect(new FormData(form()).get("reference")).toBe("Original");
    }
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it("no solicita ni reinicia al montar", async () => {
    mount([fresh]);
    await debounce();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(query().value).toBe("initial");
    expect(values()).toEqual(["saved"]);
  });
  it("retiene la nueva elección y la referencia en nueva, vacía y error", async () => {
    mount([fresh]);
    const reference = required(container.querySelector<HTMLInputElement>("#reference"));
    reference.value = "Frente al parque editado";
    act(() => required(form().querySelector<HTMLInputElement>('input[value="fresh"]')).click());
    expect(values()).toEqual(["fresh"]);
    for (const result of [response([other]), response([]), response([], false)]) {
      fetchMock.mockResolvedValueOnce(result);
      type(`consulta${fetchMock.mock.calls.length}`);
      await debounce();
      expect(values()).toEqual(["fresh"]);
      expect(form().textContent).toContain("Alta Florida");
      expect(container.querySelector("#reference")).toBe(reference);
      expect(new FormData(form()).get("reference")).toBe("Frente al parque editado");
    }
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it("invalida A al teclear B antes del debounce y después de responder B, aun ignorando abort", async () => {
    mount();
    const a = deferred();
    const b = deferred();
    const c = deferred();
    const d = deferred();
    fetchMock
      .mockReturnValueOnce(a.promise)
      .mockReturnValueOnce(b.promise)
      .mockReturnValueOnce(c.promise)
      .mockReturnValueOnce(d.promise);
    type("A");
    await debounce();
    type("B");
    expect((required(fetchMock.mock.calls[0])[1].signal as AbortSignal).aborted).toBe(true);
    await answer(a, [{ ...fresh, label: "Respuesta A" }]);
    expect(form().textContent).not.toContain("Respuesta A");
    await debounce();
    await answer(b, [other]);
    type("C");
    await debounce();
    type("D");
    await debounce();
    await answer(d, [{ ...other, label: "Respuesta D" }]);
    await answer(c, [{ ...fresh, label: "Respuesta C" }]);
    expect(form().textContent).toContain("Respuesta D");
    expect(form().textContent).not.toContain("Respuesta C");
  });
  it("vaciar y desmontar invalidan pendientes y no hacen una petición vacía", async () => {
    mount();
    const pending = deferred();
    fetchMock.mockReturnValueOnce(pending.promise);
    type("alta");
    await debounce();
    type("");
    await answer(pending, [fresh]);
    await debounce();
    expect(form().textContent).not.toContain("Alta Florida");
    expect(values()).toEqual(["saved"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const next = deferred();
    fetchMock.mockReturnValueOnce(next.promise);
    type("otra");
    await debounce();
    act(() => root.unmount());
    root = createRoot(container);
    expect((required(fetchMock.mock.calls[1])[1].signal as AbortSignal).aborted).toBe(true);
    await answer(next, [fresh]);
    expect(container.textContent).toBe("");
  });
  it("rechaza HTTP no-ok antes de leer un array de zonas", async () => {
    mount();
    const json = vi.fn().mockResolvedValue([fresh]);
    fetchMock.mockResolvedValueOnce({ ok: false, json });
    type("fallo");
    await debounce();
    expect(json).not.toHaveBeenCalled();
    expect(form().textContent).not.toContain("Alta Florida");
    expect(values()).toEqual(["saved"]);
  });
  it("rechazo de transporte y JSON no-array no borran selección ni referencia", async () => {
    mount([fresh]);
    for (const result of [
      () => Promise.reject(new Error("offline")),
      () => Promise.resolve({ ok: true, json: async () => ({ error: "bad" }) }),
    ]) {
      fetchMock.mockImplementationOnce(result);
      type(`q${fetchMock.mock.calls.length}`);
      await debounce();
      expect(values()).toEqual(["saved"]);
      expect(new FormData(form()).get("reference")).toBe("Original");
    }
  });
});
