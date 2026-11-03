# Rentoru — design system (synced reference)

A read-only digest of the shipped design system, synced 2026-11-02 from the
sources listed below. **It is not a new authority.** It points at the files
that are. When this document and a source disagree, the source wins:
`design/reference/sistema/SISTEMA.md` is the system of record, and
`src/styles/tokens.css` holds the values production actually uses.

Every value below was copied from a source file. A value that no source
defines is marked **not defined**, not estimated. Token names and quoted rules
stay in Spanish, word for word.

Companion artboard: `design/system.html`. It renders these tokens and the core
components in both shipped themes.

## Sources

| Path | What it contributes |
|---|---|
| `src/styles/tokens.css` | Production tokens: `:root`, `[data-layout="compacto"]`, `[data-theme="menta"]`, `[data-theme="oscuro"]` |
| `design/reference/sistema/SISTEMA.md` | System of record: palette roles, type table, spacing scale, layout, button hierarchy, page background, footer, assets |
| `design/reference/sistema/tokens.css` | Reference library: 9 themes × 4 layouts (only `compacto`, `menta` and a redrawn `oscuro` ship) |
| `design/especificaciones/Rentoru - Publicar - Especificacion.md` | Publish flow: §6 validation messages, §7 mobile/desktop sizes, §8 colours/type/buttons, §9 cross-cutting rules |
| `src/styles/base.css` | Body baseline: `--page` background, `--sans`, sticky-footer column |
| `app/layout.tsx` | `<html lang="es" data-theme="menta" data-layout="compacto">`, no webfont |
| `components/atoms/Button.module.css`, `components/atoms/buttons.tsx` | The three button levels |
| `components/molecules/Field.module.css` | Generic form field |
| `app/publicar/publish-steps.module.css`, `app/publicar/FieldError.tsx` | Publish form shell, controls, choice cards, numeric rows, error |
| `components/organisms/Nav.module.css` | Navigation bar and mobile dock |
| `components/organisms/SiteFooter.module.css` | Site footer |

## Two axes

`data-theme` sets colour, corner radius and control fill. `data-layout` sets
row density, thumbnail geometry, price scale and title type. Both are set once
on `<html>` in `app/layout.tsx` (`data-theme="menta" data-layout="compacto"`).
Source: `src/styles/tokens.css` header, `SISTEMA.md` "Cambiar de estilo después".

- Production ships 3 of the reference's 13 sets: `compacto`, `menta` (the
  default light theme) and `oscuro` (dark). Source: `src/styles/tokens.css`.
- **No automatic dark mode.** No `prefers-color-scheme` rule repaints `menta`,
  and no theme toggle exists in v1. You reach `oscuro` only by setting
  `data-theme="oscuro"`. Source: `src/styles/tokens.css`.
- Production `oscuro` is **not** the reference `oscuro`. The founder redrew
  it from menta's palette on 2026-08-18. The reference file's `oscuro`
  (accent `#d8a13a`, radius `10px`) does not ship. Source: `src/styles/tokens.css`
  (`--dark-*` block), `design/reference/sistema/tokens.css`.
- Rule: "ningún componente escribe un hex, un radio, un tamaño de miniatura o un
  tamaño de precio literal". `pnpm lint:tokens` enforces it. Source: `SISTEMA.md`, `src/styles/tokens.css`.

## Colour

Source for every value: `src/styles/tokens.css`. Production `oscuro` reads
each colour from a `--dark-*` holder in `:root`, so the dark palette is
declared once. Usage text comes from `SISTEMA.md` "Color — paleta Menta"
unless another source is cited.

