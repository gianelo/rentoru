import { test as base, expect } from "@playwright/test";
import {
  preventPublicationIntersectionPrefetch,
  publicationTransport,
  withPublicationEntry,
} from "../fixtures/publication-entry";

const heading = "¿Qué vas a alquilar?";
const destination = "/publicar/paso/tipo";
const test = base.extend<{ publicationEntry: { origin: string; verify: () => Promise<void> } }>({
  publicationEntry: async ({ context, baseURL }, use) => {
    if (!baseURL) throw new Error("Publication baseline requires explicit local baseURL");
    await withPublicationEntry({ origin: baseURL }, async (lease) => {
      await context.addCookies([
        {
          name: "authjs.session-token",
          value: lease.token,
          url: lease.origin,
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ]);
      // Prove the real cookie/adapter path, not an injected browser response.
      const session = await context.request.get(`${lease.origin}/api/auth/session`);
      expect(session.status()).toBe(200);
      expect((await session.json()).user.email).toBe("e2e-owner@rentas.invalid");
      await lease.verify();
      console.log(JSON.stringify({ publicTableCounts: lease.counts, syntheticSessionDelta: 1 }));
      await use({ origin: lease.origin, verify: lease.verify });
    });
  },
});

// Full-table preservation assertions require an exclusive owned database window.
// Projects must run sequentially (--workers=1); no other database suites alongside.
test.describe.configure({ mode: "serial" });

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  test(`36.3: real home → publication → initial destination at ${viewport.width}×${viewport.height}`, async ({
    page,
    publicationEntry,
    javaScriptEnabled,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const posts: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST") posts.push(new URL(request.url()).pathname);
    });
    let activated = false;
    const transport: (ReturnType<typeof publicationTransport> & { afterActivation: boolean })[] =
      [];
    const responses: { pathname: string; status: number; contentType: string | null }[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (
        url.origin === publicationEntry.origin &&
        ["/publicar", destination].includes(url.pathname)
      ) {
        transport.push({ ...publicationTransport(request), afterActivation: activated });
      }
    });
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (
        url.origin === publicationEntry.origin &&
        ["/publicar", destination].includes(url.pathname)
      ) {
        responses.push({
          pathname: url.pathname,
          status: response.status(),
          contentType: response.headers()["content-type"] ?? null,
        });
      }
    });
    if (javaScriptEnabled) {
      await page.addInitScript(preventPublicationIntersectionPrefetch);
    }
    try {
      await page.goto("/");
      if (javaScriptEnabled) {
        // Public widget behavior establishes readiness, but does not prove Link
        // hydration. The transport assertions below independently prove that.
        const search = page.locator('header input[type="search"]:visible');
        await expect(search).toHaveCount(1);
        await search.fill("Maracaibo");
        const suggestions = page.getByRole("list", { name: "Sugerencias" });
        await expect(suggestions).toBeVisible();
        await expect(suggestions.getByRole("link", { name: /^Maracaibo\b/ })).toHaveAttribute(
          "href",
          /maracaibo/,
        );
        await search.press("Escape");
        await expect(suggestions).toBeHidden();
        await expect(search).toHaveValue("Maracaibo");
        await search.fill("");
        await expect(search).toHaveValue("");
        await expect(page).toHaveURL(`${publicationEntry.origin}/`);
      }
      const publish = page.locator('a[href="/publicar"]:visible');
      await expect(publish).toHaveCount(1);
      await expect(publish).toHaveAccessibleName(/Publicar/);
      await publish.focus();
      await expect(publish).toBeFocused();
      expect(transport.filter((request) => !request.afterActivation)).toEqual([]);
      const entryResponse = page.waitForResponse(
        (response) =>
          activated &&
          new URL(response.url()).pathname === "/publicar" &&
          response.request().method() === "GET",
      );
      const finalResponse = page.waitForResponse(
        (response) =>
          activated &&
          new URL(response.url()).pathname === destination &&
          response.status() === 200,
      );
      activated = true;
      // Trusted keyboard activation avoids the independent hover-prefetch path.
      await publish.press("Enter");
      const [entry, final] = await Promise.all([entryResponse, finalResponse]);
      expect(entry.status()).toBeLessThan(400);
      if (javaScriptEnabled) {
        const entryEvidence = publicationTransport(entry.request());
        expect(entryEvidence).toMatchObject({
          pathname: "/publicar",
          method: "GET",
          resourceType: "fetch",
          navigation: false,
          rsc: "1",
          prefetch: false,
        });
        expect(publicationTransport(final.request())).toMatchObject({
          method: "GET",
          resourceType: "fetch",
          navigation: false,
          rsc: "1",
          prefetch: false,
        });
        expect(final.headers()["content-type"]).toContain("text/x-component");
        // A real inline HTTP redirect follow is legitimate here. Separate held
        // destination + 10s UI acceptance belongs to the activation unit's own
        // Suspense boundary; no gate is called in this unchanged-product baseline.
      } else {
        expect(publicationTransport(entry.request())).toMatchObject({
          method: "GET",
          resourceType: "document",
          navigation: true,
        });
        expect(final.headers()["content-type"]).toContain("text/html");
      }
      await expect(page).toHaveURL(`${publicationEntry.origin}${destination}`);
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      expect(posts).toEqual([]);
      if (javaScriptEnabled) {
        expect(
          transport.filter((request) => request.afterActivation && request.navigation),
        ).toEqual([]);
      }
      await publicationEntry.verify();
    } finally {
      await testInfo.attach("actual-entry-transport", {
        body: JSON.stringify({ transport, responses, javaScriptEnabled, posts }),
        contentType: "application/json",
      });
    }
  });
}

test("36.3: direct documentary GET retains the native authenticated redirect without writes", async ({
  page,
  publicationEntry,
}) => {
  const methods: string[] = [];
  page.on("request", (request) => methods.push(request.method()));
  const response = await page.goto("/publicar");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(`${publicationEntry.origin}${destination}`);
  await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  expect(methods).not.toContain("POST");
  await publicationEntry.verify();
});
