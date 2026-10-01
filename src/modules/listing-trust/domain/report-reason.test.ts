import { describe, expect, it } from "vitest";
import {
  InvalidReportReasonError,
  parseReportReason,
  REPORT_REASON_OPTIONS,
  reportReasonFeedback,
} from "./report-reason";

describe("report reason", () => {
  it("shows feedback only for the fixed error marker", () => {
    expect(reportReasonFeedback("motivo")).toContain("Elegí un motivo");
    expect(reportReasonFeedback(["motivo"])).toBeUndefined();
    expect(reportReasonFeedback("forged")).toBeUndefined();
  });
  it("offers five stable Spanish reasons", () => {
    expect(REPORT_REASON_OPTIONS).toEqual([
      { value: "possible_fraud", label: "Posible estafa" },
      { value: "incorrect_information", label: "Datos incorrectos" },
      { value: "duplicate", label: "Duplicado" },
      { value: "unavailable", label: "No disponible" },
      { value: "other", label: "Otro" },
    ]);
  });

  it.each([null, "", "unknown", ["other"], new File(["x"], "reason.txt")])(
    "rejects untrusted reason %s",
    (reason) => expect(() => parseReportReason(reason, "note")).toThrow(InvalidReportReasonError),
  );

  it("normalizes blank explanation and trims supplied text", () => {
    expect(parseReportReason("other", "  ")).toEqual({ reason: "other", explanation: null });
    expect(parseReportReason("other", "  Detalles  ")).toEqual({
      reason: "other",
      explanation: "Detalles",
    });
  });
});