| Token | menta | oscuro | Usage |
|---|---|---|---|
| `--accent` | `#272343` | `#bae8e8` | Primary action fill, links |
| `--accent-ink` | `#ffffff` | `#272343` | Text on accent |
| `--surface` | `#ffffff` | `#272343` | Card and panel surface |
| `--page` | `#ffffff` | `#272343` (= `--dark-surface`) | Page background. Only `body` paints it (phase 41) |
| `--footer-bg` | `#f0f5f9` | `#1b1830` (= `--dark-bg`) | Site footer band (phase 41) |
| `--bg` | `#f0f5f9` | `#1b1830` | Block background and control fill |
| `--ctl` | `#f0f5f9` | `#332e52` | Field and input fill |
| `--line` | `#e1e4e6` | `#3b3663` | Separators, thumbnail borders |
| `--strong` | `#788189` | `#788e98` | Field border, secondary badge border, neutral button border |
| `--ink` | `#1e2022` | `#f0f5f9` | Main text, price |
| `--soft` | `#52616b` | `#9ba8b4` | Secondary text and metadata |
| `--tint` | `#e3f6f5` | `#332e52` | Selected state, contribution block |
| `--warn` | `#8a5a00` | `#e0b464` | "vence pronto" text, counter in deficit (publish) |
| `--warn-bg` | `#faf2e1` | `#2c2517` | "vence pronto" background |
| `--err` | `#9c2b20` | `#f0a39a` | Validation error, hidden state |
| `--err-bg` | `#fbecea` | `#43283a` | Error background |
| `--scrim` | `rgba(30, 32, 34, 0.55)` | `rgba(0, 0, 0, 0.66)` | Modal veil (sign-in door, filter panel). Source: `src/styles/tokens.css` |
| `--thumb` | `repeating-linear-gradient(135deg, #bae8e8 0 7px, #e3f6f5 7px 14px)` | `repeating-linear-gradient(135deg, #3b3663 0 7px, #332e52 7px 14px)` | Placeholder photo hatch |

Theme-independent colours, declared in `:root` on purpose. They do not change
with the theme. The photo viewer is the one screen whose content is the image.
Source: `src/styles/tokens.css`.

| Token | Value | Usage |
|---|---|---|
| `--viewer-bg` | `#131517` | Photo viewer background |
| `--viewer-ink` | `#f2f3f3` | Viewer text |
| `--viewer-soft` | `rgba(242, 243, 243, 0.62)` | Viewer secondary text |
| `--viewer-line` | `rgba(242, 243, 243, 0.24)` | Viewer lines |
| `--viewer-scrim` | `rgba(19, 21, 23, 0.72)` | Disc behind the viewer arrows |

Measured contrast recorded in the source: `--warn` on `--surface` is 5.93:1
(menta). `--dark-warn` on `--dark-surface` is 7.73:1. The `menta` scrim
separates the veiled background 3.98:1. Source: `src/styles/tokens.css`.

**Naming drift in the publish spec.** §8 lists `--rule: #788189` (production
name: `--strong`) and `--acc-ink: #FFFFFF` (production name: `--accent-ink`).
§8 also gives `--warn` the role "obligatorio". Production marks required
fields with `--err` (`components/molecules/Field.module.css` `.required`).
Source: `design/especificaciones/Rentoru - Publicar - Especificacion.md` §8.

## Typography

**Families.** No webfont, system stack only (`SISTEMA.md` "Sin webfonts",
`app/layout.tsx`). Source: `src/styles/tokens.css`.

| Token | Value |
|---|---|
| `--sans` | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| `--mono` | `ui-monospace, SFMono-Regular, Menlo, monospace` |
| `--disp` | `var(--mono)` under `compacto`: the display face for price and wordmark |
| `--meta` | `var(--mono)` under `compacto`: metadata, counts, step labels |

- Body baseline: `font-family: var(--sans); font-size: var(--fp); line-height: 1.55`.
  Source: `src/styles/base.css`.
- Spec rule: "`--mono` para precio, cifras, contadores, metadatos y rótulos en
  mayúsculas". Source: publish spec §8 "Tipografía".
- Card metadata **stays in `--sans`**. This is a recorded divergence from the
  board, which draws mono. Source: `SISTEMA.md` "Lo que queda abierto" point 6.

**Type scale.** Sizes per role, in px. "mobile / desktop" means the desktop
token applies from 768px up, except the hero, which also has a tablet step.
Source: `src/styles/tokens.css`. Roles come from `SISTEMA.md` "Tipografía".

