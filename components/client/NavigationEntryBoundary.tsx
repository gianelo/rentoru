"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import type { NavigationEntryPolicy } from "@/modules/listing-publication/domain/navigation-entry-policy";
import { LoadingOverlay } from "../molecules/LoadingOverlay";

/** Document-owned once replacement starts: a late router commit may remove the
 * entire publication layout. Keeping this outside React prevents that commit
 * from revealing content while the native recovery GET is still pending.
 */
function shieldDocument(overlay: HTMLElement) {
  const shield = overlay.cloneNode(true) as HTMLElement;
  shield.setAttribute("data-navigation-terminal", "");
  document.body.append(shield);
  const conceal = () => {
    for (const node of document.body.children) {
      if (node !== shield && node instanceof HTMLElement) {
        if (!node.inert) node.inert = true;
        if (!node.hidden) node.hidden = true;
        // Author display rules can override the UA [hidden] rule (e.g. the dock).
        if (
          node.style.display !== "none" ||
          node.style.getPropertyPriority("display") !== "important"
        ) {
          node.style.setProperty("display", "none", "important");
        }
      }
    }
  };
  conceal();
  const observer = new MutationObserver(conceal);
  observer.observe(document.body, { childList: true });
  window.addEventListener("pagehide", () => observer.disconnect(), { once: true });
  shield.querySelector<HTMLAnchorElement>("a")?.focus();
}

export function NavigationEntryBoundary({
  children,
  policy,
}: {
  children: ReactNode;
  policy: NavigationEntryPolicy;
}) {
  const [phase, setPhase] = useState<"pending" | "ready" | "terminal">("pending");
  const phaseRef = useRef(phase);
  const content = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const destination = content.current;
    const loading = overlay.current;
    if (!destination || !loading || phaseRef.current !== "pending") return;
    const previousFocus = document.activeElement;
    const inertStates = new Map<HTMLElement, boolean>();
    // Inert siblings at every ancestor level, not just the route subtree.
    let branch: HTMLElement = loading;
    while (branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          inertStates.set(sibling, sibling.inert);
          sibling.inert = true;
        }
      }
      if (branch.parentElement === document.body) break;
      branch = branch.parentElement;
    }
    const exit = loading.querySelector<HTMLAnchorElement>("a");
    exit?.focus();
    let timer: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver(checkReady);
    const restore = () => {
      clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("keydown", keyboard, true);
      for (const [element, wasInert] of inertStates) element.inert = wasInert;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
    const replace = (href: string) => {
      if (phaseRef.current !== "pending") return;
      phaseRef.current = "terminal";
      restore();
      shieldDocument(loading);
      setPhase("terminal");
      window.location.replace(href);
    };
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Tab") {
        event.preventDefault();
        exit?.focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        replace(policy.exitHref);
      }
    }
    function checkReady() {
      // LayoutRouter can commit null during a redirect. Only rendered DOM in
      // the actual children ends the attempt; pathname and sibling sentinels
      // cannot establish this. Ignore React's hidden streaming placeholders.
      const rendered = [...(destination?.children ?? [])].some(
        (node) =>
          node instanceof HTMLElement &&
          !["TEMPLATE", "SCRIPT"].includes(node.tagName) &&
          !node.hidden &&
          node.style.display !== "none",
      );
      if (rendered && phaseRef.current === "pending") {
        phaseRef.current = "ready";
        restore();
        setPhase("ready");
      }
    }
    document.addEventListener("keydown", keyboard, true);
    timer = setTimeout(() => replace(policy.recoveryHref), policy.deadlineMs);
    observer.observe(destination, { childList: true, subtree: true, attributes: true });
    checkReady();
    return () => {
      if (phaseRef.current !== "terminal") restore();
    };
  }, [policy]);

  return (
    <>
      {phase === "pending" && (
        <div ref={overlay}>
          <LoadingOverlay
            label={policy.label}
            href={policy.exitHref}
            exitLabel={policy.exitLabel}
          />
        </div>
      )}
      <div ref={content} data-navigation-content="" hidden={phase === "terminal"}>
        {children}
      </div>
    </>
  );
}
