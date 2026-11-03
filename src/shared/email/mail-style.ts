/**
 * Los valores del sistema que usa el correo, ya resueltos (38.2). Un cliente
 * de correo no entiende `var(--ink)`: llegan escritos, en estilos en línea.
 * No son valores nuevos: `mail-style.test.ts` compara cada uno con su token de
 * `src/styles/tokens.css` (tema `menta`, estructura `compacto`).
 *
 * Sin `<style>` no hay `@media`, así que el correo usa los valores móviles de
 * la lámina v1 (`correo-v1.css`) también en escritorio: el móvil es el caso
 * que más importa y la tarjeta igual se limita a 600 px.
 */
export const MAIL_STYLE = {
  ink: "#1e2022",
  soft: "#52616b",
  accent: "#272343",
  accentInk: "#ffffff",
  surface: "#ffffff",
  page: "#ffffff",
  bg: "#f0f5f9",
  line: "#e1e4e6",
  warn: "#8a5a00",
  warnBg: "#faf2e1",
  radius: "12px",
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  bodyFs: "15px",
  bodyLh: "1.6",
  titleFs: "20px",
  titleFw: "700",
  titleLh: "1.25",
  brandFs: "16px",
  brandLs: "-0.02em",
  brandbarH: "48px",
  metaFs: "12px",
  metaFw: "600",
  secondaryLh: "1.6",
  factFs: "17px",
  factFw: "600",
  actionH: "46px",
} as const;
