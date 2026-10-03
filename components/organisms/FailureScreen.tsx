import type { ReactNode } from "react";
import type { FailureScreen as FailureScreenModel } from "@/modules/operability/domain/failure-report";
import { ActionLink } from "../atoms/buttons";
import { Container } from "../layout/Container";
import { ReadingWidth } from "../layout/ReadingWidth";
import styles from "./FailureScreen.module.css";

/**
 * **Las tres pantallas del fallo, en un solo marcado** (tareas 11b.2 y 11b.3).
 *
 * **Derivada, no inventada** (`AGENTS.md` §2). Ninguna de las nueve láminas
 * la dibuja y ninguna va a dibujarla, así que se deriva del sistema, que es
 * lo que `SISTEMA.md` manda cuando una pantalla necesita algo que las láminas
 * no traen. De dónde sale cada pieza: el título es el papel **«Título de
 * página» (20/700/1.25)**; el cuerpo es **«Cuerpo» (15/400)** dentro del
 * **ancho de lectura de 520px** que el mismo apartado fija; el contenedor es
 * el de **1100px** de «Layout de escritorio»; la salida es el **nivel 1,
 * Acción** de «Jerarquía de botones» por defecto; el caller puede aportar
 * otras acciones ya decididas. El código va en `--mono`, que el sistema reserva
 * para cifras que se leen carácter por carácter.
 *
 * **No lleva `Nav`.** El nav lee la sesión, y una pantalla de fallo no puede
 * depender de algo que podría ser justamente lo que falló. La salida de abajo
 * es la salida.
 *
 * Ni una decisión acá: qué dice, si hay código y a dónde se sale lo resolvió
 * `failure-report.ts`, con el suelo de cobertura del 90 % encima.
 */
export function FailureScreen({
  model,
  actions,
}: {
  readonly model: FailureScreenModel;
  readonly actions?: ReactNode;
}) {
  return (
    <main className={styles.page}>
      <Container>
        <h1 className={styles.title}>{model.heading}</h1>

        <ReadingWidth>
          <p className={styles.text}>{model.body}</p>
        </ReadingWidth>

        {model.reference === null ? null : (
          <p className={styles.reference}>
            Código del fallo: <code className={styles.code}>{model.reference}</code>
            <span className={styles.hint}>Cítalo si nos escribes: con él encontramos éste.</span>
          </p>
        )}

        {/* Por defecto, un enlace: un `<button>` sin script no navega. */}
        {actions ?? <ActionLink href={model.exit.href}>{model.exit.label}</ActionLink>}
      </Container>
    </main>
  );
}
