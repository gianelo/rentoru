import { test as base, expect, type Page, type TestInfo } from "@playwright/test";
import {
  holdPublicationDestination,
  preventPublicationIntersectionPrefetch,
  publicationTransport,
  withPublicationEntry,
} from "../fixtures/publication-entry";
import { publicationEntryDiagnostics } from "../fixtures/publication-entry-diagnostics";

async function verifyHotEntry(coldPage: Page, origin: string) {
  // A separate page has the native IntersectionObserver, not the cold-entry
  // selective suppression. Register before loading so genuine viewport
  // prefetch cannot race the evidence collector.
  const page = await coldPage.context().newPage();
  const diagnostic = publicationEntryDiagnostics(page, origin);
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(new URL(request.url()).pathname);
  });
  try {
    const prefetch = page.waitForResponse((response) => {
      const evidence = publicationTransport(response.request());
      return evidence.pathname === "/publicar" && evidence.prefetch && evidence.rsc === "1";
    });
    diagnostic.milestone("beforehome");
    await page.goto(origin);
    const cached = await prefetch;
    diagnostic.milestone("prefetchheaders");
    expect(cached.status()).toBe(200);
    // Dynamic Flight prefetch can remain streaming at its Suspense shell;
    // the real response already proves prefetch, not a completed body cache.
    const evidence = publicationTransport(cached.request());
    expect(evidence).toMatchObject({ resourceType: "fetch", navigation: false, prefetch: true });
    const publish = page.locator('a[href="/publicar"]:visible');
    await publish.focus();
    diagnostic.milestone("activation");
    await publish.press("Enter");
    await expect(page).toHaveURL(`${origin}/publicar/paso/tipo`);
    await expect(
      page.getByRole("heading", { name: "¿Qué vas a alquilar?", exact: true }),
    ).toBeVisible();
    expect(posts).toEqual([]);
    console.log(JSON.stringify({ genuineHotPrefetch: evidence, destinationReady: true }));
    diagnostic.milestone("destinationready");
  } catch (error) {
    await diagnostic.failure(error);
  } finally {
    diagnostic.dispose();
    await page.close();
  }
}

