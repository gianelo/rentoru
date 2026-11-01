"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AppLink } from "../../components/atoms/AppLink";
import buttons from "../../components/atoms/Button.module.css";
import { ActionButton } from "../../components/atoms/buttons";
import { LoadingOverlay } from "../../components/molecules/LoadingOverlay";
import {
  MAX_IMPORT_FILE_SIZE_BYTES,
  MAX_IMPORT_ROW_COUNT,
} from "../../src/modules/broker-bulk-import/domain/csv-import-bounds";
import { REQUIRED_IMPORT_COLUMNS } from "../../src/modules/broker-bulk-import/domain/csv-import-columns";
import type { AccountDefaultContact } from "../../src/modules/broker-bulk-import/domain/import-account-contact";
import { FieldError } from "../publicar/FieldError";
import publicar from "../publicar/publish-steps.module.css";
import styles from "./importar.module.css";
import type { ResultadoImportacion, VistaPreviaResultado } from "./preview";
import { VistaPrevia } from "./VistaPrevia";

/**
 * Láminas 14e (antes de elegir archivo), 14f (los rechazos) y 14h (después de
 * importar), más 14g a través de `VistaPrevia`.
 *
 * ## Por qué esta pantalla puede usar JavaScript, y hasta dónde
 *
 * AGENTS.md §2 exime a **la vista previa del archivo** del piso "funciona sin
 * JavaScript", con el motivo escrito: el trabajo pasa en el dispositivo. La
 * exención es angosta y este componente la respeta en tres puntos:
 *
 * 1. **La autorización no depende del script.** `page.tsx` corre
 *    `authorizeBulkImport` en el servidor y `/api/bulk-import` la corre otra
 *    vez por su cuenta. Esta pieza no mira ninguna bandera: si se dibuja, es
 *    porque el servidor ya decidió (AGENTS.md §1 — "renderizan decisiones que
 *    llegan ya tomadas").
 * 2. **La plantilla —el paso 1— es un `<a href>` real** a
 *    `/importar/plantilla`. Sigue funcionando con el script apagado.
 * 3. **Sin script la puerta queda cerrada, y dice por qué.** El botón de
 *    revisar exige un archivo EN MEMORIA, y meterlo ahí es lo único que sólo
 *    el script puede hacer: sin él nunca se habilita — no por una comprobación
 *    extra, sino porque su condición no se puede cumplir. El `<noscript>`
 *    explica el cierre en vez de dejar la pantalla muda (AGENTS.md §7).
 *
 * ## Por qué el archivo se sube dos veces
 *
 * Porque previsualizar no escribe NADA (spec: "previsualizar sin confirmar no
 * crea nada"), así que del lado del servidor no queda ningún lote a medio
 * hacer que "confirmar" pueda retomar. El archivo se queda acá y se vuelve a
 * mandar al confirmar; `runImportValidation` es la misma función en los dos
 * caminos, que es lo que hace verdadero por construcción que confirmar cree
 * exactamente las filas que la vista previa dio por válidas.
 */

const MAX_MB = Math.round(MAX_IMPORT_FILE_SIZE_BYTES / (1024 * 1024));

const FORMAS_DE_CONTACTO = [
  ["whatsapp", "WhatsApp"],
  ["telefono", "Llamada"],
  ["email", "Correo"],
] as const;

interface Contacto {
  readonly contactMethod: string;
  readonly contactValue: string;
}

async function enviar(
  archivo: File,
  accion: "revisar" | "crear",
  contacto: Contacto,
): Promise<ResultadoImportacion> {
  const cuerpo = new FormData();
  cuerpo.set("archivo", archivo);
  cuerpo.set("accion", accion);
  cuerpo.set("contactMethod", contacto.contactMethod);
  cuerpo.set("contactValue", contacto.contactValue);

  const respuesta = await fetch("/api/bulk-import", { method: "POST", body: cuerpo });
  if (respuesta.status >= 500) {
    // tasks.md 45.6: un 500 llega con un cuerpo que no es JSON y antes caía
    // en el mismo mensaje que la red, culpando a la conexión de quien importa.
    // La creación es transaccional (L4), así que «no se creó nada» es verdad.
    return {
      estado: "rechazado",
      motivo: "servidor",
      mensaje:
        "El servidor falló al procesar el archivo. No se creó ningún aviso. Prueba de nuevo en un momento.",
    };
  }
  const datos = (await respuesta.json()) as ResultadoImportacion & { error?: string };

  if (datos.error) {
    // 401/403 no deberían pasar acá — el servidor ya cerró la puerta antes de
    // dibujar la pantalla. Si pasan, la sesión venció mientras se llenaba el
    // formulario: se dice, no se ignora.
    return {
      estado: "rechazado",
      motivo: datos.error,
      mensaje:
        "Tu sesión ya no permite importar. Vuelve a entrar y prueba de nuevo desde «Mis avisos».",
    };
  }
  return datos;
}

