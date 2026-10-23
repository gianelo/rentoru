import type {
  DraftPhotoAction,
  PhotoRemovalRefusal,
} from "../../src/modules/listing-publication/domain/draft-photo-actions";

/**
 * El español del menú `⋯` de las fotos (paso 8, lámina 2g y
 * `Rentoru - Publicar - Mobile.dc.html`).
 *
 * **Vive acá y no adentro del JSX**, como `step-copy.ts` y
 * `violation-copy.ts`: la copia compartida tiene prueba propia y sale literal.
 * F36.10 supersede las ayudas históricas de teléfono y portada del menú;
 * la explicación de portada se muestra una sola vez por superficie.
 *
 * El `Record` sobre `DraftPhotoAction` es el mismo seguro que
 * `PUBLISH_VIOLATION_COPY` usa: si el dominio agrega una acción, este archivo
 * deja de compilar hasta que alguien escriba su renglón.
 */

export interface PhotoActionCopy {
  /** El renglón del menú, entero: «Quitar del aviso», no «Quitar … del aviso». */
  readonly label: string;
  /** Aclaración opcional visible, no escondida en un `title`. */
  readonly hint?: string;
}

export const PHOTO_ACTION_COPY: Record<DraftPhotoAction, PhotoActionCopy> = {
  moveUp: { label: "Mover arriba" },
  moveDown: { label: "Mover abajo" },
  makeCover: { label: "Hacer portada" },
  remove: { label: "Quitar del aviso" },
};

export const PHOTO_COVER_EXPLANATION = "Es la foto principal de tu aviso";

/** El nombre accesible conserva la acción y la identidad de la foto. */
export function photoActionLabel(action: DraftPhotoAction, photoName: string): string {
  const { label, hint } = PHOTO_ACTION_COPY[action];
  const named = `${label}: ${photoName}`;
  if (!hint) return named;
  return `${named}. ${hint.charAt(0).toUpperCase()}${hint.slice(1)}`;
}

/**
 * Por qué no se quitó. `lastPhoto` **dice la salida** en vez de sólo negar:
 * el piso es `MIN_PHOTOS_FOR_ACTIVATION` y agregar antes de quitar lo
 * respeta, así que la negativa cuesta un toque, no un camino cerrado.
 *
 * `notFound` no debería alcanzarse desde la pantalla —el botón nace del
 * mismo arreglo que el dominio recibe—, y por eso dice lo único honesto que
 * se puede decir de un estado que no se entiende.
 */
export const PHOTO_REMOVAL_REFUSAL_COPY: Record<PhotoRemovalRefusal, string> = {
  lastPhoto: "Es la única foto y sin fotos no se puede publicar. Agrega otra y después quita esta.",
  notFound: "Esa foto ya no está en la lista.",
};

/**
 * tasks.md 18.21 — la misma frase, cuando el código vuelve por la URL.
 *
 * **`string` y no la unión, y el `??` no es un descuido**, igual que
 * `listingEditViolationMessage`: quitar una foto de un aviso publicado es un
 * `<form method="post">` sin JavaScript, así que la negativa vuelve como
 * parámetro y una dirección escrita a mano es dato de afuera. Indexar la tabla
 * con lo que traiga daría `undefined` dibujado; la garantía de que ninguna
 * negativa REAL se quede sin copia la sigue dando el `Record` sobre la unión.
 */
export function photoRemovalRefusalMessage(refusal: PhotoRemovalRefusal | string): string {
  return PHOTO_REMOVAL_REFUSAL_COPY[refusal as PhotoRemovalRefusal] ?? refusal;
}

/**
 * Quien quita la primera foto cambió la cara del aviso sin pedirlo. La región
 * viva lo anuncia con nombre, porque «la portada cambió» sobre una lista de
 * seis miniaturas no dice cuál quedó.
 */
export function coverChangedNotice(photoName: string): string {
  return `Ahora la portada es «${photoName}».`;
}

/**
 * La foto que se rompió al comprimir o al subir **nunca entró al aviso**, así
 * que su `×` no dice «quitar del aviso» ni promete que el teléfono conserva
 * nada: no hay nada que conservar del lado del aviso, y el piso de
 * `MIN_PHOTOS_FOR_ACTIVATION` tampoco la contaba.
 */
export function discardPhotoLabel(photoName: string): string {
  return `Descartar ${photoName}, que no llegó a subir`;
}
