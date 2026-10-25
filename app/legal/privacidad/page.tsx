import type { Metadata } from "next";
import { AppLink } from "@/../components/atoms/AppLink";
import { DraftNotice } from "../draft-notice";
import styles from "../legal.module.css";

/**
 * "Política de privacidad" v3 (tasks.md 23.5) — borrador para ratificación
 * del fundador, con la estructura de la política de Airbnb (no su texto).
 * Los datos recogidos son los que `google-profile.ts` y `enlace.ts`
 * realmente capturan; los encargados son los proveedores reales del código.
 * La conservación se declara como criterio y nunca como un plazo en meses
 * (fase 39, D1–D8). El responsable queda anónimo a propósito, igual que en
 * los Términos (decisión del fundador, 2026-10-24).
 */
export const metadata: Metadata = {
  title: "Política de privacidad — Rentoru",
  description: "Qué datos recoge rentoru.com, para qué los usa y con quién los comparte.",
  // 26.12 — relativa: `metadataBase` le pone la base una sola vez.
  alternates: { canonical: "/legal/privacidad" },
};

const contacto = <AppLink href="mailto:hola@rentoru.com">hola@rentoru.com</AppLink>;

export default function PrivacidadPage() {
  return (
    <article>
      <p className={styles.category}>Legal / Política de privacidad</p>
      <h1 className={styles.title}>Política de privacidad</h1>
      <DraftNotice />

      <p className={styles.text}>
        Esta política explica qué datos personales recoge rentoru.com, para qué los usa, con quién
        los comparte, cuánto tiempo los guarda y cómo puedes ejercer tus derechos. Se aplica junto
        con los <AppLink href="/legal/terminos">Términos y condiciones</AppLink> y el{" "}
        <AppLink href="/legal/cookies">Uso de cookies</AppLink>.
      </p>

      <h2 className={styles.heading}>1. Qué son los datos personales</h2>
      <p className={styles.text}>
        Es cualquier información que te identifica o que permite identificarte, como tu nombre, tu
        correo o tu número de teléfono.
      </p>

      <h2 className={styles.heading}>2. Quién es el responsable</h2>
      <p className={styles.text}>
        El responsable del tratamiento es el titular de Rentoru, persona natural domiciliada en la
        República Bolivariana de Venezuela (cláusula 1 de los Términos). Para cualquier asunto sobre
        tus datos, escribe a {contacto}.
      </p>

      <h2 className={styles.heading}>3. Qué datos recogemos</h2>
      <p className={styles.text}>
        <strong>3.1. Los que nos das</strong>
      </p>
      <ul className={styles.list}>
        <li className={styles.item}>
          <strong>Cuenta.</strong> Si entras con Google: tu nombre y el correo que Google confirma
          como verificado. No guardamos tu foto de perfil ni ningún otro dato de tu cuenta de
          Google. Si entras con el enlace por correo: la dirección a la que te lo enviamos.
        </li>
        <li className={styles.item}>
          <strong>Aviso.</strong> Los datos del inmueble (tipo, ciudad, zona, precio, medidas,
          descripción y fotos) y si publicas como dueño o como inmobiliaria.
        </li>
        <li className={styles.item}>
          <strong>Contacto que eliges mostrar.</strong> El método (WhatsApp, teléfono o correo) y su
          valor. Si lo verificas, también guardamos la fecha de verificación, que la ficha del aviso
          puede mostrar.
        </li>
        <li className={styles.item}>
          <strong>Mensaje al pedir un contacto.</strong> Cuando pides ver el contacto de un aviso,
          guardamos qué aviso, tu cuenta, el momento y el mensaje que escribiste. Si el contacto es
          WhatsApp, ese mensaje va precargado en el enlace para que lo envíes tú.
        </li>
        <li className={styles.item}>
          <strong>Reportes.</strong> Si reportas un aviso: el aviso, tu cuenta, el momento, el
          motivo y la explicación opcional. Tu identidad como denunciante no se le muestra a quien
          publicó.
        </li>
        <li className={styles.item}>
          <strong>Formulario «Escríbenos».</strong> Tu nombre, tu correo y tu mensaje, que nos
          llegan por correo electrónico.
        </li>
      </ul>
      <p className={styles.text}>
        <strong>3.2. Los que se generan al usar el sitio</strong>
      </p>
      <ul className={styles.list}>
        <li className={styles.item}>
          <strong>Cookies</strong> estrictamente necesarias, descritas en{" "}
          <AppLink href="/legal/cookies">Uso de cookies</AppLink>.
        </li>
        <li className={styles.item}>
          <strong>Registros técnicos</strong> que generan nuestros proveedores de alojamiento al
          atender cada solicitud, como la dirección IP, el navegador y la página pedida. Nuestros
          propios registros de errores guardan la ruta y un código del fallo, no tu identidad.
        </li>
      </ul>
      <p className={styles.text}>
        <strong>3.3. Los que recibimos de terceros.</strong> Solo Google, cuando entras con tu
        cuenta de Google, y solo el nombre y el correo verificado.
      </p>

      <h2 className={styles.heading}>4. Para qué los usamos</h2>
      <ul className={styles.list}>
        <li className={styles.item}>
          <strong>Darte el servicio:</strong> identificarte al entrar, publicar y mostrar tu aviso,
          revelar tu contacto a quien lo pida y enviarte los correos del sitio (enlace de entrada,
          aviso de vencimiento y aviso antes de borrar fotos).
        </li>
        <li className={styles.item}>
          <strong>Confianza y seguridad:</strong> rechazar fotos ya usadas en el aviso de otro
          dueño, procesar reportes y ocultar automáticamente un aviso cuando tres cuentas distintas
          lo reportan, limitar a 40 los avisos distintos cuyo contacto puede ver una cuenta en 24
          horas y hacer cumplir los Términos.
        </li>
        <li className={styles.item}>
          <strong>Cumplir la ley</strong> y responder a requerimientos de autoridades competentes.
        </li>
      </ul>
      <p className={styles.text}>
        No vendemos tus datos, no los usamos para publicidad, no armamos perfiles de comportamiento
        y no los usamos para entrenar modelos de inteligencia artificial.
      </p>

      <h2 className={styles.heading}>5. Con quién los compartimos</h2>
      <ul className={styles.list}>
        <li className={styles.item}>
          <strong>Otros usuarios.</strong> El aviso es público e indexable por buscadores. Tu
          contacto solo se revela a usuarios con cuenta que lo pidan.
        </li>
        <li className={styles.item}>
          <strong>Proveedores que procesan datos por nuestra cuenta:</strong> Google (inicio de
          sesión) y proveedores de alojamiento del sitio, base de datos, almacenamiento de fotos y
          envío de correo. Están obligados a proteger los datos y no los usan para fines propios.
        </li>
        <li className={styles.item}>
          <strong>Autoridades</strong>, cuando una orden o una norma lo exija, o para proteger la
          seguridad de personas frente a un fraude.
        </li>
        <li className={styles.item}>
          <strong>Una futura sociedad</strong> que se constituya para operar Rentoru, que mantendría
          esta política o te avisaría antes de cambiarla.
        </li>
      </ul>

      <h2 className={styles.heading}>6. Transferencias internacionales</h2>
      <p className={styles.text}>
        Nuestros proveedores pueden almacenar o procesar los datos fuera de Venezuela,
        principalmente en Estados Unidos. Al usar el sitio aceptas esa transferencia, que se limita
        a lo necesario para prestar el servicio.
      </p>

      <h2 className={styles.heading}>7. Tus derechos</h2>
      <p className={styles.text}>
        Conforme al artículo 28 de la Constitución (<em>habeas data</em>), puedes:
      </p>
      <ul className={styles.list}>
        <li className={styles.item}>
          saber qué datos tuyos tenemos y para qué, y recibir una copia;
        </li>
        <li className={styles.item}>pedir que los actualicemos o corrijamos;</li>
        <li className={styles.item}>
          pedir el cierre de tu cuenta y la eliminación de tus datos, salvo lo que debamos conservar
          según la sección 8;
        </li>
        <li className={styles.item}>oponerte a un uso concreto.</li>
      </ul>
      <p className={styles.text}>
        Escribe a {contacto} desde el correo de tu cuenta y responderemos dentro de los 30 días
        siguientes.
      </p>

      <h2 className={styles.heading}>8. Cuánto tiempo los conservamos</h2>
      <p className={styles.text}>
        Conservamos cada dato solo mientras sea necesario para el fin con que lo obtuvimos. Cuando
        deja de serlo, lo eliminamos o lo anonimizamos, es decir, borramos lo que te identifica y
        conservamos solo cifras que ya no permiten saber quién eres.
      </p>
      <ul className={styles.list}>
        <li className={styles.item}>
          <strong>Cuenta y contacto de tu cuenta:</strong> Mientras la cuenta exista.
        </li>
        <li className={styles.item}>
          <strong>Sesión iniciada:</strong> Hasta 30 días sin actividad, o hasta que salgas.
        </li>
        <li className={styles.item}>
          <strong>Borrador de un aviso sin publicar:</strong> 24 horas.
        </li>
        <li className={styles.item}>
          <strong>Fotos de un aviso:</strong> Se borran 15 días después de que vence; te avisamos
          antes.
        </li>
        <li className={styles.item}>
          <strong>Contacto copiado en un aviso vencido:</strong> Se borra junto con sus fotos.
        </li>
        <li className={styles.item}>
          <strong>Ficha de un aviso vencido:</strong> Se conserva sin fotos ni contacto, marcada
          como vencida.
        </li>
        <li className={styles.item}>
          <strong>Registro de contactos revelados:</strong> Mientras sea necesario para prevenir
          fraudes y medir el servicio; después se anonimiza.
        </li>
        <li className={styles.item}>
          <strong>Reportes:</strong> Mientras sea necesario para revisar el aviso y prevenir
          fraudes; después se anonimizan. Nunca mientras el aviso siga en revisión.
        </li>
        <li className={styles.item}>
          <strong>Mensajes de «Escríbenos»:</strong> Mientras sea necesario para responder.
        </li>
      </ul>
      <p className={styles.text}>
        Al cerrar tu cuenta eliminamos tus datos personales y anonimizamos los registros anteriores;
        solo conservamos lo que la ley nos exija o lo necesario para atender un reporte de fraude en
        curso.
      </p>
      <p className={styles.text}>
        Pueden quedar copias residuales en los respaldos de nuestros proveedores durante un tiempo
        limitado, según la política de cada uno.
      </p>

      <h2 className={styles.heading}>9. Seguridad</h2>
      <p className={styles.text}>
        Usamos conexiones cifradas (HTTPS), cookies de sesión inaccesibles para los scripts de la
        página y acceso restringido a la base de datos. Ningún sistema es infalible: si detectamos
        un incidente que afecte tus datos, te avisaremos.
      </p>

      <h2 className={styles.heading}>10. Menores de edad</h2>
      <p className={styles.text}>
        Rentoru no está dirigido a menores de 18 años y no permite que creen cuentas.
      </p>

      <h2 className={styles.heading}>11. Cambios a esta política</h2>
      <p className={styles.text}>
        Publicaremos cualquier cambio con su fecha. Si es importante, avisaremos por correo a
        quienes tengan cuenta antes de que entre en vigor. Si no estás de acuerdo, puedes pedir el
        cierre de tu cuenta.
      </p>

      <h2 className={styles.heading}>12. Contacto</h2>
      <p className={styles.text}>{contacto}</p>
    </article>
  );
}
