import { describe, expect, it } from "vitest";
import { failureEvent } from "./failure-event";
import { failureReport } from "./failure-report";

/**
 * **Lo que sale de nuestra infraestructura hacia Sentry** (13.1).
 *
 * El evento se arma desde el reporte cerrado de `failure-report.ts` y desde
 * nada más: el SDK de Sentry captura por defecto la URL, los encabezados y la
 * pila, y `/renovar/<token>` lleva una llave en el camino. Acá no hay de dónde
 * sacarlos.
 */
const report = failureReport({
  boundary: "render",
  route: "/renovar/[token]",
  digest: "3f5d1a9c",
  cause: new Error("boom para ana@correo.com"),
});

describe("failureEvent", () => {
  it("lleva el código del fallo como etiqueta, para buscar lo que el visitante nos cita", () => {
    expect(failureEvent(report, { environment: "production", release: "df93315" })).toStrictEqual({
      level: "error",
      platform: "node",
      logger: "rentoru",
      environment: "production",
      release: "df93315",
      transaction: "/renovar/[token]",
      message: { formatted: "Error: boom para [oculto]" },
      tags: { route: "/renovar/[token]", boundary: "render", digest: "3f5d1a9c" },
    });
  });

  it("sin código del fallo no inventa la etiqueta", () => {
    const event = failureEvent({ ...report, digest: null }, { environment: "preview" });

    expect(event.tags).toStrictEqual({ route: "/renovar/[token]", boundary: "render" });
    expect(event).not.toHaveProperty("release");
  });

  /**
   * Los dos valores llegan del entorno de Vercel y se vuelven a cerrar: un
   * entorno desconocido no abre un tercer tablero en Sentry, y un release que
   * no es un commit no se escribe.
   */
  it("cierra el entorno y el release a lo que Vercel puede mandar", () => {
    const event = failureEvent(report, { environment: "staging", release: "rama/nueva" });

    expect(event.environment).toBe("development");
    expect(event).not.toHaveProperty("release");
  });
});