| Role | Tokens | Size | Weight / line height |
|---|---|---|---|
| Empty-home hero | `--home-hero-fs`, `-tablet`, `-desktop` | 27 / 36 (≥768) / 46 (≥1100) | 700 / 1.17 (SISTEMA) |
| Listing-page price | `--ficha-price-fs`, `-desktop`, `--ficha-price-fw` | 30 / 34 | 700 / 1.1 (SISTEMA), `--mono` |
| Sign-in door title | `--door-title-fs`, `-desktop` | 22 / 28 | not defined in tokens |
| Page title | `--title-fs`, `--title-fw`, `--title-lh` | 20 | 700 / 1.25 |
| Listing title (ficha) | `--ficha-title-fs`, `-desktop`, `--ficha-title-fw` | 17 / 19 | 600 / 1.35 (SISTEMA) |
| Ficha stat / label | `--ficha-stat-fs`, `--ficha-stat-label-fs` | 17 / 10 | not defined |
| Card price | `--card-price-fs`, `-desktop` | 16 / 17 | 700 / 1.15, `--mono`, `tabular-nums` (SISTEMA) |
| Body | `--ficha-body-fs`, `-desktop`, `--ficha-body-lh`, `-desktop` | 15 / 16 | 400 / 1.6 → 1.65 |
| Secondary readable text | `--secondary-lh` | with `--meta-fs` or `--control-fs` | line height 1.6 |
| Form control | `--control-fs` | 15 | not defined |
| Row price | `--fp`, `--fpw` | 15 | 700 / 1.15 (`compacto`) |
| Row title weight | `--ftw` | n/a | 400 (`compacto`) |
| Card title | `--card-title-fs`, `-desktop` | 12.5 / 13 | 400 (`--ftw`) / 1.35 |
| Metadata | `--meta-fs`, `--meta-fw` | 12 | 600 / 1.4, colour `--soft` |
| Small metadata | `--meta-fs-sm` | 11 | step label, "4 de 6" counter |
| Badge / label | `--badge-fs`, `--badge-fw`, `--badge-ls` | 11 | 700 / 1.4, `.06em`, uppercase |
| Card metadata | `--card-meta-fs`, `-desktop`, `--card-meta-fw` | 10.5 / 11 | 400 / 1.4, `--sans` |
| Card photo counter | `--card-photocount-fs` | 10 | `--meta` |
| Strip subtitle | `--strip-subtitle-fs`, `-desktop` | 12.5 / 13 | not defined |
| Brand letter-spacing | `--brand-ls` | `-0.02em` | n/a |

Component-scoped type tokens, all in `src/styles/tokens.css`:

- **Nav:** `--nav-brand-fs` 17 / `-desktop` 19, `--nav-action-fs` 13.5,
  `--nav-avatar-fs` 13 / `-desktop` 11.5, `--nav-menu-item-fs` 15,
  `--nav-menu-name-fs` 14.5, `--nav-dock-label-fs` 12.
- **Search pill:** `--pill-text-fs` 13.5 / `-desktop` 14, `--pill-meta-fs` 10.5,
  `--pill-filter-fs` 12.5 / `-desktop` 13.
- **Footer:** `--footer-brand-fs` 18 / `-desktop` 19, `--footer-tagline-fs`
  13.5 / `-desktop` 13, `--footer-heading-fs` 10, `--footer-link-fs` 14.5 /
  `-desktop` 13.5, `--footer-legal-fs` 11.
- **Viewer:** `--viewer-title-fs` 14, `--viewer-price-fs` 20,
  `--viewer-meta-fs` 10, `--viewer-glyph-fs` 16.
- **Marks:** `--wait-mark-fs` 22, `--done-mark-fs` 22.

Retired on purpose. They are not shipped, and you should not reintroduce
them: `--fpb` (26, replaced by `--ficha-price-fs`), `--ft`/`--tclamp`
(replaced by `--card-title-fs`), `--searchbar-h`/`--searchbar-fs`. The
reference file still declares `--fpb`, `--ft` and `--tclamp`. Source:
`src/styles/tokens.css`, `SISTEMA.md`.

Publish spec §7 gives the publish heading as "24 px / 700" mobile and
"28 px / 700" desktop. Production draws `.title` with `--ficha-price-fs`
(30 / 34) and `--title-fw`. Source: publish spec §7,
`app/publicar/publish-steps.module.css`.

## Spacing

- Scale: "`4 · 8 · 12 · 16 · 24 · 32 · 48`. Nada fuera de esa escala." Source: `SISTEMA.md` "Espaciado".
  Shipped component CSS does use off-scale gaps and paddings, for example
  `6px`, `10px`, `14px`, `18px`, `20px` and `40px` in
  `app/publicar/publish-steps.module.css` and `SiteFooter.module.css`. The
  spacing scale has **no** custom properties. `lint:tokens` does not check gap
  or padding (`src/styles/tokens.css`, footer comment).

