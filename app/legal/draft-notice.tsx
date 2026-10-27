import styles from "./legal.module.css";

/**
 * The visible marker every /legal page carries until the founder ratifies
 * its text (tasks.md 23.5 — the agent drafts, the founder ratifies, and the
 * task does not close until ratification does). A published placeholder is
 * worse than an absent page because it reads as a commitment; a substantive
 * draft honestly labelled as unratified is neither. Removing this from each
 * page is part of closing 23.5, never a separate task. Since phase 39 the
 * notice also says the software is unfinished: some pages describe behaviour
 * (anonymisation, account closure) that is still being built (founder,
 * 2026-10-25).
 */
export function DraftNotice() {
  return (
    <p className={styles.notice}>
      <strong>Borrador en revisión.</strong> Estamos trabajando en este texto mientras completamos
      el sitio. Algunas de las funciones que describe todavía se están implementando, y el texto
      puede cambiar antes de su versión final.
    </p>
  );
}
