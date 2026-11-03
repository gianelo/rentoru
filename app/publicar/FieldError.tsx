import styles from "./publish-steps.module.css";

/**
 * **El mensaje acompaña al campo que lo produjo y se vincula, no sólo se
 * dibuja.** Va debajo del control y antes de la ayuda en todo el sitio:
 * etiqueta, control, error, ayuda (fundador, 2026-11-02: «…es abajo deberia
 * de salir el error y unificar todo»). En un grupo de opciones va después de
 * la última; en una fila numérica, debajo de la fila.
 * La razón está escrita en `violation-copy.ts` y no es estética: *«un
 * borde rojo es invisible para quien no distingue colores y para el modo de
 * alto contraste»*. El `id` es el que el control nombra en su
 * `aria-describedby`, y el control lleva además `aria-invalid`.
 *
 * **Vivía adentro de `PublishStep`** hasta la 18.22, que necesitaba la misma
 * anatomía en la pantalla de editar. Se movió en vez de copiarse: dos maneras
 * de anunciar un mismo tipo de error es como un producto empieza a
 * contradecirse a sí mismo, y la segunda es la que se queda sin `aria-invalid`.
 */
export function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p className={styles.error} id={id}>
      {message}
    </p>
  );
}
