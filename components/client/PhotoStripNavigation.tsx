"use client";

import { useEffect, useRef, useState } from "react";
import { photoUrl } from "@/modules/listing-discovery/domain/listing-photo-view";
import {
  photoNeighbours,
  photoNumberOf,
  photoViewerPath,
} from "@/modules/listing-discovery/domain/photo-viewer";
import styles from "../molecules/PhotoStrip.module.css";

export interface NavigationPhoto {
  readonly strip: string;
  readonly detail: string;
  readonly thumb: string;
  readonly alt: string;
}

export function PhotoStripNavigation({
  photos,
  base,
  href,
}: {
  readonly photos: readonly NavigationPhoto[];
  readonly base: string;
  readonly href: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [number, setNumber] = useState(1);
  const start = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => setMounted(true), []);
  const neighbours = photoNeighbours(number, photos.length);
  const selected = photos[number - 1];
  if (!selected) return null;

  return (
    <div className={styles.navigation}>
      <ul className={styles.track}>
        <li className={styles.item}>
          <a
            className={styles.frame}
            data-testid="photo-hero"
            href={photoViewerPath(href, number)}
            onClick={(event) => {
              const native = event.nativeEvent;
              const pointerType =
                typeof PointerEvent !== "undefined" && native instanceof PointerEvent
                  ? native.pointerType
                  : undefined;
              const firesTouchEvents = (
                native as MouseEvent & {
                  sourceCapabilities?: { firesTouchEvents: boolean };
                }
              ).sourceCapabilities?.firesTouchEvents;
              const knownMouseOrKeyboard =
                pointerType === "mouse" ||
                firesTouchEvents === false ||
                (native.isTrusted && native.detail === 0);
              if (suppressClick.current && !knownMouseOrKeyboard) event.preventDefault();
              suppressClick.current = false;
            }}
            onTouchStart={(event) => {
              const touch = event.touches[0];
              if (touch) start.current = { x: touch.clientX, y: touch.clientY };
              suppressClick.current = false;
            }}
            onTouchEnd={(event) => {
              const touch = event.changedTouches[0];
              const origin = start.current;
              start.current = null;
              if (!origin || !touch) return;
              const dx = touch.clientX - origin.x;
              const dy = touch.clientY - origin.y;
              if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
              suppressClick.current = true;
              const target = dx < 0 ? neighbours.next : neighbours.previous;
              if (target !== null) setNumber(target);
            }}
          >
            <picture>
              <source media="(min-width: 768px)" srcSet={photoUrl(base, selected.detail)} />
              <img
                className={styles.image}
                src={photoUrl(base, selected.strip)}
                alt={selected.alt}
                loading="eager"
              />
            </picture>
          </a>
        </li>
        {photos
          .map((photo, index) => ({ photo, originalNumber: photoNumberOf(index) }))
          .filter(({ originalNumber }) => originalNumber !== number)
          .map(({ photo, originalNumber }) => (
            <li className={styles.item} key={originalNumber}>
              <a className={styles.frame} href={photoViewerPath(href, originalNumber)}>
                <picture>
                  <source media="(min-width: 768px)" srcSet={photoUrl(base, photo.thumb)} />
                  <img
                    className={styles.image}
                    src={photoUrl(base, photo.strip)}
                    alt={photo.alt}
                    loading="lazy"
                  />
                </picture>
              </a>
            </li>
          ))}
      </ul>
      {mounted && photos.length > 1 ? (
        <div className={styles.controls}>
          <button
            className={styles.arrow}
            type="button"
            aria-label="Foto anterior"
            disabled={neighbours.previous === null}
            onClick={() => {
              if (neighbours.previous !== null) setNumber(neighbours.previous);
            }}
          >
            ←
          </button>
          <button
            className={styles.arrow}
            type="button"
            aria-label="Foto siguiente"
            disabled={neighbours.next === null}
            onClick={() => {
              if (neighbours.next !== null) setNumber(neighbours.next);
            }}
          >
            →
          </button>
        </div>
      ) : null}
    </div>
  );
}
