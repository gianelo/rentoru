import { and, asc, eq, gt, ilike, inArray, or, type SQL, sql } from "drizzle-orm";
import { alias, type PgColumn } from "drizzle-orm/pg-core";
import { cities, listings, zoneAliases, zones } from "../../../shared/db/schema";
import type { SearchVocabularyPort } from "../application/ports/search-vocabulary.port";
import type { SuggestionVocabulary } from "../domain/suggest-filters";
import type { CatalogueDatabase } from "./drizzle-catalogue";

/**
 * `SearchVocabularyPort` contra Postgres.
 *
 * El reparto de trabajo con el dominio es la decisión de este archivo: **SQL
 * estrecha, el dominio decide.** `ILIKE` sobre el nombre y sobre el alias
 * reduce miles de filas a decenas; cuál de esas decenas se ofrece, en qué orden
 * y a qué dirección lleva lo resuelve `resolveSearchDestination`, que es puro y
 * está cubierto. Poner el criterio en el `WHERE` lo sacaría del alcance del
 * suelo de cobertura y lo volvería imposible de probar sin una base.
 *
 * **El conteo por zona, agregado (17.5/17.7).** Con 5.796 zonas, ofrecer una
 * que no tiene ni un aviso manda a una pantalla sin salida (regla transversal
 * 4), y ordenar por catálogo en vez de por oferta real esconde las zonas donde
 * de verdad se alquila detrás de las que nadie usa. El predicado es el MISMO
 * que `DrizzleActiveZones` ya usa para el vocabulario acotado del inicio —
 * `status = 'active'` y `expires_at > now()` — porque el destino de una
 * sugerencia es una búsqueda, y dos predicados distintos serían dos respuestas
 * distintas para la misma pregunta (regla transversal 3). El dominio
 * (`searchChoices`) es quien decide qué hacer con el número: excluir el cero y
 * ordenar por el resto — acá sólo se cuenta.
 *
 * El handle se inyecta, igual que en los otros adaptadores: el despliegue pasa
 * un cliente Neon y la prueba de integración uno de `node-postgres` apuntado a
 * un contenedor real, y **los dos corren este mismo código**.
 *
 * **El corte de `LOOKUP_LIMIT` es por relevancia, no por abecedario
 * (17.17).** Ver `relevanceRank` para el porqué y el costo medido.
 */

/** Ancho suficiente para que el dominio tenga de dónde elegir sus ocho. */
const LOOKUP_LIMIT = 60;

/**
 * `%` y `_` son comodines de `LIKE`. Sin escaparlos, escribir «100%» en la caja
 * convierte la consulta en «traeme todo».
 */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/**
 * Cada palabra por separado, unidas con OR.
 *
 * Un solo `ILIKE '%apartamento en altamira%'` no encuentra Altamira, porque la
 * columna guarda «Altamira» y no la frase. Partir en palabras es lo que deja
 * que la frase entera siga funcionando; el filtro fino lo hace el dominio.
 *
 * **Dos letras es el piso acá y tres en el dominio, y esa asimetría es a
 * propósito**: el SQL puede traer de más sin costo visible sobre un índice, y
 * el dominio es quien decide qué se ofrece. Un piso más alto en el `WHERE`
 * escondería filas que la regla nunca llegaría a ver.
 */
function wordsOf(text: string): string[] {
  return text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2)
    .slice(0, 6);
}