| Token | Value | Usage | Source |
|---|---|---|---|
| `--gap` | `8px` | Thumbnail-to-content gap. Gap inside `Field` | `src/styles/tokens.css` (`compacto`), `Field.module.css` |
| `--rowpad` | `7px 12px` | Result-row padding | `src/styles/tokens.css` (`compacto`) |
| `--card-gap` | `12px` | Grid card gap | `src/styles/tokens.css` |
| `--home-invite-outer-gap` / `-desktop` | `16px` / `24px` | Outer margin of the empty-home panel | `src/styles/tokens.css` |
| `--nav-dock-inset` / `--nav-dock-bottom` | `16px` / `12px` | Mobile dock offsets | `src/styles/tokens.css` |

## Corner radius

| Token | menta | oscuro | Usage | Source |
|---|---|---|---|---|
| `--r` | `12px` | `12px` (`--dark-r`) | Cards, fields, buttons, thumbnails, boxes | `src/styles/tokens.css`, `SISTEMA.md` |
| `--rs` | `999px` | `999px` (`--dark-rs`) | Badges, chips, pills | same |
| `--r-thumb` | `6px` | `6px` (`:root`) | Photo thumbnail in publish | `src/styles/tokens.css` |
| `--door-r` | `18px` | `18px` (`:root`) | Sign-in door sheet/dialog | `src/styles/tokens.css` |

## Shadows

| Token | menta | oscuro | Usage | Source |
|---|---|---|---|---|
| `--shadow-raised` | `0 2px 6px rgba(30, 32, 34, 0.1)` | `0 2px 6px rgba(0, 0, 0, 0.45)` | Raised surfaces: step-map sheet, mobile dock | `src/styles/tokens.css` |
| `--door-shadow` | `0 24px 64px rgba(30, 32, 34, 0.34)` | same (`:root`) | Door dialog, loading card | `src/styles/tokens.css`, `SISTEMA.md` |
| `--door-sheet-shadow` | `0 -8px 28px rgba(30, 32, 34, 0.16)` | same (`:root`) | Door bottom sheet | `src/styles/tokens.css` |

## Layout and control sizes

| Item | Value | Source |
|---|---|---|
| Breakpoints | `768px` (nav, buttons, fields, publish), `1100px` (footer three columns, nav container padding) | `Nav.module.css`, `Button.module.css`, `SiteFooter.module.css` |
| Container | `1100px` centred | `SISTEMA.md` "Layout de escritorio", `Nav.module.css`, `publish-steps.module.css` |
| Form column (system) | "Formularios: una sola columna de 600px" | `SISTEMA.md` |
| Publish form shell | `.layout` max `1100px`, padding `24px 16px 96px`. ≥768: grid `240px minmax(0, 1fr)`, gap `40px`, padding `32px 24px 64px`. `.column` max `520px` | `publish-steps.module.css`. Spec §7 also says "columna de 520 px" |
| "Publicar · Listo" column | `600px` centred from 768px | `SISTEMA.md` |
| Ficha (desktop) | photo `640px` + data column `420px`, sticky | `SISTEMA.md` |
| Sign-in door | `--door-w: 460px` | `src/styles/tokens.css` |
| Minimum target | `--target-min: 44px`, `--target-min-desktop: 44px` (founder, 2026-08-27, WCAG 2.2 SC 2.5.5) | `src/styles/tokens.css` |
| Action button height | `--action-h: 46px` | `src/styles/tokens.css` |
| Generic field control | `min-block-size: var(--target-min)` → `--target-min-desktop` ≥768 | `Field.module.css` |
| Publish control | `.control`, `.choice`, `.searchButton`, `.numberControl`, `.primary`: `56px`. ≥768: `52px` | `publish-steps.module.css` |
| Publish price control | `72px` high. ≥768: `68px` high, `280px` wide | `publish-steps.module.css`, spec §7 |
| Nav bar height | `--nav-h: 60px` / `--nav-h-desktop: 68px`. Search max `--nav-search-max: 420px` | `src/styles/tokens.css` |
| Brand bar (publish) | `--brandbar-h: 48px` / `--brandbar-h-desktop: 56px` | `src/styles/tokens.css` |
| Mobile dock | `--nav-dock-h: 64px`, action `--nav-dock-action-w: 96px` | `src/styles/tokens.css` |
| Result card | `--card-w` `158px` (2 columns) / `--card-w-desktop` `240px` (4 columns), `--card-photo-ratio: 4 / 3` | `src/styles/tokens.css`, `SISTEMA.md` |
| Thumbnails | `--tw`×`--th` `44×34`. `--twd`×`--thd` `64×48`. `--mis-avisos-thumb-w`×`-h` `74×56` | `src/styles/tokens.css` (`compacto`) |

