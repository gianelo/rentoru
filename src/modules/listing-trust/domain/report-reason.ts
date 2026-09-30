export const REPORT_REASON_OPTIONS = [
  { value: "possible_fraud", label: "Posible estafa" },
  { value: "incorrect_information", label: "Datos incorrectos" },
  { value: "duplicate", label: "Duplicado" },
  { value: "unavailable", label: "No disponible" },
  { value: "other", label: "Otro" },
] as const;

export const REPORT_REASON_ERROR_MARKER = "motivo";
export const REPORT_REASON_ERROR_TEXT = "✱ Elegí un motivo para enviar el reporte.";

export function reportReasonFeedback(marker: unknown): string | undefined {
  return marker === REPORT_REASON_ERROR_MARKER ? REPORT_REASON_ERROR_TEXT : undefined;
}

export class InvalidReportReasonError extends Error {
  constructor() {
    super("Invalid report reason");
    this.name = "InvalidReportReasonError";
  }
}

export function parseReportReason(reason: unknown, explanation: unknown) {
  if (
    typeof reason !== "string" ||
    !REPORT_REASON_OPTIONS.some((option) => option.value === reason)
  ) {
    throw new InvalidReportReasonError();
  }
  return {
    reason,
    explanation: typeof explanation === "string" ? explanation.trim() || null : null,
  };
}
