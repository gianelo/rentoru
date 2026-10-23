import type { FailureScreen } from "@/modules/operability/domain/failure-report";

/** Generic navigation recovery; no claim about drafts or publication state. */
export const NAVIGATION_RECOVERY: FailureScreen & {
  readonly retry: { readonly href: string; readonly label: string };
} = {
  heading: "La navegación tardó demasiado",
  body: "Puedes reintentar la navegación o volver al inicio.",
  reference: null,
  retry: { href: "/publicar", label: "Reintentar" },
  exit: { href: "/", label: "Inicio" },
};