/**
 * **17.17 — un puesto por fila, no un orden alfabético.**
 *
 * `LOOKUP_LIMIT` recorta a 60; antes de esta tarea el `ORDER BY` era
 * `name ASC`, así que ese recorte era literalmente alfabético. Con 5.796
 * zonas y una palabra tan común como «en» adentro de 1.052 de ellas
 * («23 de Enero», «Alimentador San Bernardino»…), la fila que la frase
 * realmente nombraba podía perder el corte sin ningún aviso — no por no
 * coincidir, sino por llamarse algo que ordena después de las sesenta
 * primeras zonas reales que también coinciden. `tests/integration/
 * catalogue-search.test.ts` lo prueba con una zona a propósito lejos del
 * principio del alfabeto.
 *
 * **Tres niveles, el mejor gana.** Por cada palabra de la búsqueda:
 *
 * - **0 — coincide entera.** La columna ES esa palabra (sin comodines):
 *   la reconstrucción más específica posible con lo que se escribió.
 * - **1 — empieza por ella, sola o después de un espacio.** «Enero» para
 *   la palabra «en», o el propio alias de esta prueba para la palabra que
 *   lo nombra completo — sigue siendo una coincidencia de PALABRA, no de
 *   substring perdido en el medio de otra.
 * - **2 — el resto.** Coincide en algún punto, como toda fila que ya
 *   pasaba el `WHERE`, pero es la última en desempatar.
 *
 * Una fila puede ganar por CUALQUIERA de sus palabras — de ahí `least()`:
 * si una palabra la encuentra por el nivel 0, no importa que las otras
 * cinco no digan nada de ella.
 *
 * **El empate se resuelve por largo, no por abecedario.** Entre dos filas
 * del mismo nivel, la más corta es la coincidencia más específica — un
 * nombre de 8 caracteres que empieza por «en» es más «esa palabra» que uno
 * de 40. El nombre entra al final, sólo para que el resultado sea
 * determinista y nunca dependa del orden en que Postgres barrió la tabla.
 *
 * **Costo: ninguno nuevo.** El `WHERE` ya usa `ILIKE '%palabra%'` — el
 * comodín inicial le impide a Postgres usar el índice de `zone_alias` para
 * FILTRAR, así que ya barría la tabla entera antes de esta tarea. Lo único
 * que cambia es la expresión que ordena esas mismas filas ya filtradas
 * (como mucho unos miles, nunca las 5.796/3.547 completas) antes de
 * cortar en `LOOKUP_LIMIT`: el `ORDER BY name ASC` de antes tampoco corría
 * sobre un índice, porque ordenar un resultado ya filtrado por un barrido
 * exige su propio paso de orden sin importar la expresión. No hay un
 * segundo barrido ni una tabla nueva que recorrer — sólo unas
 * comparaciones `ILIKE` de más por fila ya en memoria.
 */
function relevanceRank(column: PgColumn, words: readonly string[]): SQL<number> {
  const perWord = words.map((word) => {
    const escaped = escapeLike(word);
    return sql`(case
      when ${column} ilike ${escaped} then 0
      when ${column} ilike ${`${escaped}%`} or ${column} ilike ${`% ${escaped}%`} then 1
      else 2
    end)`;
  });

  return sql<number>`least(${sql.join(perWord, sql`, `)})`;
}

export class DrizzleSearchVocabulary implements SearchVocabularyPort {
  constructor(private readonly db: CatalogueDatabase) {}

