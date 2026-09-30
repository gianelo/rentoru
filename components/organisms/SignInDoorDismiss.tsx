"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useDismissLayer } from "../hooks/useDismissLayer";
import styles from "./SignInDoor.module.css";

/** Hydration only adds dismissal; server children retain native links and POST forms. */
export function SignInDoorDismiss({
  children,
  stayHref,
}: {
  readonly children: ReactNode;
  readonly stayHref: string;
}) {
  const [open, setOpen] = useState(true);
  const { triggerRef, panelRef } = useDismissLayer<HTMLAnchorElement, HTMLElement>(open, () => {
    setOpen(false);
    window.history.replaceState(null, "", stayHref);
  });

  useEffect(() => {
    triggerRef.current = document.querySelector<HTMLAnchorElement>("[data-contact-door-trigger]");
  }, [triggerRef]);

  if (!open) return null;
  return (
    <div className={styles.door} data-testid="puerta" role="dialog" aria-labelledby="puerta-titulo">
      <div className={styles.veil} aria-hidden="true" />
      <section ref={panelRef} className={styles.panel} data-testid="puerta-panel">
        {children}
      </section>
    </div>
  );
}
