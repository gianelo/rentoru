import type { Metadata } from "next";
import { AppLink } from "@/../components/atoms/AppLink";
import { DraftNotice } from "../draft-notice";
import styles from "../legal.module.css";

/**
 * "Términos y condiciones" v2 (tasks.md 23.5) — borrador para ratificación
 * del fundador, con la estructura de los Términos de Airbnb (no su texto) y
 * sólo las cláusulas que aplican a un sitio de avisos gratuito. Cada regla
 * del producto ya existe en el código: `publishable-listing.ts`,
 * `listing-lifecycle/domain/expiry.ts`, `identity/infrastructure/auth.ts` y
 * `listing-trust/domain/report-threshold.ts`. El operador queda anónimo a
 * propósito (decisión del fundador, 2026-10-24): nombre, cédula y RIF se
 * entregan sólo a la autoridad que los requiera.
 */
export const metadata: Metadata = {
  title: "Términos y condiciones — Rentoru",
  description: "Las reglas de uso de rentoru.com, tal como funciona hoy.",
  // 26.12 — relativa: `metadataBase` le pone la base una sola vez.
  alternates: { canonical: "/legal/terminos" },
};

const contacto = <AppLink href="mailto:hola@rentoru.com">hola@rentoru.com</AppLink>;

export default function TerminosPage() {
  return (
    <article>
      <p className={styles.category}>Legal / Términos y condiciones</p>
      <h1 className={styles.title}>Términos y condiciones</h1>
      <DraftNotice />

      <h2 className={styles.heading}>1. Quién opera Rentoru</h2>
      <p className={styles.text}>
        rentoru.com («Rentoru») es un proyecto operado por su titular, persona natural domiciliada
        en la República Bolivariana de Venezuela. En estos términos, «nosotros» se refiere a Rentoru
        y a su titular, y «tú» a cualquier persona que use el sitio. Para cualquier comunicación,
        incluidas las notificaciones legales, escribe a {contacto}. Los datos de identificación del
        titular se entregarán a las autoridades competentes que los requieran conforme a la ley.
      </p>

      <h2 className={styles.heading}>2. Aceptación</h2>
      <p className={styles.text}>
        Al usar rentoru.com, o al crear una cuenta, aceptas estos términos, la{" "}
        <AppLink href="/legal/privacidad">Política de privacidad</AppLink>, el{" "}
        <AppLink href="/legal/cookies">Uso de cookies</AppLink> y las{" "}
        <AppLink href="/legal/normas">Normas de publicación</AppLink>. Esa aceptación electrónica es
        válida de acuerdo con la Ley sobre Mensajes de Datos y Firmas Electrónicas. Si no estás de
        acuerdo, no uses el sitio.
      </p>

      <h2 className={styles.heading}>3. Qué es Rentoru y qué no es</h2>
      <p className={styles.text}>
        3.1. Rentoru es un sitio gratuito de avisos de alquiler residencial de larga estadía en
        Distrito Capital y Maracaibo. Su única función es poner en contacto a quien publica un
        inmueble con quien lo busca.
      </p>
      <p className={styles.text}>
        3.2. Rentoru <strong>no</strong> es propietario, arrendador, inmobiliaria, corredor ni
        administrador de ningún inmueble publicado. <strong>No</strong> participa en la negociación,{" "}
        <strong>no</strong> redacta ni firma contratos, <strong>no</strong> recibe, guarda ni
        transfiere dinero y <strong>no</strong> cobra comisiones.
      </p>
      <p className={styles.text}>
        3.3. Cualquier acuerdo de arrendamiento es exclusivamente entre quien publica y quien
        alquila, y ambos son responsables de cumplir la normativa que les aplique, incluida la Ley
        para la Regularización y Control de los Arrendamientos de Vivienda.
      </p>
      <p className={styles.text}>
        3.4. Rentoru no verifica la identidad de quien publica, la titularidad del inmueble ni la
        veracidad de los avisos, salvo lo que se describe en{" "}
        <AppLink href="/ayuda/como-contactar-al-dueno">Cómo contactar al dueño</AppLink>.{" "}
        <strong>
          Visita el inmueble y verifica quién es el dueño antes de entregar cualquier pago.
        </strong>
      </p>

      <h2 className={styles.heading}>4. Capacidad</h2>
      <p className={styles.text}>
        Para crear una cuenta debes tener al menos 18 años y capacidad legal para contratar. Si
        publicas en nombre de una inmobiliaria, declaras que tienes autorización para hacerlo.
      </p>

      <h2 className={styles.heading}>5. Cuentas</h2>
      <p className={styles.text}>
        5.1. Se entra con una cuenta de Google o con un enlace enviado por correo. No hay
        contraseñas.
      </p>
      <p className={styles.text}>
        5.2. Eres responsable de lo que se haga desde tu cuenta y de mantener seguro el acceso a tu
        correo.
      </p>
      <p className={styles.text}>
        5.3. La información que des debe ser veraz. No puedes crear cuentas para otra persona ni
        usar varias cuentas para evadir estos términos o el sistema de reportes.
      </p>

      <h2 className={styles.heading}>6. Si publicas un aviso</h2>
      <p className={styles.text}>
        6.1. Declaras que eres el dueño del inmueble o que tienes autorización suficiente para
        ofrecerlo en alquiler, y que el inmueble existe, está disponible y es residencial.
      </p>
      <p className={styles.text}>
        6.2. El aviso debe cumplir las Normas de publicación. Eres el único responsable de su
        contenido, de su precio, de las condiciones que ofrezcas y de tu relación con los
        interesados.
      </p>
      <p className={styles.text}>
        6.3. Un aviso dura 30 días. Antes de que venza te avisamos por correo y puedes renovarlo. Si
        no lo renuevas, deja de mostrarse.
      </p>
      <p className={styles.text}>
        6.4. Aceptas que el contacto que elijas mostrar (WhatsApp, teléfono o correo) se revele a
        usuarios registrados que lo soliciten, y que cada solicitud quede registrada.
      </p>
      <p className={styles.text}>
        6.5. Debes retirar o actualizar el aviso cuando el inmueble deje de estar disponible.
      </p>
      <p className={styles.text}>
        6.6. <strong>Impuestos.</strong> Eres el único responsable de declarar y pagar los tributos
        que generen los alquileres que acuerdes. Rentoru no retiene, calcula ni declara impuestos
        por ti.
      </p>

      <h2 className={styles.heading}>7. Si buscas un inmueble</h2>
      <p className={styles.text}>
        7.1. Buscar es libre. Para ver el contacto de quien publica tienes que entrar con una cuenta
        y escribir un mensaje. Ese contacto solo puedes usarlo para preguntar por el inmueble.
      </p>
      <p className={styles.text}>
        7.2. Asumes los riesgos de tratar con terceros. No entregues dinero, depósitos ni documentos
        sin haber visitado el inmueble y verificado a la otra parte.
      </p>

      <h2 className={styles.heading}>8. Contenido y licencia</h2>
      <p className={styles.text}>
        8.1. Lo que publicas (textos y fotos) sigue siendo tuyo. Al publicarlo nos otorgas una
        licencia gratuita, no exclusiva y mundial para alojarlo, reproducirlo, adaptarlo
        técnicamente (por ejemplo, comprimir o redimensionar fotos) y mostrarlo en rentoru.com y en
        buscadores mientras el aviso exista, y durante el tiempo razonable que tome retirarlo de los
        respaldos.
      </p>
      <p className={styles.text}>
        8.2. Garantizas que tienes los derechos sobre las fotos y textos que publicas y que no
        infringen derechos de terceros. Una foto que ya aparece en el aviso de otro dueño se
        rechaza.
      </p>
      <p className={styles.text}>
        8.3. El diseño, la marca «Rentoru» y el software del sitio nos pertenecen. No puedes
        copiarlos ni extraer contenido de forma masiva (<em>scraping</em>) sin autorización escrita.
      </p>

      <h2 className={styles.heading}>9. Conductas prohibidas</h2>
      <ul className={styles.list}>
        <li className={styles.item}>
          Publicar inmuebles falsos, que no te pertenecen o que no estás autorizado a ofrecer.
        </li>
        <li className={styles.item}>
          Usar el sitio para estafas, para cobrar por adelantado sin mostrar el inmueble o para
          suplantar identidades.
        </li>
        <li className={styles.item}>
          Publicar inmuebles comerciales, alquileres vacacionales o cualquier cosa que no sea
          vivienda residencial.
        </li>
        <li className={styles.item}>
          Usar los contactos revelados para fines distintos al alquiler consultado, como spam o
          venta de datos.
        </li>
        <li className={styles.item}>
          Discriminar a interesados, acosarlos o tratarlos de forma abusiva.
        </li>
        <li className={styles.item}>
          Interferir con el sitio, vulnerar su seguridad o automatizar su uso sin permiso.
        </li>
      </ul>

      <h2 className={styles.heading}>10. Reportes, suspensión y terminación</h2>
      <p className={styles.text}>
        10.1. Cualquier cuenta puede reportar un aviso indicando un motivo. Cuando tres cuentas
        distintas reportan el mismo aviso, este se oculta automáticamente mientras se revisa.
      </p>
      <p className={styles.text}>
        10.2. Podemos rechazar, ocultar o eliminar avisos y suspender o cerrar cuentas que incumplan
        estos términos o la ley, o que pongan en riesgo a otros usuarios, con o sin aviso previo.
      </p>
      <p className={styles.text}>
        10.3. Puedes dejar de usar Rentoru cuando quieras y pedir el cierre de tu cuenta escribiendo
        a {contacto}.
      </p>

      <h2 className={styles.heading}>11. Gratuidad</h2>
      <p className={styles.text}>
        Publicar, buscar y contactar es gratis. Si algún día se cobra por algún servicio, se avisará
        antes y nunca será retroactivo.
      </p>

      <h2 className={styles.heading}>12. Servicios de terceros</h2>
      <p className={styles.text}>
        Para entrar puedes usar Google, y el contacto con quien publica puede ocurrir por WhatsApp,
        por teléfono o por correo. Esos servicios se rigen por sus propias condiciones y políticas,
        y Rentoru no responde por su funcionamiento ni por el uso que hagan de tus datos.
      </p>

      <h2 className={styles.heading}>13. Exención de garantías</h2>
      <p className={styles.text}>
        Rentoru se ofrece «tal como está» y «según disponibilidad». No garantizamos que los avisos
        sean veraces, que los inmuebles estén disponibles o en buen estado, que las partes cumplan
        lo acordado, ni que el sitio funcione sin interrupciones o errores.
      </p>

      <h2 className={styles.heading}>14. Limitación de responsabilidad</h2>
      <p className={styles.text}>
        En la medida en que la ley venezolana lo permita, Rentoru y su titular no responden por: (a)
        los acuerdos, pagos, daños o pérdidas que resulten de la relación entre quien publica y
        quien alquila; (b) el contenido publicado por usuarios; (c) fraudes cometidos por terceros;
        (d) interrupciones, pérdida de datos o fallas de proveedores. Como el servicio es gratuito,
        en ningún caso respondemos por daños indirectos, lucro cesante ni pérdida de oportunidad.
        Nada en estos términos excluye la responsabilidad que la ley no permita excluir.
      </p>

      <h2 className={styles.heading}>15. Indemnidad</h2>
      <p className={styles.text}>
        Aceptas mantener indemne a Rentoru y a su titular frente a reclamos de terceros que surjan
        de tu contenido, de tu incumplimiento de estos términos o de tu relación con otros usuarios.
      </p>

      <h2 className={styles.heading}>16. Fuerza mayor</h2>
      <p className={styles.text}>
        No respondemos por incumplimientos o demoras causados por hechos fuera de nuestro control
        razonable, como fallas eléctricas o de conectividad, caídas de proveedores, desastres
        naturales o actos de autoridad.
      </p>

      <h2 className={styles.heading}>17. Cambios a estos términos</h2>
      <p className={styles.text}>
        Podemos modificar estos términos. Publicaremos la nueva versión con su fecha y, si el cambio
        es importante, avisaremos por correo a quienes tengan cuenta. Seguir usando el sitio después
        de esa fecha implica aceptar la nueva versión.
      </p>

      <h2 className={styles.heading}>18. Notificaciones</h2>
      <p className={styles.text}>
        Aceptas recibir las comunicaciones relacionadas con tu cuenta, tus avisos y estos términos
        en el correo asociado a tu cuenta, y que se consideren recibidas al enviarse a esa
        dirección. Las notificaciones dirigidas a Rentoru se envían a {contacto}.
      </p>

      <h2 className={styles.heading}>19. Ley aplicable y jurisdicción</h2>
      <p className={styles.text}>
        Estos términos se rigen por las leyes de la República Bolivariana de Venezuela. Cualquier
        controversia se someterá a los tribunales competentes de la República Bolivariana de
        Venezuela, conforme a las normas de competencia aplicables y sin perjuicio de las normas
        imperativas que te den derecho a otro fuero.
      </p>

      <h2 className={styles.heading}>20. Disposiciones generales</h2>
      <ul className={styles.list}>
        <li className={styles.item}>
          Si una cláusula resulta inválida, las demás siguen vigentes.
        </li>
        <li className={styles.item}>
          Que no ejerzamos un derecho no significa que renunciemos a él.
        </li>
        <li className={styles.item}>
          No puedes ceder tus derechos bajo estos términos. Nosotros podemos cederlos a una sociedad
          que se constituya para operar Rentoru, o a quien llegue a operarlo; en ese caso
          actualizaremos la cláusula 1 y te lo avisaremos según la cláusula 18.
        </li>
        <li className={styles.item}>
          Las cláusulas 8, 13, 14, 15 y 19 siguen vigentes aunque cierres tu cuenta.
        </li>
        <li className={styles.item}>
          Estos términos, junto con los documentos enlazados en la cláusula 2, son el acuerdo
          completo entre tú y Rentoru.
        </li>
      </ul>

      <h2 className={styles.heading}>21. Contacto</h2>
      <p className={styles.text}>{contacto}</p>
    </article>
  );
}
