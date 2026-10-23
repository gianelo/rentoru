import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SubirFoto } from "./SubirFoto";

// Other consumers omit the presentation override, including imported drafts.
describe("SubirFoto — copia por defecto", () => {
  it.each([0, 6])("conserva el chooser y sus controles con %i fotos", (photoCount) => {
    const html = renderToStaticMarkup(
      <SubirFoto
        listingId="imported-draft"
        photoCount={photoCount}
        firmar={vi.fn()}
        adjuntar={vi.fn()}
        exito="Foto agregada."
      />,
    );
    const input = html.match(/<input\b[^>]*\btype="file"[^>]*>/)?.[0];
    const inputId = input?.match(/\bid="([^"]+)"/)?.[1];
    expect(input).toContain('accept="image/jpeg,image/png,image/webp"');
    expect(input?.includes('disabled=""')).toBe(photoCount === 6);
    expect(html).toMatch(new RegExp(`for="${inputId}"[^>]*>Subir fotos</label>`));
    expect(html).not.toContain("Elegir fotos");
    expect(html).toContain("<noscript>");
    expect(html).toContain(
      "Subir fotos necesita JavaScript: las comprimimos en tu teléfono antes de enviarlas, así consumes muchos menos datos.",
    );
  });
});
