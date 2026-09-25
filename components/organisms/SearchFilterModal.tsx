"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useDismissLayer } from "../hooks/useDismissLayer";

type SearchFilterModalProps = {
  readonly children: ReactNode;
};

const PANEL_TRIGGER_SELECTOR = "[data-search-filter-trigger]";
const STEP_PARAM = "filtros";

export function SearchFilterModal({ children }: SearchFilterModalProps) {
  const [open, setOpen] = useState(true);
  const hostRef = useRef<HTMLDivElement>(null);
  const draftHrefRef = useRef<string | null>(null);
  const baseHrefRef = useRef<string | null>(null);
  const { triggerRef, panelRef } = useDismissLayer<HTMLAnchorElement, HTMLDivElement>(open, () => {
    setOpen(false);
  });

  useEffect(() => {
    triggerRef.current = document.querySelector<HTMLAnchorElement>(PANEL_TRIGGER_SELECTOR);
  }, [triggerRef]);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) trigger.setAttribute("data-filter-open", "");
    else trigger.removeAttribute("data-filter-open");
  }, [open, triggerRef]);

  const openStep = useCallback((step: string) => {
    const groups = hostRef.current?.querySelectorAll<HTMLElement>("section[id^='filtros-']") ?? [];
    for (const group of groups) {
      if (group.id === `filtros-${step}`) group.setAttribute("data-open", "");
      else group.removeAttribute("data-open");
    }
  }, []);

  const updateDraft = useCallback(
    (href: string) => {
      const base = new URL(baseHrefRef.current ?? window.location.href, window.location.href);
      const source = new URL(href, window.location.href);
      const draft = mergeDraftHref(draftHrefRef.current ?? base.href, source, base);
      const step = source.searchParams.get(STEP_PARAM);
      const confirm = hostRef.current?.querySelector<HTMLElement>("[data-search-filter-confirm]");
      draftHrefRef.current = withoutPanelState(draft.href);
      if (confirm instanceof HTMLAnchorElement) confirm.href = draftHrefRef.current;
      else if (confirm instanceof HTMLButtonElement) {
        confirm.dataset.draftHref = draftHrefRef.current;
      }
      if (step) openStep(step);
    },
    [openStep],
  );

  useEffect(() => {
    if (!open) return;
    const host = hostRef.current;
    if (!host) return;

    baseHrefRef.current = window.location.href;
    draftHrefRef.current = withoutPanelState(window.location.href);

    const applyNavigation = (href: string) => {
      window.history.pushState(null, "", href);
      setOpen(false);
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as Element;
      const confirmButton = target.closest(
        "button[data-search-filter-confirm]",
      ) as HTMLButtonElement | null;
      if (confirmButton && host.contains(confirmButton)) {
        const href = confirmButton.dataset.draftHref;
        if (href) {
          event.preventDefault();
          applyNavigation(href);
        }
        return;
      }

      const link = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!link || !host.contains(link)) return;

      if (link.dataset.searchFilterClose === "") {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (link.dataset.searchFilterClear === "") {
        event.preventDefault();
        applyNavigation(withoutPanelState(link.href));
        return;
      }

      if (link.dataset.searchFilterConfirm === "") {
        event.preventDefault();
        applyNavigation(link.href);
        return;
      }

      const panel = host.querySelector('[data-testid="search-panel"]');
      if (!panel?.contains(link)) return;

      event.preventDefault();
      updateDraft(link.href);
    };

    const onSubmit = (event: SubmitEvent) => {
      const form = (event.target as Element).closest("form") as HTMLFormElement | null;
      if (!form || !host.contains(form)) return;

      event.preventDefault();
      const url = new URL(form.action, window.location.href);
      const formData = new FormData(form);
      for (const [name, value] of formData.entries()) {
        const text = String(value);
        if (text !== "") url.searchParams.set(name, text);
      }
      const submitter = event.submitter as HTMLElement | null;
      if (submitter?.dataset.searchFilterConfirm === "")
        applyNavigation(withoutPanelState(url.href));
      else updateDraft(url.href);
    };

    host.addEventListener("click", onClick);
    host.addEventListener("submit", onSubmit);
    return () => {
      host.removeEventListener("click", onClick);
      host.removeEventListener("submit", onSubmit);
    };
  }, [open, updateDraft]);

  if (!open) return null;

  return <div ref={mergeRefs(hostRef, panelRef)}>{children}</div>;
}

function mergeDraftHref(currentDraftHref: string, source: URL, base: URL): URL {
  const draft = new URL(currentDraftHref, window.location.href);
  const changedNames = new Set([...base.searchParams.keys(), ...source.searchParams.keys()]);

  for (const name of changedNames) {
    const baseValues = base.searchParams.getAll(name);
    const sourceValues = source.searchParams.getAll(name);
    if (sameValues(baseValues, sourceValues)) continue;

    const nextValues = sameValues(draft.searchParams.getAll(name), sourceValues)
      ? baseValues
      : sourceValues;
    setSearchParamValues(draft, name, nextValues);
  }

  return draft;
}

function setSearchParamValues(url: URL, name: string, values: readonly string[]) {
  url.searchParams.delete(name);
  for (const value of values) url.searchParams.append(name, value);
}

function sameValues(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function withoutPanelState(href: string): string {
  const url = new URL(href, window.location.href);
  url.searchParams.delete(STEP_PARAM);
  const search = url.searchParams.toString();
  return `${url.pathname}${search === "" ? "" : `?${search}`}${url.hash}`;
}

function mergeRefs<T>(...refs: readonly React.RefObject<T | null>[]) {
  return (node: T | null) => {
    for (const ref of refs) ref.current = node;
  };
}
