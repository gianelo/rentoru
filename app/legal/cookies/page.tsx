import type { Metadata } from "next";
import { AppLink } from "@/../components/atoms/AppLink";
import { DraftNotice } from "../draft-notice";
import styles from "../legal.module.css";

/**
 * "Uso de cookies" v3 (tasks.md 23.5) — borrador para ratificación del
 * fundador, con la estructura de la política de Airbnb (no su texto).
 * Nombra las dos cookies que el repositorio escribe hoy — la de sesión de
 * Auth.js (nombre por defecto de `next-auth@5.0.0-beta.32`, sin `cookies`
 * propio en `auth.ts`) y `rentas_enlace` (`enlace.ts`, 15 min) — y afirma la
 * ausencia de cookies de publicidad o analítica porque una búsqueda en todo
 * el repositorio no encontró ninguna. La nota «CONFIRMAR» del borrador es
 * sólo para el PDF y nunca se sirve.
 */
export const metadata: Metadata = {
  title: "Uso de cookies — Rentoru",
  description: "Las únicas dos cookies que rentoru.com usa, y para qué sirve cada una.",
  // 26.12 — relativa: `metadataBase` le pone la base una sola vez.
  alternates: { canonical: "/legal/cookies" },
};

export default function CookiesPage() {
  return (
    <article>
      <p className={styles.category}>Legal / Uso de cookies</p>
      <h1 className={styles.title}>Uso de cookies</h1>
      <DraftNotice />

      <p className={styles.text}>
        Esta política complementa la{" "}
        <AppLink href="/legal/privacidad">Política de privacidad</AppLink> y explica qué tecnologías
        usa rentoru.com para guardar o leer información en tu dispositivo.
      </p>

      <h2 className={styles.heading}>1. Qué son las cookies</h2>
      <p className={styles.text}>
        Son pequeños archivos que un sitio guarda en tu navegador. Las <strong>de sesión</strong> se
        borran al cerrar el navegador o al vencer; las <strong>persistentes</strong> duran un tiempo
        fijo.
      </p>

      <h2 className={styles.heading}>2. Por qué las usamos</h2>
      <p className={styles.text}>
        Solo para que el sitio funcione: mantenerte dentro de tu cuenta y completar la entrada con
        el enlace por correo. Ninguna sirve para publicidad, analítica o seguimiento.
      </p>

      <h2 className={styles.heading}>3. Qué cookies usamos</h2>
      <ul className={styles.list}>
        <li className={styles.item}>
          <strong>
            <code>authjs.session-token</code>
          </strong>{" "}
          (o <code>__Secure-authjs.session-token</code> por HTTPS): Mantener tu sesión iniciada. Sin
          ella no puedes publicar ni ver el contacto de un aviso. Duración: hasta 30 días sin
          actividad, o hasta que salgas.
        </li>
        <li className={styles.item}>
          <strong>
            <code>rentas_enlace</code>:
          </strong>{" "}
          Comprobar en la pantalla de espera que el enlace de entrada que pediste es tuyo. Solo se
          escribe cuando pides el enlace por correo. Duración: 15 minutos.
        </li>
      </ul>
      <p className={styles.text}>
        Las dos son <em>httpOnly</em> (los scripts de la página no pueden leerlas) y son
        estrictamente necesarias, por lo que no requieren un consentimiento aparte.
      </p>

      <h2 className={styles.heading}>4. Lo que no usamos</h2>
      <ul className={styles.list}>
        <li className={styles.item}>Cookies de publicidad ni de rastreo de terceros.</li>
        <li className={styles.item}>Herramientas de analítica de comportamiento.</li>
        <li className={styles.item}>Píxeles o balizas en el sitio.</li>
        <li className={styles.item}>
          Botones de redes sociales que envíen tu actividad a terceros.
        </li>
      </ul>

      <h2 className={styles.heading}>5. Registros del servidor</h2>
      <p className={styles.text}>
        Al atender cada solicitud, nuestros proveedores de alojamiento registran datos técnicos como
        la dirección IP, el navegador y la página pedida. Sirven para operar el sitio y protegerlo,
        no para identificarte ni seguirte.
      </p>

      <h2 className={styles.heading}>6. Terceros</h2>
      <p className={styles.text}>
        Si entras con Google, la pantalla de inicio de sesión pertenece a Google y usa sus propias
        cookies, regidas por la política de Google. El contacto por WhatsApp abre WhatsApp, que
        también se rige por sus propias políticas.
      </p>

      <h2 className={styles.heading}>7. Tus opciones</h2>
      <p className={styles.text}>
        Puedes bloquear o borrar las cookies desde la configuración de tu navegador. Buscar avisos y
        ver una ficha funcionan sin ninguna cookie; lo único que deja de funcionar es entrar a tu
        cuenta, y con ello publicar y ver contactos.
      </p>

      <h2 className={styles.heading}>8. Cambios</h2>
      <p className={styles.text}>
        Si empezamos a usar otra cookie, la agregaremos a esta lista con su fecha antes de usarla.
      </p>

      <h2 className={styles.heading}>9. Contacto</h2>
      <p className={styles.text}>
        <AppLink href="mailto:hola@rentoru.com">hola@rentoru.com</AppLink>
      </p>
    </article>
  );
}
