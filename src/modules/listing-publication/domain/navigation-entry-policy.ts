export type NavigationEntryPolicy = {
  readonly deadlineMs: number;
  readonly label: string;
  readonly exitLabel: string;
  readonly exitHref: string;
  readonly recoveryHref: string;
};

export function navigationEntryPolicy(): NavigationEntryPolicy {
  return {
    deadlineMs: 10_000,
    label: "Cargando publicación…",
    exitLabel: "Volver al inicio",
    exitHref: "/",
    recoveryHref: "/publicar/error-de-carga",
  };
}
