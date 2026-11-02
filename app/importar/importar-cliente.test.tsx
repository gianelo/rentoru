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
  act(() =>
    root.render(
      <ImportarCartera contact={{ contactMethod: "whatsapp", contactValue: "04121234567" }} />,
    ),
  );
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
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
function responder(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce({ ok: status < 400, status, json: async () => body });
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
    filas: [
      {
        fila: 2,
        celdas: {
          referencia: "A-1",
          precio: "450",
          zona: "Chacao",
          habitaciones: "2",
          titulo: "Uno",
        },
      },
      {
        fila: 3,
        celdas: {
          referencia: "A-2",
          precio: "300",
          zona: "Chacao",
          habitaciones: "1",
          titulo: "Dos",
        },
      },
    ],
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
  expect(container.textContent).toContain("Se creó 1 propiedad. Todavía no se ve.");
  expect(container.textContent).toContain(
    "Le falta lo único que no venía en el archivo: al menos una foto. Hasta entonces queda como borrador y no aparece en las búsquedas.",
  );
  expect(container.textContent).toContain(
    "1 ya las habías importado antes y no se duplicaron: REF-<1>.",
  );
  expect(container.querySelector('a[href="/mis-avisos"]')?.textContent).toBe("Ir a Mis avisos");
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
    "Indica cómo te contactan antes de revisar el archivo: un borrador importado sin un contacto que mostrar no se puede activar.",
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

// tasks.md 45.6-B (S5): «agregar spinner loader para revisar avisos». El
// indicador global del sistema (F36.3, LoadingOverlay): tarjeta a pantalla
// completa con su etiqueta polite y una salida nativa; al terminar se va.
function respuestaPendiente() {
  let resolver: (body: unknown) => void = () => {};
  fetchMock.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolver = (body) => resolve({ ok: true, status: 200, json: async () => body });
      }),
  );
  return (body: unknown) => act(async () => resolver(body));
}
const estado = () => container.querySelector('[role="status"]')?.textContent ?? "";

it("mientras revisa muestra el indicador global «Revisando el archivo…» con salida, y se va al terminar", async () => {
  const responderDespues = respuestaPendiente();
  await pulsar("Revisar el archivo");

  expect(estado()).toBe("Revisando el archivo…");
  const salida = container.querySelector('a[href="/importar"]');
  expect(salida?.textContent).toBe("Dejar de esperar");
  const boton = Array.from(container.querySelectorAll("button")).find(
    (item) => item.textContent === "Revisar el archivo",
  );
  expect(boton?.disabled).toBe(true);

  await responderDespues({ estado: "rechazado", motivo: "x", mensaje: "y" });
  expect(container.querySelector('[role="status"]')).toBeNull();
  expect(boton?.disabled).toBe(false);
});

it("mientras crea anuncia «Creando los avisos…»", async () => {
  responder({ estado: "vista-previa", totalFilas: 1, listas: 1, filas: [], errores: [] });
  await pulsar("Revisar el archivo");
  const responderDespues = respuestaPendiente();
  await pulsar("Crear la propiedad");

  expect(estado()).toBe("Creando los avisos…");

  await responderDespues({
    estado: "creado",
    totalFilas: 1,
    creadas: 1,
    yaEstaban: [],
    errores: [],
  });
  expect(estado()).toBe("");
});