/** `contact` es el predeterminado que la cuenta ya guardó (tasks.md 45.2), o `null`. */
export function ImportarCartera({ contact }: { contact: AccountDefaultContact | null }) {
  const campoId = useId();
  const [contacto, setContacto] = useState<Contacto>({
    contactMethod: contact?.contactMethod ?? "",
    contactValue: contact?.contactValue ?? "",
  });
  const entrada = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  // tasks.md 45.6-B: qué está en vuelo, no sólo si algo lo está: el estado de
  // carga dice «Revisando…» o «Creando…» según cuál sea.
  const [enCurso, setEnCurso] = useState<"revisar" | "crear" | null>(null);
  const enviando = enCurso !== null;

  async function correr(accion: "revisar" | "crear") {
    if (!archivo) return;
    setEnCurso(accion);
    try {
      setResultado(await enviar(archivo, accion, contacto));
    } catch {
      setResultado({
        estado: "rechazado",
        motivo: "red",
        mensaje: "No pudimos subir el archivo. Revisa la conexión y prueba de nuevo.",
      });
    } finally {
      setEnCurso(null);
    }
  }

  function volverAEmpezar() {
    setResultado(null);
    setArchivo(null);
    if (entrada.current) entrada.current.value = "";
  }

  const previa = resultado?.estado === "vista-previa" ? (resultado as VistaPreviaResultado) : null;
  const creado = resultado?.estado === "creado" ? resultado : null;
  const resultadoRef = useRef<HTMLDivElement>(null);
  const errorDeContacto =
    resultado?.estado === "rechazado" && resultado.motivo === "contacto-invalido"
      ? resultado
      : null;
  const errorEn = (campo: keyof Contacto) =>
    errorDeContacto?.campo === campo ? errorDeContacto.mensaje : undefined;

  useEffect(() => {
    if (!resultado) return;
    if (errorDeContacto) {
      const campo =
        errorDeContacto.campo === "contactValue"
          ? document.getElementById("contactValue")
          : document.querySelector<HTMLInputElement>('input[name="contactMethod"]');
      campo?.focus();
      return;
    }
    const titulo = resultadoRef.current?.querySelector("h2");
    if (!titulo) return;
    titulo.tabIndex = -1;
    titulo.focus();
  }, [resultado, errorDeContacto]);

  // tasks.md 45.6-B (S5): lo que acaba de pasar no es un pie de página. La
  // pantalla de éxito reemplaza al formulario, derivada de «Publicar · Listo»
  // (SISTEMA.md): la ✓ del sistema, una sola primaria y volver como texto.
  if (creado) {
    const una = creado.creadas === 1;
    return (
      <div ref={resultadoRef} className={styles.flujo}>
        <section className={styles.exito} aria-labelledby="importar-exito">
          <span className={styles.exitoMarca} aria-hidden="true">
            ✓
          </span>
          {/* 14h: "no dice «listo»: dice «ninguna se ve todavía»". */}
          <h2 id="importar-exito" className={styles.exitoTitulo}>
            {una
              ? "Se creó 1 propiedad. Todavía no se ve."
              : `Se crearon ${creado.creadas} propiedades. Ninguna se ve todavía.`}
          </h2>
          <p className={styles.explicacion}>
            {una
              ? "Le falta lo único que no venía en el archivo: al menos una foto. Hasta entonces queda como borrador y no aparece en las búsquedas."
              : "Les falta lo único que no venía en el archivo: al menos una foto cada una. Hasta entonces quedan como borradores y no aparecen en las búsquedas."}
          </p>
          {creado.yaEstaban.length > 0 ? (
            <p className={styles.explicacion}>
              {creado.yaEstaban.length} ya las habías importado antes y no se duplicaron:{" "}
              {creado.yaEstaban.map((fila) => fila.referencia).join(", ")}.
            </p>
          ) : null}
          <nav className={styles.exitoAcciones} aria-label="Qué puedes hacer ahora">
            <AppLink className={`${buttons.base} ${buttons.action}`} href="/mis-avisos">
              Ir a Mis avisos
            </AppLink>
            <button type="button" className={styles.exitoVolver} onClick={volverAEmpezar}>
              Importar otro archivo
            </button>
          </nav>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.flujo}>
      {/* tasks.md 45.6-B (S5): el indicador global del sistema (F36.3), no uno
          propio. La salida es un enlace real a esta misma pantalla: recargar
          abandona la espera del lado del cliente; una creación ya enviada
          termina sola en el servidor, en una transacción. */}
      {enCurso ? (
        <LoadingOverlay
          label={enCurso === "revisar" ? "Revisando el archivo…" : "Creando los avisos…"}
          href="/importar"
          exitLabel="Dejar de esperar"
        />
      ) : null}
      <section className={styles.paso}>
        <p className={styles.pasoNumero}>Paso 1</p>
        <h2 className={styles.tituloSeccion}>Descarga la plantilla</h2>
        <p className={styles.explicacion}>
          Trae las {REQUIRED_IMPORT_COLUMNS.length} columnas obligatorias con los nombres exactos y
          una fila de ejemplo. Pega tus datos debajo y guarda como CSV.
        </p>
        {/* Un enlace, no un botón: es lo único de esta pantalla que tiene que
            seguir funcionando con el script apagado. */}
        <AppLink className={styles.bajarPlantilla} href="/importar/plantilla">
          Descargar plantilla CSV
        </AppLink>
      </section>

      <section className={styles.paso}>
        <p className={styles.pasoNumero}>Paso 2</p>
        <h2 className={styles.tituloSeccion}>Sube tu archivo</h2>

        <fieldset
          className={publicar.choices}
          aria-invalid={errorEn("contactMethod") ? true : undefined}
          aria-describedby={errorEn("contactMethod") ? "import-contact-method-error" : undefined}
        >
          <legend className={publicar.legend}>¿Cómo te contactan?</legend>
          <FieldError id="import-contact-method-error" message={errorEn("contactMethod")} />
          {FORMAS_DE_CONTACTO.map(([value, label]) => (
            <label key={value} className={publicar.choice}>
              <input
                className={publicar.choiceInput}
                type="radio"
                name="contactMethod"
                value={value}
                checked={contacto.contactMethod === value}
                onChange={() => setContacto({ ...contacto, contactMethod: value })}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>

        <div>
          <label className={publicar.label} htmlFor="contactValue">
            Tu dato de contacto
          </label>
          <input
            id="contactValue"
            name="contactValue"
            type="text"
            className={`${publicar.control} ${errorEn("contactValue") ? publicar.controlInvalid : ""}`}
            value={contacto.contactValue}
            onChange={(evento) =>
              setContacto({ ...contacto, contactValue: evento.currentTarget.value })
            }
            aria-invalid={errorEn("contactValue") ? true : undefined}
            aria-describedby={
              errorEn("contactValue")
                ? "import-contact-error import-contact-help"
                : "import-contact-help"
            }
          />
          <FieldError id="import-contact-error" message={errorEn("contactValue")} />
          <p className={publicar.help} id="import-contact-help">
            Lo llevan todos los avisos del archivo y queda guardado en tu cuenta para la próxima
            vez.
          </p>
        </div>

        <label className={styles.etiquetaArchivo} htmlFor={campoId}>
          Elegir archivo
        </label>
        <input
          id={campoId}
          ref={entrada}
          className={styles.campoArchivo}
          type="file"
          accept=".csv,text/csv"
          onChange={(evento) => {
            setResultado(null);
            setArchivo(evento.currentTarget.files?.[0] ?? null);
          }}
        />

        <ul className={styles.limites}>
          <li>
            Máximo <strong>{MAX_IMPORT_ROW_COUNT} filas</strong> por archivo
          </li>
          <li>
            Máximo <strong>{MAX_MB} MB</strong>
          </li>
          <li>
            CSV codificado en <strong>UTF-8</strong>
          </li>
        </ul>

        <ActionButton disabled={archivo === null || enviando} onClick={() => correr("revisar")}>
          Revisar el archivo
        </ActionButton>

        <noscript>
          <p className={styles.sinScript}>
            Esta pantalla necesita JavaScript para leer el archivo en tu computadora antes de
            subirlo. Actívalo y recarga; la plantilla de arriba se descarga igual sin él.
          </p>
        </noscript>

        <p className={styles.aviso}>
          Las fotos no van en el CSV. Los avisos entran como borradores y cada uno necesita al menos
          una foto para activarse.
        </p>

        <h3 className={styles.tituloColumnas}>Columnas obligatorias</h3>
        <ul className={styles.columnas}>
          {REQUIRED_IMPORT_COLUMNS.map((columna) => (
            <li key={columna}>
              <code>{columna}</code>
            </li>
          ))}
        </ul>
      </section>

      {/* #290: el resultado sale debajo del formulario. El foco va a su título
          (o al campo de contacto, si el error es suyo) para que se vea y se
          anuncie sin tener que bajar a buscarlo. */}
      <div ref={resultadoRef} className={styles.resultado}>
        {previa ? (
          <VistaPrevia
            preview={previa}
            archivo={archivo?.name ?? ""}
            enviando={enviando}
            onCrear={() => correr("crear")}
            onCorregir={volverAEmpezar}
          />
        ) : null}

        {resultado?.estado === "rechazado" && !errorDeContacto ? (
          <section className={styles.rechazo} role="alert">
            <h2 className={styles.tituloSeccion}>No pudimos usar ese archivo</h2>
            {/* El mensaje del dominio, entero: es el que dice QUÉ HACER —"volvé
              a exportar como CSV UTF-8", "partilo en dos"— y la lámina 14f
              pide exactamente eso, no una explicación de qué pasó. */}
            <p className={styles.explicacion}>{resultado.mensaje}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
