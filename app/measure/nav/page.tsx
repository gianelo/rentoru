import { notFound } from "next/navigation";
import type { NavAccount } from "@/modules/identity/domain/nav-account";
import { resolveSearchPill } from "@/modules/listing-catalogue/domain/search-pill";
import { Nav } from "../../../components/organisms/Nav";

// Arnés aislado: componentes productivos, sin acciones de publicación, sesión
// ni base. El flag estricto mantiene esta ruta cerrada en un despliegue real.
export default function MeasureNavPage() {
  if (process.env.MEASURE_HARNESS_ENABLED !== "true") notFound();

  const anonymous: NavAccount = { kind: "anonymous" };
  const authenticated: NavAccount = {
    kind: "authenticated",
    displayName: "María Fernández",
    email: "maria@example.com",
    initials: "MF",
    imageUrl: null,
    canImportListings: false,
    hasListings: true,
  };
  return (
    <>
      {(["anonymous", "authenticated", "zone", "filters", "mobile-only", "no-pill"] as const).map(
        (variant) => (
          <section key={variant} data-testid={`nav-${variant}`}>
            <Nav
              account={variant === "authenticated" ? authenticated : anonymous}
              publish={{
                bar: {
                  label: variant === "authenticated" ? "Publicar" : "Publicar gratis",
                  emphasis: "accent",
                },
                menu: null,
              }}
              signInHref="/signin"
              pillDisplay={variant === "mobile-only" ? "mobile-only" : "all"}
              pill={
                variant === "no-pill"
                  ? undefined
                  : {
                      action: "/measure/nav",
                      name: "q",
                      value: variant === "zone" || variant === "filters" ? "Chacao" : "",
                      placeholder: "¿En qué zona buscás?",
                      submitLabel: "Buscar",
                      state: resolveSearchPill({
                        zoneLabel: variant === "zone" || variant === "filters" ? "Chacao" : null,
                        resultCount: 12,
                        filterCount: variant === "filters" ? 3 : 0,
                      }),
                      filtersHref: "/measure/nav?panel=filtros",
                      suggestions:
                        variant === "anonymous"
                          ? {
                              cities: [{ id: "dc", name: "Distrito Capital" }],
                              zones: [
                                {
                                  id: "chacao",
                                  name: "Chacao",
                                  cityId: "dc",
                                  parentName: null,
                                  count: 12,
                                },
                              ],
                              aliases: [],
                            }
                          : undefined,
                    }
              }
            />
          </section>
        ),
      )}
    </>
  );
}
