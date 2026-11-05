/**
 * tasks.md 18.21 — leer las fotos de un aviso: su orden y sus miniaturas.
 *
 * **Puertos de lectura AL LADO de `ListingPhotoAttachmentPort`, ninguno
 * adentro de él** (AGENTS.md §3): cuando hace falta leer de una tabla cuyo
 * puerto de escritura es angosto a propósito, se agrega un puerto de lectura
 * al lado. Quitar fotos ya no tiene puerto propio: desde la 44.4 vive en la
 * transacción de `ListingEditWithPhotosPort`.
 */

/**
 * Los identificadores de las fotos del aviso **en el orden en que se
 * muestran**, que es el orden de `position` ascendente y por lo tanto pone la
 * portada primero (`COVER_PHOTO_INDEX`).
 *
 * Devuelve el arreglo que `planPhotoRemoval` recibe tal cual: el dominio ya
 * dice que «el orden de la lista ES el orden del aviso y la primera ES la
 * portada», así que traducir posiciones acá sería una segunda manera de decir
 * lo mismo.
 */
export interface ListingPhotoOrderPort {
  listPhotoIdsInOrder(listingId: string): Promise<readonly string[]>;
}

/**
 * tasks.md 18.26 — una foto del aviso **con lo único que hace falta para
 * dibujarla**: su id, que es lo que el formulario de quitar manda, y la clave
 * de R2 de su miniatura.
 *
 * **`thumb` y sólo `thumb`, no el `Record` de los cinco tamaños que
 * `ListingPhotoView` devuelve.** Aquél existe porque la tarjeta, la tira y el
 * visor eligen tamaños distintos sobre la misma lectura; acá hay una sola
 * superficie y un solo tamaño, y devolver cinco claves para usar una
 * convertiría en dato lo que es una decisión de esta pantalla.
 *
 * **`null` cuando la derivada no está, en vez de omitir la foto.** Es la
 * diferencia entre una miniatura que falta y una foto que desaparece: el
 * renglón es el ÚNICO camino para quitarla, así que filtrarla dejaría una fila
 * que el aviso muestra y su dueño no puede sacar (AGENTS.md §7).
 */
export interface ListingPhotoThumbnail {
  readonly photoId: string;
  readonly thumbKey: string | null;
}

/**
 * **Un puerto de lectura al lado, no un método más en `ListingPhotoOrderPort`.**
 * Aquél contesta una sola pregunta —en qué orden van— y `planPhotoRemoval`
 * recibe su arreglo tal cual; agregarle las miniaturas le pondría a quien sólo
 * necesita el orden un join contra `listing_photo_derivative` que nunca pidió.
 */
export interface ListingPhotoThumbnailPort {
  /**
   * En el orden en que se muestran, o sea `position` ascendente: la portada
   * primero, igual que `listPhotoIdsInOrder`. La posición no viaja como
   * columna porque el índice del arreglo YA es la posición, y dos fuentes para
   * el mismo número es como una pantalla termina diciendo «Foto 3» sobre la
   * segunda.
   */
  listPhotoThumbnailsInOrder(listingId: string): Promise<readonly ListingPhotoThumbnail[]>;
}
