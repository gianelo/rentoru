"use client";

import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import {
  type PublicationZoneSelection,
  publicationZoneSelection,
} from "../../src/modules/listing-publication/domain/publication-zone-selection";
import type { PublicationZoneOption } from "../../src/modules/listing-publication/domain/zone-search";
import {
  PublicationZoneResultControls,
  PublicationZoneSearchControl,
} from "./PublicationZoneControls";

interface ZoneProps {
  readonly children: ReactNode;
  readonly enabled: boolean;
  readonly results: readonly PublicationZoneOption[];
  readonly selected: PublicationZoneSelection | null;
}
interface ZoneInteraction {
  readonly results: readonly PublicationZoneOption[];
  readonly selected: PublicationZoneSelection | null;
  readonly search: (query: string) => void;
  readonly select: (option: PublicationZoneSelection) => void;
}
const ZoneContext = createContext<ZoneInteraction | null>(null);

/** Sin elemento DOM: el GET y el POST siguen siendo hermanos. */
export function PublicationZoneEnhancement(props: ZoneProps) {
  return props.enabled ? <ZoneInteractionProvider {...props} /> : props.children;
}

function ZoneInteractionProvider(props: ZoneProps) {
  const [results, setResults] = useState(props.results);
  const [selected, select] = useState(props.selected);
  const version = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function invalidate() {
    version.current += 1;
    pending.current?.abort();
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }
  useEffect(
    () => () => {
      // También invalida respuestas de transportes que no respeten abort.
      version.current += 1;
      pending.current?.abort();
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  function search(query: string) {
    // No esperar al debounce de B para invalidar A.
    invalidate();
    const requestVersion = version.current;
    if (query === "") {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      const controller = new AbortController();
      pending.current = controller;
      try {
        const response = await fetch(`/publicar/zonas?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("zone-search-response");
        const options: unknown = await response.json();
        if (!Array.isArray(options)) throw new Error("zone-search-payload");
        if (version.current === requestVersion) setResults(options);
      } catch {
        if (version.current === requestVersion) setResults([]);
      }
    }, 250);
  }
  return (
    <ZoneContext.Provider value={{ results, selected, search, select }}>
      {props.children}
    </ZoneContext.Provider>
  );
}

export function PublicationZoneSearch({
  query,
  action,
}: {
  readonly query?: string;
  readonly action?: string;
}) {
  const interaction = useContext(ZoneContext);
  return (
    <PublicationZoneSearchControl
      query={query}
      action={action}
      onChange={interaction ? (event) => interaction.search(event.currentTarget.value) : undefined}
    />
  );
}

export function PublicationZoneResults({
  results,
  selected,
}: {
  readonly results: readonly PublicationZoneOption[];
  readonly selected: PublicationZoneSelection | null;
}) {
  const interaction = useContext(ZoneContext);
  const current = interaction?.selected ?? selected;
  const view = publicationZoneSelection(interaction?.results ?? results, current);
  return (
    <PublicationZoneResultControls
      {...view}
      selectedId={current?.zoneId}
      onSelect={interaction?.select}
    />
  );
}
