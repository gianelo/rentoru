import type { PublishCopyContext } from "../publicar/violation-copy";

/**
 * Fase 44 (44.2) — **lo que vuelve a la pantalla de editar cuando el dominio
 * se niega**, y lo único que `useActionState` lleva de un envío al siguiente.
 *
 * Es transporte, no regla: `motivos` son los códigos estables del dominio,
 * `medidas` los largos de lo enviado, y `valores` las cadenas del `FormData`
 * tal cual se escribieron — un precio «abc» vuelve «abc». Nada se decide sobre
 * ellos acá; qué significa cada uno ya lo contestó `editListing`.
 *
 * Un módulo aparte y sin `"use server"`: un archivo de acciones sólo puede
 * exportar funciones asíncronas, y la página y el componente siembran el
 * estado inicial con esta misma forma.
 */
export interface EstadoDeEdicion {
  readonly motivos: readonly string[];
  readonly medidas: PublishCopyContext;
  readonly valores?: Readonly<Record<string, string>>;
  /** Las fotos marcadas «Quitar al guardar» que se enviaron (44.4b). */
  readonly fotosAQuitar?: readonly string[];
  /** Las fotos en el orden que se veían, con la portada primero (44.5b). */
  readonly ordenFotos?: readonly string[];
}

export const SIN_NEGATIVAS: EstadoDeEdicion = { motivos: [], medidas: {} };