Stale comment: `Button.module.css` still says "44px mobile / 36px desktop".
Both tokens are now `44px` (`src/styles/tokens.css`).

## Component rules

### Three-button hierarchy

Source: `SISTEMA.md` "Jerarquía de botones", `components/atoms/Button.module.css`,
`components/atoms/buttons.tsx`.

"Tres niveles, y no deben mezclarse". Each level is a separate export
(`ActionButton`, `SelectionButton`, `NeutralButton`, plus `ActionLink` for
level 1 as a link). No component takes a free-form `variant` prop.

| Level | Fill | Border | Text | Focus | Examples |
|---|---|---|---|---|---|
| 1. **Acción** | `--accent` | none | `--accent-ink` | `2px solid var(--accent)`, offset `2px` | Publicar, Continuar, Renovar, Crear |
| 2. **Selección / estado** | `--tint` | `1px solid var(--accent)` | `--accent` | `2px solid var(--accent)`, offset `2px` | Dueño/Inmobiliaria toggle, city, rooms, active chips |
| 3. **Neutro** | none | `1px solid var(--strong)` | `--ink` | `2px solid var(--strong)`, offset `2px` | Cancelar, Corregir archivo |

All three levels share one geometry (`.base`): inline-flex, centred, gap
`8px`, `min-height: var(--target-min)` (→ `--target-min-desktop` ≥768),
padding `8px 16px`, `border-radius: var(--r)`, `font: inherit`.

- Level 2 "Comunica estado, no invita a enviar." The shared selection chip is
  `components/atoms/SelectionChip.tsx`. Source: `SISTEMA.md`.
- Publish spec §8 adds a fourth row, **Inactivo**: "fondo `--line`, texto
  `--soft`", for "Seguir con validación sin cumplir". `SISTEMA.md` does not
  name it, and `Button.module.css` does not implement it.
- Rule: "**Nunca `opacity` para atenuar.** Todo pasa AA." Source: publish spec §8.

### Field anatomy

Sources: `components/molecules/Field.module.css`, `app/publicar/publish-steps.module.css`,
`app/publicar/FieldError.tsx`, publish spec §6 and §9.

Order inside a field: **label → control → error → help/counter**.

Founder decision, 2026-11-02, superseding the 2026-11-01 «arriba»: «es
mejor abajo… es abajo deberia de salir el error y unificar todo». Shipped
in task 44.8: publish steps, edit, import, `Field.tsx`, sign-in and the publish
contact field all use this order. In a radio group (`<fieldset>`) the message
goes after the last option, inside the fieldset.

1. **Error**, when present, goes directly under the control:
   `<p class="error" id="…-error">`. El mensaje dice qué hacer, no qué pasó.
   - The control carries `aria-invalid="true"` and `aria-describedby` set to
     the error id (`FieldError.tsx`).
   - The `✱` glyph belongs to the message copy, not to the component, for
     example "✱ Mínimo 120 caracteres. Vas 24." (spec §6).
   - Publish `.error`: `--err`, `--ficha-body-fs` (→ `-desktop` ≥768),
     margin `6px 0 0`. Field `.error`: `--err`, `--meta-fs`, line height 1.5.
2. **Label**. Publish `.label`: block, `--control-fs`, `--meta-fw`, margin
   below `6px`. Field `.label`: `--sans`, `--meta-fs`, weight 600, line height
   1.4, `--ink`.
   - Required: "se marca con el glifo `✱` **más la palabra "obligatorio"**,
     nunca solo con color" (`SISTEMA.md`, spec §9 rule 1). Field `.required`
     colour is `--err`, which only adds emphasis.
3. **Control**. Publish `.control`: full width, `56px` (→ `52px` ≥768),
   padding `0 14px`, `1px solid var(--strong)`, `--r`, background `--surface`,
   `--ink`, `--sans`, `--control-fs`. Field `.control`: `--target-min` height,
   padding `0 12px`, background `--ctl`, line height 1.55.
   - **Error state** `.controlInvalid`: `border: 2px solid var(--err)`.
   - **Focus**: `outline: 2px solid var(--accent); outline-offset: 2px` (Field).
   - Textarea: padding `12px 14px`, min `160px`, `--secondary-lh`, resize vertical (publish).
