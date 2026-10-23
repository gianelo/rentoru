import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { areaForMunicipality } from "./territorio-areas";
import { readTerritoryDocuments, readTerritoryToponyms } from "./territorio-files";
import { buildTerritoryRows } from "./territorio-import";
import { parseToponymIndex } from "./toponym-index";
import { buildAliasRows } from "./toponym-resolve";

/**
 * Formas verbatim del corpus. El índice es una tabla de markdown que otro
 * agente agregó a cada archivo después de la taxonomía, y resuelve algo que
 * el árbol solo no puede: **los topónimos enterrados dentro de un nombre
 * compuesto**. En alcance hay 32 "Oficina Postal Telegráfica X", 90 "X del
 * Sector Y", 8 "Casco Central de X", 33 "Centro X" y 16 "Zona Industrial X" —
 * 179 nombres que alguien va a escribir y que hoy no encuentran nada.
 */
const DOC = `## Municipio Maracaibo

### Parroquia Olegario Villalobos

#### Sectores (1)

- Sector La Lago I  \`[CP 4002 — IPOSTEL]\`

# Índice de topónimos

Índice alfabético de **cómo se busca** cada zona.

**Este índice no crea zonas.**

| Topónimo | Dónde aparece |
|---|---|
| **05 de Julio** | **Coquivacoa** → *Sector 05 de Julio*<br>**Olegario Villalobos** → *Sector 05 de Julio* |
| **La Lago I** | **Olegario Villalobos** → *Sector La Lago I* |
| **Bella Vista** | **Coquivacoa** → *Oficina Postal Telegráfica Bella Vista* |

# Fuentes

- INE, División Político Territorial.
`;

describe("parseToponymIndex", () => {
  it("expande entradas secundarias con · sin perder la parroquia de cada <br>", () => {
    expect(
      parseToponymIndex(`# Índice de topónimos
| **San Miguel** | **Francisco Eugenio Bustamante** → *Barrio San Miguel* · *Urbanización San Miguel*<br>**Otra** → *Sector San Miguel* · *Centro San Miguel* |
`),
    ).toEqual([
      { toponym: "San Miguel", parish: "Francisco Eugenio Bustamante", entry: "Barrio San Miguel" },
      {
        toponym: "San Miguel",
        parish: "Francisco Eugenio Bustamante",
        entry: "Urbanización San Miguel",
      },
      { toponym: "San Miguel", parish: "Otra", entry: "Sector San Miguel" },
      { toponym: "San Miguel", parish: "Otra", entry: "Centro San Miguel" },
    ]);
  });
  it("lee cada topónimo con la parroquia y la entrada donde vive", () => {
    const index = parseToponymIndex(DOC);

    expect(index).toContainEqual({
      toponym: "La Lago I",
      parish: "Olegario Villalobos",
      entry: "Sector La Lago I",
    });
  });

  /**
   * **El caso que hace falta la tabla.** Un topónimo puede vivir en varias
   * parroquias con la misma entrada, y cada aparición es su propia fila: la
   * sugerencia tiene que poder decir "05 de Julio · Coquivacoa" y "05 de Julio
   * · Olegario Villalobos" por separado, o el visitante aplica el filtro de la
   * parroquia equivocada y se lleva cero resultados sin entender por qué.
   */
  it("separa las apariciones que la fuente junta con <br>", () => {
    const index = parseToponymIndex(DOC).filter((e) => e.toponym === "05 de Julio");

    expect(index).toHaveLength(2);
    expect(index.map((e) => e.parish)).toEqual(["Coquivacoa", "Olegario Villalobos"]);
  });

  /**
   * **Lo que el índice compra, en una línea.** "Bella Vista" está enterrado
   * dentro de "Oficina Postal Telegráfica Bella Vista": el árbol guarda el
   * nombre completo, y nadie escribe eso en una caja de búsqueda.
   */
  it("conserva el topónimo enterrado, no el nombre compuesto", () => {
    const [entry] = parseToponymIndex(DOC).filter((e) => e.toponym === "Bella Vista");

    expect(entry?.toponym).toBe("Bella Vista");
    expect(entry?.entry).toBe("Oficina Postal Telegráfica Bella Vista");
  });

  it("ignora el encabezado de la tabla, la prosa y la sección de fuentes", () => {
    const index = parseToponymIndex(DOC);

    expect(index.map((e) => e.toponym)).not.toContain("Topónimo");
    expect(index.map((e) => e.toponym)).not.toContain("Este índice no crea zonas.");
    expect(index).toHaveLength(4);
  });

  it("devuelve vacío cuando el archivo no tiene índice", () => {
    expect(parseToponymIndex("## Municipio X\n\n### Parroquia Y\n")).toEqual([]);
  });

  /**
   * La tabla vive DESPUÉS de la taxonomía y sus filas empiezan con `|`, así que
   * ni el parser del árbol la toca ni éste toca al árbol. Se afirma para que
   * quede claro que la separación es deliberada y no una casualidad del formato.
   */
  it("no confunde una viñeta de la taxonomía con una fila del índice", () => {
    const index = parseToponymIndex(DOC);

    expect(index.map((e) => e.toponym)).not.toContain("Sector La Lago I");
  });
});

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((file) => {
    const path = join(directory, file.name);
    return file.isDirectory()
      ? sourceFiles(path)
      : file.name.endsWith(".md") && file.name !== "README.md"
        ? [path]
        : [];
  });
}

