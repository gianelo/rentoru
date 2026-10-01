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
  const track = useRef<HTMLUListElement>(null);
  const navigate = (target: number) => {
    setNumber(target);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      track.current?.children[target - 1]?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  };
  const syncScroll = () => {
    const element = track.current;
    if (!element || !window.matchMedia("(max-width: 1023px)").matches) return;
    const center = element.scrollLeft + element.clientWidth / 2;
    const items = [...element.children] as HTMLElement[];
    let nearest = 0;
    for (let i = 1; i < items.length; i++) {
      const candidate = items[i];
      const current = items[nearest];
      if (
        candidate &&
        current &&
        Math.abs(candidate.offsetLeft + candidate.offsetWidth / 2 - center) <
          Math.abs(current.offsetLeft + current.offsetWidth / 2 - center)
      )
        nearest = i;
    }
    setNumber(nearest + 1);
  };

  return (
    <div className={styles.navigation}>
      <ul
        className={styles.track}
        ref={track}
        onScrollEnd={syncScroll}
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
          // Native horizontal scroll owns the selection; desktop uses arrows.
        }}
      >
        {photos.map((photo, index) => {
          const position = photoNumberOf(index);
          const active = position === number;
          return (
            <li className={`${styles.item} ${active ? styles.active : ""}`} key={position}>
              <a
                className={styles.frame}
                data-testid={active ? "photo-hero" : undefined}
                href={photoViewerPath(href, position)}
                onClick={(event) => {
                  const native = event.nativeEvent;
                  const pointerType =
                    typeof PointerEvent !== "undefined" && native instanceof PointerEvent
                      ? native.pointerType
                      : undefined;
                  const firesTouchEvents = (
                    native as MouseEvent & { sourceCapabilities?: { firesTouchEvents: boolean } }
                  ).sourceCapabilities?.firesTouchEvents;
                  const knownMouseOrKeyboard =
                    pointerType === "mouse" ||
                    firesTouchEvents === false ||
                    (native.isTrusted && native.detail === 0);
                  if (suppressClick.current && !knownMouseOrKeyboard) event.preventDefault();
                  suppressClick.current = false;
                }}
              >
                <picture>
                  <source
                    media="(min-width: 768px)"
                    srcSet={photoUrl(base, active ? photo.detail : photo.thumb)}
                  />
                  <img
                    className={styles.image}
                    src={photoUrl(base, photo.strip)}
                    alt={photo.alt}
                    loading={position === 1 ? "eager" : "lazy"}
                  />
                </picture>
              </a>
            </li>
          );
        })}
      </ul>
      {photos.length > 1 ? (
        <nav className={styles.thumbnails} aria-label="Miniaturas de fotos de la ficha">
          {photos.map((photo, index) => {
            const position = photoNumberOf(index);
            return (
              <a
                className={styles.thumbnail}
                key={position}
                href={photoViewerPath(href, position)}
                aria-label={`Ver ${photo.alt}`}
                aria-current={mounted && position === number ? "true" : undefined}
              >
                {/* biome-ignore lint/performance/noImgElement: R2 serves the pre-sized thumbnail derivative. */}
                <img src={photoUrl(base, photo.thumb)} alt="" loading="lazy" />
              </a>
            );
          })}
        </nav>
      ) : null}
      {photos.length > 1 ? (
        <div
          className={styles.dots}
          role="status"
          aria-hidden={!mounted}
          aria-label={`Foto ${number} de ${photos.length}`}
        >
          {photos.map((photo, index) => (
            <span
              className={styles.dot}
              data-testid="photo-dot"
              data-selected={photoNumberOf(index) === number ? "true" : undefined}
              key={photo.strip}
            />
          ))}
        </div>
      ) : null}
      {mounted && photos.length > 1 ? (
        <div className={styles.controls}>
          <button
            className={styles.arrow}
            type="button"
            aria-label="Foto anterior"
            disabled={neighbours.previous === null}
            onClick={() => {
              if (neighbours.previous !== null) navigate(neighbours.previous);
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
              if (neighbours.next !== null) navigate(neighbours.next);
            }}
          >
            →
          </button>
        </div>
      ) : null}
    </div>
  );
}