4. **Help / counter**. Publish `.help`: `--soft`, body pair. Field `.help`:
   `--soft`, `--meta-fs`, line height 1.5. `.counterLine`: `--meta`,
   `--meta-fs`, `--soft`, and `.counterShort` in `--warn` with `--meta-fw`.
   "Un mínimo se muestra como progreso, no como castigo" (spec §9 rule 4).

`SISTEMA.md` screen 3, "Validación", already says "debajo", which matches
the 2026-11-02 decision.

### Numeric rows (`.numbers`)

Source: `app/publicar/publish-steps.module.css`, `app/publicar/PublishStep.tsx`.

- `.numbers` is a column with gap `12px`. A row in error keeps its layout and
  its own message (`<name>-error`) goes directly under that row, before the
  next row (44.8); the input gets `aria-invalid` and `.controlInvalid`.
- Each `.numberRow` is flex, `align-items: center`,
  `justify-content: space-between`, gap `12px`: the label on the left, the
  input on the right.
- `.numberControl` is `.control` plus `120px` width, `56px` height (→ `52px`
  ≥768), centred text, `--disp`, `tabular-nums`. The input uses
  `inputmode="numeric"`.
- Rows: Habitaciones, Baños, Puestos de auto (0 allowed), Metros cuadrados.
  Spec §6: "Baños es obligatorio y puestos permite cero."

### Choice cards (radio / checkbox)

Source: `app/publicar/publish-steps.module.css`.

- `.choices` is a `<fieldset>` with no border, a column, gap `8px`.
- `.choice` is a `<label>` that wraps a native input: flex, gap `12px`, min
  `56px` (→ `52px` ≥768), padding `0 16px`, `1px solid var(--strong)`, `--r`,
  `--control-fs`, pointer cursor.
- Checked (`:has(input:checked)`): background `--tint`, border `--accent`,
  text `--accent`, weight `--meta-fw`. This is level 2 of the button hierarchy.
- Focus (`:has(input:focus-visible)`): `2px solid var(--accent)`, offset `2px`.
- `.choiceInput`: `20×20`, `accent-color: var(--accent)`.
- Rule: "el control real sigue siendo un radio/checkbox nativo".

### Row anatomy

The system requires "misma anatomía de fila" on derived screens (`SISTEMA.md`
overview). The original result row is no longer on the read path.

- **Result card** (read path): 4:3 cover, then publisher badge, price, title
  clamped to two lines, and metadata (`zona · N hab · N m²`). There is one
  link per card, and a `::after` stretches its touch area over the whole
  card. Photo counter "1 / N" sits at `right:9px;bottom:9px`. Source:
  `SISTEMA.md` screen 1.
- **Legacy row tokens**: `--rowpad`, `--gap`, `--tw`/`--th`. They still dress
  the measurement row and the publish photo uploader. Source: `SISTEMA.md`.
- **Mis publicaciones row**: the status is a coloured metadata line, not a
  badge. The `--warn` and `--err` states also tint the row box. A draft gets a
  dotted `--strong` border. Desktop grid is `120px 1fr 200px`. Source:
  `SISTEMA.md` screen 5.
- **Import error row**: `--err-bg` background, `3px` left border in `--err`.
  Error rows come first. Source: `SISTEMA.md` screen 6.
- **Publish rows**: `.photoRow` derives from `.choice` (same height, border
  and radius) but has no pointer cursor. `.reviewRow` is a grid
  `1fr auto` (≥768: `200px minmax(0, 1fr) auto`) with padding `14px 0` and
  bottom border `--line`. Source: `publish-steps.module.css`.
- **Publisher badge**: Dueño is filled `--ink` with `--surface` text. The
  agency badge has a `--strong` border, no fill, and `--soft` text. "El badge
  **no** usa el color de acento". The two must stay distinguishable in
  greyscale. Source: `SISTEMA.md` "Distinción dueño / inmobiliaria".

### Page background

Source: `SISTEMA.md` "Fondo de página", `src/styles/base.css`, `src/styles/tokens.css`.

"La página es blanca lisa (`--page`) en todas las pantallas, y la pinta una sola
vez `body`".

- Screens do not paint their own background. Blocks separate from the page
  with a `--line` border or a `--bg` fill.
