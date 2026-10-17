import buttons from "../atoms/Button.module.css";
import styles from "./LoadingOverlay.module.css";

type Props = {
  readonly label: string;
  readonly href: string;
  readonly exitLabel: string;
};

/** Presentation only: the caller owns visibility, navigation and recovery. */
export function LoadingOverlay({ label, href, exitLabel }: Props) {
  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.mark} aria-hidden="true">
          <span className={styles.ring} />
          <span className={styles.letter}>R</span>
        </div>
        <p className={styles.label} role="status" aria-live="polite">
          {label}
        </p>
        <a className={`${buttons.base} ${buttons.neutral}`} href={href}>
          {exitLabel}
        </a>
      </div>
    </div>
  );
}