// tasks.md 45.6-B (S5): «el mensaje sale abajo creo que deberiamos de tener una
// pantalla de success». Derivada de «Publicar · Listo» (SISTEMA.md): la ✓ del
// sistema, una sola primaria e importar otro archivo como enlace de texto.
// Reemplaza al formulario: lo que acaba de pasar no es un pie de página.
it("después de crear, la pantalla de éxito reemplaza al formulario y deja volver a importar", async () => {
  responder({ estado: "vista-previa", totalFilas: 3, listas: 3, filas: [], errores: [] });
  await pulsar("Revisar el archivo");
  responder({ estado: "creado", totalFilas: 3, creadas: 3, yaEstaban: [], errores: [] });
  await pulsar("Crear las 3 propiedades");

  expect(container.querySelector('input[type="file"]')).toBeNull();
  expect(container.textContent).not.toContain("Paso 1");
  expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe("✓");
  expect(container.textContent).toContain("Se crearon 3 propiedades. Ninguna se ve todavía.");
  expect(document.activeElement?.textContent).toContain("Se crearon 3 propiedades");
  const primarias = container.querySelectorAll('a[href="/mis-avisos"]');
  expect(primarias).toHaveLength(1);
  expect(primarias[0]?.textContent).toBe("Ir a Mis avisos");

  await pulsar("Importar otro archivo");
  expect(container.querySelector('input[type="file"]')).not.toBeNull();
  expect(container.textContent).toContain("Paso 1");
  expect(container.textContent).not.toContain("Se crearon");
});

// tasks.md 45.6 (L4 hallazgo 2): un 500 no es «la conexión». Next responde
// con un cuerpo que no es JSON, y antes eso caía en el mismo mensaje de red
// que culpa a quien importa. La creación es transaccional (L4), así que
// «no se creó ningún aviso» es verdad y se dice.
it("un 500 dice que falló el servidor y que no se creó nada, sin culpar a la red", async () => {
  fetchMock.mockResolvedValueOnce({
    ok: false,
    status: 500,
    json: async () => {
      throw new SyntaxError("Unexpected token <");
    },
  });
  await pulsar("Revisar el archivo");

  const alerta = container.querySelector('[role="alert"]')?.textContent ?? "";
  expect(alerta).toBe(
    "No pudimos usar ese archivoEl servidor falló al procesar el archivo. No se creó ningún aviso. Prueba de nuevo en un momento.",
  );
  expect(alerta).not.toContain("conexión");
  expect(container.textContent).not.toContain("Crear las");
});

// tasks.md 45.2 (G1): el contacto prellenado viaja con el archivo, y su error
// se dibuja en el campo, no como un archivo rechazado.
it("manda el contacto junto con el archivo", async () => {
  responder({ estado: "rechazado", motivo: "x", mensaje: "y" });
  await pulsar("Revisar el archivo");

  const body = fetchMock.mock.calls[0]?.[1]?.body as FormData;
  expect(body.get("contactMethod")).toBe("whatsapp");
  expect(body.get("contactValue")).toBe("04121234567");
});

it("un contacto inválido se muestra en su campo y no como archivo rechazado", async () => {
  responder({
    estado: "rechazado",
    motivo: "contacto-invalido",
    campo: "contactValue",
    mensaje: "Revisa el número.",
  });
  await pulsar("Revisar el archivo");

  const campo = container.querySelector("#contactValue") as HTMLInputElement;
  expect(campo.getAttribute("aria-invalid")).toBe("true");
  expect(campo.getAttribute("aria-describedby")).toContain("import-contact-error");
  expect(container.querySelector("#import-contact-error")?.textContent).toBe("Revisa el número.");
  expect(container.querySelector('[role="alert"]')).toBeNull();
});

// #290: el resultado sale debajo del formulario; sin mover el foco nadie lo ve.
it.each([
  [
    { estado: "vista-previa", totalFilas: 1, listas: 1, filas: [], errores: [] },
    "Revisa antes de crear",
  ],
  [{ estado: "rechazado", motivo: "codificacion", mensaje: "x" }, "No pudimos usar ese archivo"],
])("lleva el foco al resultado de revisar (%#)", async (body, titulo) => {
  responder(body);
  await pulsar("Revisar el archivo");

  expect(document.activeElement?.textContent).toBe(titulo);
});

it("lleva el foco al campo de contacto cuando el error es suyo", async () => {
  responder({
    estado: "rechazado",
    motivo: "contacto-invalido",
    campo: "contactValue",
    mensaje: "m",
  });
  await pulsar("Revisar el archivo");

  expect(document.activeElement?.id).toBe("contactValue");
});
