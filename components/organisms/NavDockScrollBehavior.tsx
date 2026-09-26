"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import styles from "./Nav.module.css";

interface NavDockScrollBehaviorProps {
  readonly children: ReactNode;
  readonly fallback: boolean;
}

/** Progressive enhancement: SSR keeps the dock visible and focusable. */
export function NavDockScrollBehavior({ children, fallback }: NavDockScrollBehaviorProps) {
  const [hidden, setHidden] = useState(false);
  const dockRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previous = window.scrollY;

    const show = () => {
      setHidden(false);
      // Keep the DOM in sync before another keyboard event can reach a hidden link.
      if (dockRef.current) dockRef.current.inert = false;
    };
    const onScroll = () => {
      const current = window.scrollY;
      if (!mobile.matches || reducedMotion.matches) {
        show();
        previous = current;
        return;
      }
      if (Math.abs(current - previous) > 8) {
        const shouldHide = current > previous && current > 64;
        if (dockRef.current) dockRef.current.inert = shouldHide;
        setHidden(shouldHide);
        previous = current;
      }
    };
    const onPreferenceChange = () => {
      previous = window.scrollY;
      if (!mobile.matches || reducedMotion.matches) show();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    mobile.addEventListener("change", onPreferenceChange);
    reducedMotion.addEventListener("change", onPreferenceChange);
    return () => {
      window.removeEventListener("scroll", onScroll);
      mobile.removeEventListener("change", onPreferenceChange);
      reducedMotion.removeEventListener("change", onPreferenceChange);
    };
  }, []);

  return (
    <nav
      ref={dockRef}
      className={`${styles.dock} ${fallback ? styles.dockFallback : ""} ${hidden ? styles.dockHidden : ""}`}
      aria-label="Navegación principal"
      inert={hidden}
    >
      {children}
    </nav>
  );
}