describe("índice real de las cinco áreas (36.6)", () => {
  it("conserva todos los alias anteriores y agrega los 656 secundarios sin cambiar zonas", () => {
    const documents = readTerritoryDocuments();
    const rows = buildTerritoryRows(documents);
    const result = buildAliasRows(documents, readTerritoryToponyms(), areaForMunicipality);
    // Baseline de la gramática anterior: sólo la primera entrada de cada <br>.
    const previous = sourceFiles("docs/territorio").flatMap((file) =>
      parseToponymIndex(readFileSync(file, "utf8").replace(/ · \*[^*]+\*/gu, "")),
    );
    const oldAliases = buildAliasRows(documents, previous, areaForMunicipality).aliases;
    expect(oldAliases).toHaveLength(3547);
    expect(result.unresolved).toEqual([]);
    expect(result.aliases).toHaveLength(4203);
    const keys = new Set(result.aliases.map(({ zoneId, alias }) => `${zoneId}|${alias}`));
    for (const { zoneId, alias } of oldAliases) expect(keys.has(`${zoneId}|${alias}`)).toBe(true);
    expect(rows.unmappedMunicipalities).toEqual([]);
    expect(rows.zones).toHaveLength(5796);
    expect(new Set(rows.zones.map((zone) => zone.id)).size).toBe(5796);
    expect(
      ["municipio", "parroquia", "elemento"].map(
        (kind) => rows.zones.filter((zone) => zone.kind === kind).length,
      ),
    ).toEqual([10, 81, 5705]);
    const cityByZone = new Map(rows.zones.map((zone) => [zone.id, zone.cityId]));
    expect(
      Object.fromEntries(
        rows.areas.map((area) => [
          area.name,
          result.aliases.filter((row) => cityByZone.get(row.zoneId) === area.id).length,
        ]),
      ),
    ).toEqual({
      Caracas: 2141,
      "La Guaira": 430,
      Maracaibo: 1382,
      Cabimas: 116,
      "Santa Rita": 134,
    });
    expect(result.aliases).toContainEqual({
      zoneId: "dbcbaa62-9b6b-54ad-4fd8-8c13d27811f1",
      alias: "San Miguel",
    });
    expect(result.aliases).toContainEqual({
      zoneId: "39a50c8d-c245-90e9-7f6e-cbda846ee04e",
      alias: "San Rafael",
    });
  });
});
