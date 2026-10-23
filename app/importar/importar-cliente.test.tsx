// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  ImportEncodingError,
  ImportMissingColumnsError,
} from "../../src/modules/broker-bulk-import/application/parse-import-file";
import {
  ImportFileTooLargeError,
  ImportTooManyRowsError,
} from "../../src/modules/broker-bulk-import/application/read-bounded-import-file";
import { ImportMissingAccountContactError } from "../../src/modules/broker-bulk-import/application/run-import-validation";
import { resolveImportRowLocation } from "../../src/modules/broker-bulk-import/domain/resolve-import-locations";
import { ImportarCartera } from "./ImportarCartera";
import { importRowReasonText } from "./import-copy";

let container: HTMLDivElement;
let root: Root;
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<ImportarCartera />));
  const input = container.querySelector("input") as HTMLInputElement;
  Object.defineProperty(input, "files", { value: [new File(["datos"], "cartera.csv")] });
  act(() => input.dispatchEvent(new Event("change", { bubbles: true })));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
async function pulsar(label: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (item) => item.textContent === label,
  );
  expect(button).toBeDefined();
  await act(async () => button?.click());
}
function responder(body: unknown) {
  fetchMock.mockResolvedValueOnce({ json: async () => body });
}

it("F35.6: revisa filas mixtas con razón real, confirma y conserva resumen y duplicados", async () => {
  const city = { id: "dc", name: "Distrito Capital" };
  const zone = { name: "Chacao", cityId: city.id, category: null, parentName: null };
  const reason = resolveImportRowLocation(
    { city: city.name, zone: zone.name },
    [city],
    [
      { ...zone, id: "municipio", kind: "municipio" },
      { ...zone, id: "parroquia", kind: "parroquia", parentName: "Chacao" },
    ],
  ).errorMessages[0] as string;
  const message =
    "«Chacao» coincide con más de un lugar en Distrito Capital: el municipio Chacao y la parroquia Chacao (dentro de Chacao). Escribe el nombre de un lugar más específico dentro de Chacao (una parroquia, urbanización o barrio) para indicar cuál.";
  responder({
    estado: "vista-previa",
    totalFilas: 3,
    listas: 2,
    errores: [
      {
        fila: 4,
        razones: [importRowReasonText(reason), importRowReasonText("externalReference.required")],
        celdas: {
          referencia: "REF-<1>",
          titulo: "Mirá <img src=x> & subí",
          precio: "520",
          zona: "Chacao",
          habitaciones: "2",
        },
        resaltadas: ["zona"],
      },
    ],
  });
  await pulsar("Revisar el archivo");
  expect(container.textContent).toContain("Revisa antes de crear");
  expect(container.textContent).toContain("cartera.csv · 3 filas");
  expect(container.textContent).toContain("2 listas para crear · 1 con un problema");
  expect(container.textContent).toContain(
    "Puedes crear las 2 ahora y las 1 con problema quedan fuera, o corregir el archivo y volver a subirlo completo.",
  );
  expect(container.textContent).toContain(message);
  expect(container.textContent).toContain(
    "Falta la referencia externa: es el código con el que reconoces esta propiedad.",
  );
  expect(container.textContent).toContain("Mirá <img src=x> & subí");
  expect(container.querySelector("img")).toBeNull();
  expect(container.querySelector("mark")?.textContent).toBe("Chacao");
  responder({
    estado: "creado",
    totalFilas: 3,
    creadas: 1,
    yaEstaban: [{ fila: 2, referencia: "REF-<1>" }],
    errores: [],
  });
  await pulsar("Crear las 2 propiedades");
  expect(container.textContent).toContain("Se crearon 1 propiedades. Ninguna se ve todavía.");
  expect(container.textContent).toContain(
    "Les falta lo único que no venía en el archivo: al menos una foto cada una. Hasta entonces quedan como borradores y no aparecen en las búsquedas.",
  );
  expect(container.textContent).toContain(
    "1 ya las habías importado antes y no se duplicaron: REF-<1>.",
  );
  expect(container.querySelector('a[href="/mis-avisos"]')?.textContent).toBe("Ir a mis avisos");
  expect(
    fetchMock.mock.calls.map(([url, init]) => [
      url,
      init.method,
      init.body.get("accion"),
      init.body.get("archivo").name,
    ]),
  ).toEqual([
    ["/api/bulk-import", "POST", "revisar", "cartera.csv"],
    ["/api/bulk-import", "POST", "crear", "cartera.csv"],
  ]);
});

it.each([
  [
    new ImportEncodingError(),
    'No se pudo leer el archivo como UTF-8. Vuelve a exportarlo como "CSV UTF-8" desde tu hoja de cálculo (Excel: Archivo > Guardar como > CSV UTF-8; Google Sheets: Archivo > Descargar > Valores separados por comas).',
  ],
  [
    new ImportMissingColumnsError(["descripcion"]),
    "Faltan columnas obligatorias en el archivo: descripcion. Descarga la plantilla y compara la fila de encabezados.",
  ],
  [
    new ImportFileTooLargeError(),
    "El archivo supera el tamaño máximo de 2 MB (2097152 bytes). Divide la cartera en archivos más pequeños y sube cada uno por separado.",
  ],
  [
    new ImportTooManyRowsError(),
    "El archivo supera el máximo de 50 filas (límite: 50). Divide la cartera en archivos más pequeños y sube cada uno por separado.",
  ],
  [
    new ImportMissingAccountContactError(),
    "Tu cuenta no tiene un método de contacto predeterminado configurado. Configura un método de contacto y su valor en tu cuenta antes de importar: un borrador importado sin un contacto que mostrar no se puede activar.",
  ],
])("F35.6: muestra el rechazo real %s sin confirmar", async (error, message) => {
  responder({ estado: "rechazado", motivo: error.name, mensaje: error.message });
  await pulsar("Revisar el archivo");
  expect(container.querySelector('[role="alert"]')?.textContent).toBe(
    `No pudimos usar ese archivo${message}`,
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(container.textContent).not.toContain("Crear las");
});

it.each([
  [
    "sesión",
    "Tu sesión ya no permite importar. Vuelve a entrar y prueba de nuevo desde «Mis avisos».",
  ],
  ["red", "No pudimos subir el archivo. Revisa la conexión y prueba de nuevo."],
])("F35.6: recupera el rechazo de %s en tuteo", async (kind, message) => {
  if (kind === "sesión") responder({ error: "unauthorized" });
  else fetchMock.mockRejectedValueOnce(new Error("network"));
  await pulsar("Revisar el archivo");
  expect(container.querySelector('[role="alert"]')?.textContent).toBe(
    `No pudimos usar ese archivo${message}`,
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(container.textContent).not.toContain("Crear las");
});