- Exactly two exceptions: the photo viewer (`--viewer-bg`) and the site
  footer (`--footer-bg`).
- `--page` equals `--surface` in value but is a different role: "Una hoja que
  pinte la pantalla entera con `--surface` vuelve a ser dueña del fondo."
- Test: `tests/e2e/fondo-de-pagina.spec.ts`.

### Footer stuck to the bottom

Source: `SISTEMA.md` "El pie va pegado al fondo", `src/styles/base.css`,
`components/organisms/SiteFooter.module.css`.

1. "**Va después de todo el contenido.**"
2. "**Si el contenido es más corto que la pantalla, baja hasta el borde inferior.**"
   A screen never stretches itself (`min-block-size: 100dvh`) to push the
   footer out of view.

- Mechanism: `body` is a flex column with `min-block-size: 100dvh`, and
  `.footer` has `margin-block-start: auto`. The publish flow also has the
  footer. Only the photo viewer hides it. Test: `tests/e2e/pie-al-fondo.spec.ts`.
- Footer anatomy:
  - `.footer`: `--footer-bg`, top border `1px solid var(--line)`, `--ink`, `--sans`.
  - `.top`: column, gap `20px`, padding `24px 20px`.
  - Wordmark: "Rentoru", `--mono` 700, `--footer-brand-fs`, `--brand-ls`.
  - Tagline: `--soft`, line height 1.55.
  - Column heading: `--meta` 700, `--footer-heading-fs`, `0.05em`, uppercase, `--soft`.
  - Links: `--ink`, `--footer-link-fs`, at least `--target-min` high on
    mobile, with no accordion.
  - Legal strip: top border `--line`, `--meta`, `--footer-legal-fs`, line
    height 1.6, `--soft`.
  - At ≥1100: row layout, brand column `320px`, gap `40px`, padding `36px 26px`.

### Navigation bar

Source: `components/organisms/Nav.module.css`.

- Bar: `--surface` with a bottom border in `--line`, height `--nav-h` (→
  `--nav-h-desktop`).
- Brand: `--mono` 700, `--nav-brand-fs`, `--brand-ls`, `--ink`.
- Publish action: `--rs` pill, `--nav-action-fs` 600, `--accent` fill when
  signed out, otherwise outlined in `--strong`.
- Focus: `2px solid var(--accent)`.
- Below 768: when the bar has the search pill, a fixed dock appears (border
  `--strong`, `--r`, `--shadow-raised`).
- ≥768: grid `minmax(120px, 250px) minmax(0, 1fr) minmax(0, 250px)` inside `1100px`.

### Glyph policy (Assets)

Source: `SISTEMA.md` "Assets".

- There is no logotype. The brand is the word "Rentoru" in the system stack,
  "con mayúscula inicial y sin punto final".
- "**Glifos de texto por defecto.** `←`, `✓`, `✱`, `×`, `·` son caracteres, no imágenes".
- The closed set of inline SVGs is filter (three bars) and magnifying glass.
  The founder extended it on 2026-09-25 (28.6, option A) with four mobile-dock
  icons, used only below 768px: home, plus, sign-in and person. The Google
  disc is a brand exception and keeps its own colours. Conditions:
  - "En línea, nunca un paquete de iconos."
  - `aria-hidden="true"`, with the accessible label beside the icon.
  - `stroke="currentColor"` on the six interface icons.
  - "El conjunto de seis iconos de interfaz queda cerrado."
- `AGENTS.md` §2 still describes the set as "exactly two inline SVGs". It
  names `SISTEMA.md`'s Assets section as the authority, and that section now
  lists six interface icons plus Google.

## Not defined in the sources

- Spacing custom properties for the `4 · 8 · 12 · 16 · 24 · 32 · 48` scale. It exists only as prose.
- A disabled or "Inactivo" button style in production CSS. It appears only in spec §8.
- A focus-ring token. Focus is written per component as `2px solid var(--accent)`, offset `2px`.
- Line-height tokens for most roles. Only `--title-lh`, `--ficha-body-lh(-desktop)` and `--secondary-lh` exist. The rest are prose in `SISTEMA.md` or literals in component CSS.
- A font-weight token for the door title, the ficha stats and form controls.
- Motion tokens other than `--loading-duration` (`1.2s`). The dock transition `200ms ease` is a literal in `Nav.module.css`.
- Any design for the 768–1099px band. `SISTEMA.md` lists it as open (item 3).