async function verifyEntryDeadline(page: Page, origin: string, testInfo: TestInfo) {
  await page.goto("/");
  const search = page.locator('header input[type="search"]:visible');
  await search.fill("Maracaibo");
  await expect(page.getByRole("list", { name: "Sugerencias" })).toBeVisible();
  await search.press("Escape");
  await search.fill("");
  const gate = await holdPublicationDestination(page, origin);
  const recoveries: string[] = [];
  const cdp = await page.context().newCDPSession(page);
  const events: { phase: string; contextId: number; [key: string]: unknown }[] = [];
  let contextId = 0;
  let recoveryRequestId: string | undefined;
  let replacementReleased = false;
  let lifecycleFailure: string | undefined;
  const bounded = async <T>(promise: Promise<T>, phase: string, timeout = 4_000): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Missing phase: ${phase}`)), timeout);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  };
  const record = (event: (typeof events)[number]) => {
    events.push(event);
    console.log(JSON.stringify({ oldDocumentEvidence: event }));
  };
  cdp.on("Runtime.executionContextCreated", ({ context }) => {
    if (context.auxData?.isDefault && !contextId) contextId = context.id;
  });
  cdp.on("Runtime.executionContextDestroyed", (event) => {
    if (event.executionContextId === contextId && !replacementReleased) {
      lifecycleFailure = "original context destroyed before recovery release";
      record({ phase: "context-destroyed", contextId });
    }
  });
  cdp.on("Runtime.executionContextsCleared", () => {
    if (!replacementReleased) {
      lifecycleFailure = "original contexts cleared before recovery release";
      record({ phase: "contexts-cleared", contextId });
    }
  });
  cdp.on("Runtime.bindingCalled", (event) => {
    if (event.name !== "publicationEntryEvidence" || event.executionContextId !== contextId) return;
    const evidence = JSON.parse(event.payload);
    record({ ...evidence, contextId: event.executionContextId });
    if (evidence.phase === "pagehide" && !replacementReleased)
      lifecycleFailure = "original pagehide before recovery release";
  });
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  const { frameTree } = await cdp.send("Page.getFrameTree");
  expect(contextId).toBeGreaterThan(0);
  record({
    phase: "original-document",
    contextId,
    loaderId: frameTree.frame.loaderId,
    frameId: frameTree.frame.id,
  });
  await cdp.send("Runtime.addBinding", {
    name: "publicationEntryEvidence",
    executionContextId: contextId,
  });
  const armed = await cdp.send("Runtime.evaluate", {
    contextId,
    expression: `(() => {
      const emit = value => window.publicationEntryEvidence(JSON.stringify(value));
      let scope, shield, clicked = false, frameScheduled = false, previous = '', count = 0;
      const observe = (painted = false) => {
        scope ||= document.querySelector('[data-navigation-content]');
        const currentShield = document.querySelector('[data-navigation-terminal]');
        shield ||= currentShield;
        if (!shield) return;
        const status = shield.querySelector('[role=status]');
        const rect = status?.getBoundingClientRect();
        const late = [...document.querySelectorAll('h1')].find(node => node.textContent === '¿Qué vas a alquilar?');
        const background = [...document.body.children].filter(node => node !== shield && node instanceof HTMLElement);
        const evidence = {
          phase: scope && !scope.isConnected ? (painted === true ? 'unmounted-painted' : 'unmounted') : late ? 'late-dom' : 'terminal',
          shieldConnected: shield.isConnected,
          sameShield: currentShield === shield,
          geometry: rect ? {width: rect.width, height: rect.height} : null,
          statusLabel: status?.textContent === 'Cargando publicación…',
          backgroundHiddenInert: background.every(node => node.hidden && node.inert),
          backgroundRenderHidden: background.every(node => getComputedStyle(node).display === 'none' && node.getClientRects().length === 0),
          backgroundStyles: background.map(node => ({tag:node.tagName, className:node.className, hidden:node.hidden, inert:node.inert, display:getComputedStyle(node).display, rects:node.getClientRects().length})),
          lateRenderHidden: Boolean(late && late.getClientRects().length === 0),
          dockRenderHidden: [...document.querySelectorAll('nav')].every(node => node.getClientRects().length === 0),
          focusKind: shield.contains(document.activeElement) ? 'shield' : 'background',
          lateHeading: Boolean(late),
          lateHidden: Boolean(late?.closest('[hidden]')),
          originalScopeDisconnected: Boolean(scope && !scope.isConnected)
        };
        const serialized = JSON.stringify(evidence);
        if (serialized !== previous && count++ < 40) { previous = serialized; emit(evidence); }
        if (scope && !scope.isConnected && evidence.backgroundHiddenInert && !frameScheduled) {
          frameScheduled = true;
          requestAnimationFrame(() => requestAnimationFrame(() => observe(true)));
        }
        if (late && evidence.lateHidden && evidence.sameShield && evidence.backgroundHiddenInert && !clicked) {
          const help = document.querySelector('footer a[href="/ayuda/como-publicar-un-aviso"]');
          if (help instanceof HTMLElement) {
            clicked = true;
            emit({phase:'help-click', shieldConnected:shield.isConnected});
            help.click();
          }
        }
      };
      const observer = new MutationObserver(observe);
      observer.observe(document.body, {childList:true, subtree:true, attributes:true});
      window.addEventListener('pagehide', () => { emit({phase:'pagehide'}); observer.disconnect(); }, {once:true});
      observe();
      return true;
    })()`,
    returnByValue: true,
  });
  expect(armed.exceptionDetails).toBeUndefined();
  expect(armed.result.value).toBe(true);
  const helpTransport = (request: Parameters<typeof publicationTransport>[0]) => {
    const evidence = publicationTransport(request);
    if (
      evidence.pathname === "/ayuda/como-publicar-un-aviso" &&
      evidence.method === "GET" &&
      evidence.resourceType === "fetch" &&
      evidence.rsc === "1" &&
      !evidence.navigation &&
      !evidence.prefetch
    )
      record({ phase: "help-transport", contextId, ...evidence });
  };
  page.on("request", helpTransport);
  await cdp.send("Fetch.enable", {
    patterns: [{ urlPattern: `${origin}/publicar/error-de-carga*`, requestStage: "Response" }],
  });
  cdp.on("Fetch.requestPaused", (event) => {
    if (new URL(event.request.url).pathname !== "/publicar/error-de-carga") return;
    recoveryRequestId = event.requestId;
    recoveries.push(new URL(event.request.url).pathname);
    record({
      phase: "recovery-held",
      contextId,
      method: event.request.method,
      resourceType: event.resourceType,
    });
  });
  const waitForPhase = async (
    phase: string,
    complete: (event: (typeof events)[number]) => boolean = () => true,
  ) => {
    const matches = (event: (typeof events)[number]) => event.phase === phase && complete(event);
    await expect
      .poll(
        () => {
          if (lifecycleFailure) throw new Error(lifecycleFailure);
          return events.some(matches);
        },
        { timeout: 4_000, message: `Missing old-document phase: ${phase}` },
      )
      .toBe(true);
    const event = events.find(matches);
    if (!event) throw new Error(`Missing old-document phase: ${phase}`);
    return event;
  };
  try {
    const started = Date.now();
    const publish = page.locator('a[href="/publicar"]:visible');
    await publish.focus();
    await publish.press("Enter");
    expect(await gate.held).toMatchObject({ rsc: "1", prefetch: false, navigation: false });
    const exit = page.getByRole("link", { name: "Volver al inicio", exact: true });
    await expect(exit).toBeFocused();
    await expect(page.getByRole("status")).toHaveText("Cargando publicación…");
    expect(
      await exit.evaluate((element) => element.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(44);
    await exit.press("Tab");
    await expect(exit).toBeFocused();
    await expect
      .poll(() => Date.now() - started, { timeout: 10_000 })
      .toBeGreaterThanOrEqual(9_000);
    expect(recoveries).toEqual([]);
    await expect(exit).toBeVisible();
    const recovery = await waitForPhase("recovery-held");
    expect(recovery).toMatchObject({ method: "GET", resourceType: "Document" });
    await waitForPhase("terminal");
    const elapsed = Date.now() - started;
    expect(elapsed).toBeGreaterThanOrEqual(10_000);
    console.log(
      JSON.stringify({ heldNativeRecovery: recoveries, elapsedToNativeRecoveryMs: elapsed }),
    );
    expect(recoveries).toEqual(["/publicar/error-de-carga"]);
    const screenshot = await bounded(
      cdp.send("Page.captureScreenshot", { format: "png" }),
      "terminal screenshot",
    );
    await testInfo.attach("old-document-terminal", {
      body: Buffer.from(screenshot.data, "base64"),
      contentType: "image/png",
    });
    const final = page.waitForResponse(
      (response) => {
        const evidence = publicationTransport(response.request());
        return (
          evidence.pathname === "/publicar/paso/tipo" &&
          evidence.method === "GET" &&
          evidence.resourceType === "fetch" &&
          !evidence.navigation &&
          evidence.rsc === "1" &&
          !evidence.prefetch &&
          response.status() === 200
        );
      },
      { timeout: 4_000 },
    );
    await gate.release();
    const response = await final;
    expect(response.headers()["content-type"]).toContain("text/x-component");
    record({
      phase: "destination-response",
      contextId,
      ...publicationTransport(response.request()),
    });
    const late = await waitForPhase("late-dom", (event) => event.backgroundHiddenInert === true);
    expect(late).toMatchObject({
      lateHeading: true,
      lateHidden: true,
      sameShield: true,
      shieldConnected: true,
      statusLabel: true,
      backgroundHiddenInert: true,
      backgroundRenderHidden: true,
      lateRenderHidden: true,
      dockRenderHidden: true,
    });
    expect((late.geometry as { height: number }).height).toBeGreaterThan(0);
    await waitForPhase("help-transport");
    const unmounted = await waitForPhase(
      "unmounted",
      (event) => event.backgroundHiddenInert === true,
    );
    expect(unmounted).toMatchObject({
      originalScopeDisconnected: true,
      shieldConnected: true,
      sameShield: true,
      backgroundHiddenInert: true,
      backgroundRenderHidden: true,
      dockRenderHidden: true,
      statusLabel: true,
    });
    const painted = await waitForPhase("unmounted-painted");
    expect(painted).toMatchObject({
      backgroundHiddenInert: true,
      backgroundRenderHidden: true,
      dockRenderHidden: true,
      sameShield: true,
      focusKind: "shield",
    });
    const unmountedFrame = await bounded(
      cdp.send("Page.captureScreenshot", { format: "png" }),
      "unmounted screenshot before recovery release",
    );
    await testInfo.attach("old-document-unmounted-before-release", {
      body: Buffer.from(unmountedFrame.data, "base64"),
      contentType: "image/png",
    });
    expect((unmounted.geometry as { height: number }).height).toBeGreaterThan(0);
    expect(events.findIndex((event) => event.phase === "help-transport")).toBeLessThan(
      events.findIndex((event) => event.phase === "unmounted"),
    );
    expect(lifecycleFailure).toBeUndefined();
    expect(recoveries).toHaveLength(1);
    replacementReleased = true;
    if (!recoveryRequestId) throw new Error("Missing paused recovery request");
    await bounded(
      cdp.send("Fetch.continueRequest", { requestId: recoveryRequestId }),
      "release recovery",
    );
    recoveryRequestId = undefined;
    await expect(
      page.getByRole("heading", { name: "La navegación tardó demasiado" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Reintentar" })).toHaveAttribute(
      "href",
      "/publicar",
    );
    await expect(page.getByRole("link", { name: "Inicio", exact: true })).toHaveAttribute(
      "href",
      "/",
    );
    console.log(
      JSON.stringify({
        elapsedToNativeRecoveryMs: elapsed,
        nativeRecovery: recoveries,
        lateDestinationHidden: true,
        shieldSurvivedUnmount: true,
      }),
    );
  } finally {
    replacementReleased = true;
    page.off("request", helpTransport);
    await testInfo.attach("old-document-events", {
      body: JSON.stringify(events),
      contentType: "application/json",
    });
    try {
      if (recoveryRequestId)
        await bounded(
          cdp.send("Fetch.continueRequest", { requestId: recoveryRequestId }),
          "cleanup recovery",
          2_000,
        );
    } finally {
      try {
        await bounded(gate.dispose(), "cleanup destination gate", 2_000);
      } finally {
        try {
          await bounded(cdp.send("Fetch.disable"), "cleanup Fetch", 2_000);
        } finally {
          await bounded(cdp.detach(), "cleanup CDP", 2_000);
        }
      }
    }
  }
}

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
      await page.emulateMedia({ reducedMotion: "reduce" });
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
      const gate = javaScriptEnabled
        ? await holdPublicationDestination(page, publicationEntry.origin)
        : undefined;
      try {
        await publish.press("Enter");
        if (gate) {
          // The missing visible fallback is the behavior RED, independently of
          // whether unchanged Next follows the redirect inline.
          await expect(page.getByRole("status")).toHaveText("Cargando publicación…");
          expect(await gate.held).toMatchObject({ rsc: "1", prefetch: false, navigation: false });
          const motion = await page.getByRole("status").evaluate(async (label) => {
            const mark = label.parentElement?.firstElementChild;
            const ring = mark?.firstElementChild;
            const letter = mark?.lastElementChild;
            if (!ring || !letter) throw new Error("Activated overlay anatomy missing");
            const before = getComputedStyle(ring).transform;
            await new Promise<void>((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
            );
            return {
              reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
              animation: getComputedStyle(ring).animationName,
              before,
              after: getComputedStyle(ring).transform,
              letter: letter.textContent,
              letterAnimation: getComputedStyle(letter).animationName,
              letterTransform: getComputedStyle(letter).transform,
            };
          });
          expect(motion).toMatchObject({
            reduced: true,
            animation: "none",
            letter: "R",
            letterAnimation: "none",
            letterTransform: "none",
          });
          expect(motion.after).toBe(motion.before);
          expect(
            await page
              .getByRole("link", { name: "Volver al inicio", exact: true })
              .evaluate((node) => node.getBoundingClientRect().height),
          ).toBeGreaterThanOrEqual(44);
          await testInfo.attach("activated-reduced-motion", {
            body: await page.screenshot(),
            contentType: "image/png",
          });
          console.log(JSON.stringify({ activatedReducedMotion: motion, viewport }));
          await gate.release();
        }
      } finally {
        await gate?.dispose();
      }
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
      if (javaScriptEnabled) {
        await verifyEntryDeadline(page, publicationEntry.origin, testInfo);
        await publicationEntry.verify();
      }
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
  javaScriptEnabled,
}, testInfo) => {
  if (javaScriptEnabled) await page.addInitScript(preventPublicationIntersectionPrefetch);
  const methods: string[] = [];
  page.on("request", (request) => methods.push(request.method()));
  const response = await page.goto("/publicar");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(`${publicationEntry.origin}${destination}`);
  await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  expect(methods).not.toContain("POST");
  await publicationEntry.verify();
  if (javaScriptEnabled) {
    await page.setViewportSize({ width: 390, height: 844 });
    await verifyHotEntry(page, publicationEntry.origin);
    await verifyEntryDeadline(page, publicationEntry.origin, testInfo);
    expect(methods).not.toContain("POST");
    await publicationEntry.verify();
  }
});