  async lookup(text: string): Promise<SuggestionVocabulary> {
    const words = wordsOf(text);

    // Las dos ciudades del producto van SIEMPRE, aunque nada coincida: son dos
    // filas, y son lo que el dominio ofrece cuando alguien escribió filtros sin
    // nombrar un lugar («apartamento amoblado»). Sin ellas esa rama no existe.
    const cityRows = await this.db
      .select({ id: cities.id, name: cities.name })
      .from(cities)
      .orderBy(asc(cities.name));

    // Sin nada que buscar no se consulta la taxonomía. Devolverla entera sería
    // justo lo que este puerto existe para no hacer.
    if (words.length === 0) return { cities: cityRows, zones: [], aliases: [] };

    const parent = alias(zones, "parent");
    const like = words.map((word) => `%${escapeLike(word)}%`);

    const zoneRows = await this.db
      .select({
        id: zones.id,
        name: zones.name,
        cityId: zones.cityId,
        parentName: parent.name,
      })
      .from(zones)
      .leftJoin(parent, eq(zones.parentId, parent.id))
      .where(or(...like.map((pattern) => ilike(zones.name, pattern))))
      // 17.17: relevancia primero, largo como desempate y el nombre sólo al
      // final para que el resultado sea determinista — ver `relevanceRank`.
      .orderBy(
        asc(relevanceRank(zones.name, words)),
        asc(sql`length(${zones.name})`),
        asc(zones.name),
      )
      .limit(LOOKUP_LIMIT);

    const aliasRows = await this.db
      .select({ zoneId: zoneAliases.zoneId, alias: zoneAliases.alias })
      .from(zoneAliases)
      .where(or(...like.map((pattern) => ilike(zoneAliases.alias, pattern))))
      .orderBy(
        asc(relevanceRank(zoneAliases.alias, words)),
        asc(sql`length(${zoneAliases.alias})`),
        asc(zoneAliases.alias),
      )
      .limit(LOOKUP_LIMIT);

    // Las zonas que un alias trajo y el nombre no. Sin ellas, encontrar por
    // alias devolvería una sugerencia que el dominio descarta después por no
    // conocer su ciudad — que es exactamente el caso «Bella Vista», el motivo
    // por el que la tabla de alias existe.
    const known = new Set(zoneRows.map((zone) => zone.id));
    const missing = [...new Set(aliasRows.map((row) => row.zoneId))].filter(
      (zoneId) => !known.has(zoneId),
    );

    const extraRows =
      missing.length === 0
        ? []
        : await this.db
            .select({
              id: zones.id,
              name: zones.name,
              cityId: zones.cityId,
              parentName: parent.name,
            })
            .from(zones)
            .leftJoin(parent, eq(zones.parentId, parent.id))
            // `inArray` y no un `= ANY(...)` escrito a mano: la plantilla `sql`
            // desarma el arreglo en parámetros sueltos, así que Postgres recibe
            // un escalar donde espera un arreglo y contesta «malformed array
            // literal». Es el mismo error que ya reventó la pantalla del paso 2.
            .where(inArray(zones.id, missing))
            .limit(LOOKUP_LIMIT);

    const zoneIds = [...zoneRows, ...extraRows].map((zone) => zone.id);

    // Sin zonas que contar no hay consulta que hacer. `inArray` con un arreglo
    // vacío es el mismo tropiezo que la nota de `extraRows` ya documenta más
    // arriba para `missing`.
    const countRows =
      zoneIds.length === 0
        ? []
        : await this.db
            .select({
              zoneId: listings.zoneId,
              // `mapWith(Number)`: `count(*)` es `bigint` y el driver lo
              // devuelve como string. Sin esto una zona con "3" avisos de
              // texto nunca perdería un `>` contra otra con 9 de verdad — el
              // mismo tropiezo que `DrizzleActiveZones` ya documenta.
              count: sql<number>`count(*)`.mapWith(Number),
            })
            .from(listings)
            .where(
              and(
                inArray(listings.zoneId, zoneIds),
                eq(listings.status, "active"),
                gt(listings.expiresAt, sql`now()`),
              ),
            )
            .groupBy(listings.zoneId);

    const countByZone = new Map(countRows.map((row) => [row.zoneId, row.count]));
    // Cero explícito y no ausencia: una zona que la consulta de conteo no
    // menciona no tiene avisos vigentes, y el dominio necesita ESE cero para
    // excluirla (17.7) — dejarla sin campo sería "no sé", que es un dato
    // distinto de "no hay".
    const withCount = <Z extends { id: string }>(zone: Z): Z & { count: number } => ({
      ...zone,
      count: countByZone.get(zone.id) ?? 0,
    });

    return {
      cities: cityRows,
      zones: [...zoneRows, ...extraRows].map(withCount),
      aliases: aliasRows,
    };
  }
}
