import type { Metadata } from "next";
import { AppLink } from "@/../components/atoms/AppLink";
import { DraftNotice } from "../draft-notice";
import styles from "../legal.module.css";

/**
 * "Normas de publicación" v2 (tasks.md 23.5) — borrador para ratificación
 * del fundador, con la estructura de las normas de Airbnb (no su texto).
 * Política de producto más que texto legal: cada número es el mismo que el
 * formulario aplica hoy (`publishable-listing.ts`, `uploaded-photo.ts`), el
 * umbral es el de `report-threshold.ts` y los motivos de reporte son los de
 * `listing-trust/domain/report-reason.ts`.
 */
export const metadata: Metadata = {
  title: "Normas de publicación — Rentoru",
  description: "Qué se puede publicar en rentoru.com, tal como lo aplica el formulario hoy.",
  // 26.12 — relativa: `metadataBase` le pone la base una sola vez.
  alternates: { canonical: "/legal/normas" },
};

const contacto = <AppLink href="mailto:hola@rentoru.com">hola@rentoru.com</AppLink>;

export default function NormasPage() {
  return (
    <article>
      <p className={styles.category}>Legal / Normas de publicación</p>
      <h1 className={styles.title}>Normas de publicación</h1>
      <DraftNotice />

      <p className={styles.text}>
        Estas normas dicen qué se puede publicar en rentoru.com y cómo debe comportarse quien
        publica. Forman parte de los{" "}
        <AppLink href="/legal/terminos">Términos y condiciones</AppLink>. Varias se aplican
        automáticamente al publicar: el formulario no deja activar un aviso que no las cumpla.
      </p>

      <h2 className={styles.heading}>1. Qué se puede publicar</h2>
      <p className={styles.text}>
        Solo inmuebles <strong>residenciales</strong> en alquiler de <strong>larga estadía</strong>{" "}
        en Distrito Capital y Maracaibo: apartamento, casa, quinta, anexo o habitación. No se acepta
        local comercial, oficina, alquiler vacacional o por días, venta ni ningún otro uso.
      </p>

      <h2 className={styles.heading}>2. Quién puede publicar</h2>
      <p className={styles.text}>
        El dueño del inmueble o una inmobiliaria con autorización para ofrecerlo. Lo declaras al
        crear el aviso.
      </p>

      <h2 className={styles.heading}>3. Un aviso exacto</h2>
      <p className={styles.text}>El aviso tiene que describir el inmueble tal como es:</p>
      <ul className={styles.list}>
        <li className={styles.item}>
          <strong>Ubicación real:</strong> la ciudad y la zona donde está, elegidas de la lista.
        </li>
        <li className={styles.item}>
          <strong>Tipo, medidas y distribución reales:</strong> habitaciones, baños, metros
          cuadrados y puestos de estacionamiento.
        </li>
        <li className={styles.item}>
          <strong>Precio real</strong> en dólares, en número entero, sin costos ocultos que la
          descripción no mencione.
        </li>
        <li className={styles.item}>
          <strong>Un inmueble por aviso</strong>, sin publicar el mismo inmueble varias veces.
        </li>
      </ul>

      <h2 className={styles.heading}>4. Datos obligatorios</h2>
      <ul className={styles.list}>
        <li className={styles.item}>Un título de hasta 90 caracteres.</li>
        <li className={styles.item}>Una descripción de entre 120 y 1.200 caracteres.</li>
        <li className={styles.item}>Un precio en dólares, en número entero, sin decimales.</li>
        <li className={styles.item}>Una ciudad y una zona, elegidas de una lista cerrada.</li>
        <li className={styles.item}>
          Habitaciones, metros cuadrados y baños, en números enteros positivos; puestos de
          estacionamiento, que puede ser cero.
        </li>
        <li className={styles.item}>Un método de contacto válido: WhatsApp, teléfono o correo.</li>
      </ul>

      <h2 className={styles.heading}>5. Fotos</h2>
      <ul className={styles.list}>
        <li className={styles.item}>
          Entre 1 y 6 fotos por aviso; sin al menos una no se puede activar.
        </li>
        <li className={styles.item}>
          Solo JPEG, PNG o WebP de hasta 10 MB cada una. El sistema rechaza cualquier archivo que no
          sea realmente una imagen de ese tipo.
        </li>
        <li className={styles.item}>
          Deben ser del inmueble que se alquila. Una foto que ya aparece en el aviso de otro dueño
          se rechaza.
        </li>
        <li className={styles.item}>
          No se permite editar fotos, con inteligencia artificial o de otra forma, para ocultar
          defectos o mostrar comodidades que el inmueble no tiene.
        </li>
        <li className={styles.item}>
          No deben mostrar personas identificables, documentos ni datos personales.
        </li>
      </ul>

      <h2 className={styles.heading}>6. Contacto y trato con interesados</h2>
      <ul className={styles.list}>
        <li className={styles.item}>
          El contacto tiene que ser tuyo o de tu inmobiliaria, y tienes que poder atenderlo.
        </li>
        <li className={styles.item}>Responde con respeto y sin discriminar a nadie.</li>
        <li className={styles.item}>
          <strong>Nunca</strong> pidas dinero, depósitos ni documentos antes de mostrar el inmueble.
        </li>
      </ul>

      <h2 className={styles.heading}>7. Mantener el aviso al día</h2>
      <p className={styles.text}>
        Un aviso dura 30 días y se puede renovar desde el correo que te enviamos antes de que venza.
        Si el inmueble ya se alquiló, no lo renueves; si necesitas retirarlo antes, escríbenos a{" "}
        {contacto}.
      </p>

      <h2 className={styles.heading}>8. Lo que no se permite</h2>
      <ul className={styles.list}>
        <li className={styles.item}>
          Avisos falsos, de inmuebles que no existen o que no estás autorizado a ofrecer.
        </li>
        <li className={styles.item}>Estafas, cobros por adelantado o suplantación de identidad.</li>
        <li className={styles.item}>Contenido ofensivo, discriminatorio o ilegal.</li>
        <li className={styles.item}>Usar el aviso para promocionar otros sitios o servicios.</li>
      </ul>

      <h2 className={styles.heading}>9. Una sola regla para todos</h2>
      <p className={styles.text}>
        Estas normas se aplican igual sin importar cómo se publique el aviso: la carga masiva de las
        inmobiliarias pasa por la misma validación que el formulario.
      </p>

      <h2 className={styles.heading}>10. Cómo se aplican</h2>
      <ul className={styles.list}>
        <li className={styles.item}>
          Cualquier cuenta puede reportar un aviso con uno de estos motivos: posible estafa, datos
          incorrectos, duplicado, no disponible u otro.
        </li>
        <li className={styles.item}>
          Cuando tres cuentas distintas reportan el mismo aviso, se oculta automáticamente mientras
          se revisa.
        </li>
        <li className={styles.item}>
          Según la gravedad, podemos restaurarlo, pedirte que lo corrijas, eliminarlo o suspender la
          cuenta. Ante una estafa o un fraude evidente, actuamos sin aviso previo.
        </li>
      </ul>

      <h2 className={styles.heading}>11. Si no estás de acuerdo con una medida</h2>
      <p className={styles.text}>
        Escríbenos a {contacto} desde el correo de tu cuenta, explica el caso y aporta lo que lo
        respalde. Revisaremos la decisión.
      </p>

      <h2 className={styles.heading}>12. Cómo reportar</h2>
      <p className={styles.text}>
        Abre el aviso y usa «Reportar este aviso». Si sospechas una estafa, no entregues dinero y
        repórtalo.
      </p>
    </article>
  );
}
