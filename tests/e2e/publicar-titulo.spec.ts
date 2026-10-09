import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import {
  DRAFT_LIFETIME_MS,
  draftExpiresAt,
  stampUploadInstants,
} from "../../src/modules/listing-publication/domain/draft-expiry";
import {
  ContactSavedDraft,
  connectOwnedDatabase,
  type DraftSnapshot,
  OWNED_DSN,
  type QueryPort,
} from "../fixtures/contact-saved-draft";
import { TitleSavedDraft } from "../fixtures/title-saved-draft";

async function nativePost(
  page: Page,
  origin: string,
  value: string,
  destination: string,
  step = "titulo",
  control = "Título",
) {
  await page.getByLabel(control, { exact: true }).fill(value);
  const started = Date.now();
  const [post, served] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url() === `${origin}/publicar/paso/${step}`,
    ),
    page.waitForNavigation(),
    page.locator(`form:has(input[name="step"][value="${step}"]) button[type="submit"]`).click(),
  ]);
  const finished = Date.now();
  expect(post.status()).toBe(303);
  if (!served) throw new Error("native POST returned no served navigation");
  expect(served.status()).toBe(200);
  expect(page.url()).toBe(`${origin}/publicar/paso/${destination}`);
  return { started, finished, html: await served.text(), request: post.request() };
}

function savedPolicy(
  before: DraftSnapshot,
  after: DraftSnapshot,
  title: string,
  invalid: boolean,
  window: { started: number; finished: number },
  field: "title" | "description" = "title",
  violation = "title.tooLong",
) {
  // Raw attempts belong only to a rejected save, never to a successful one.
  const previousAnswers = { ...before.answers };
  delete previousAnswers.raw;
  expect(after.answers).toEqual({
    ...previousAnswers,
    listing: { ...before.answers.listing, [field]: title },
    violations: invalid ? [violation] : [],
    ...(invalid ? { raw: {} } : {}),
  });
  if (invalid) expect(after.answers.raw).toEqual({});
  else expect(after.answers).not.toHaveProperty("raw");
  // These fresh photos cannot reach their seven-day cap during this journey.
  // First save exposes action time in uploadedAt; later saves expose it in expiry.
  const firstStamp = before.photos.some((photo) => photo.uploadedAt === undefined);
  const actionTime = firstStamp
    ? Date.parse(after.photos[0]?.uploadedAt ?? "")
    : Date.parse(after.expiresAt) - DRAFT_LIFETIME_MS;
  expect(actionTime).toBeGreaterThanOrEqual(window.started);
  expect(actionTime).toBeLessThanOrEqual(window.finished);
  const now = new Date(actionTime);
  const previous = { ...before.answers, photos: before.photos };
  const current = { ...after.answers, photos: before.photos };
  expect(after.photos).toEqual(stampUploadInstants(previous, current, now).photos);
  expect(after.expiresAt).toBe(draftExpiresAt(now, after.photos).toISOString());
  expect(after.photos.map(({ key, name, bytes }) => ({ key, name, bytes }))).toEqual(
    before.photos.map(({ key, name, bytes }) => ({ key, name, bytes })),
  );
}

for (const javaScriptEnabled of [true, false]) {
  const mode = javaScriptEnabled ? "on" : "off";
  test(`owned title: JavaScript ${mode}`, async ({ browser, baseURL }) => {
    if (baseURL !== "http://127.0.0.1:31467") {
      throw new Error("owned title requires its exact loopback origin");
    }
    const origin = baseURL;
    const db = await connectOwnedDatabase(OWNED_DSN);
    const readOnly: QueryPort = {
      query(sql, values) {
        if (!sql.startsWith("SELECT")) throw new Error("baseline is read-only");
        return db.query(sql, values);
      },
    };
    const baseline = new ContactSavedDraft(OWNED_DSN, readOnly);
    try {
      // Missing baseline is an error, never permission to seed or renew it.
      const retained = await baseline.snapshot();
      const identity = `case-title-${randomUUID().slice(0, 12)}-${mode}`;
      const fixture = new TitleSavedDraft(OWNED_DSN, db, identity);
      expect(fixture.publisherId).not.toBe(baseline.publisherId);
      const own = await fixture.ensure(new Date());
      const context = await browser.newContext({ javaScriptEnabled });
      try {
        await context.route("**/*", (route) => {
          const url = new URL(route.request().url());
          return url.origin === origin &&
            !url.username &&
            !url.password &&
            route.request().resourceType() !== "image"
            ? route.continue()
            : route.abort();
        });
        await context.addCookies([
          { name: "authjs.session-token", value: fixture.sessionToken, url: origin },
        ]);
        const page = await context.newPage();
        const auth = await page.goto(`${origin}/api/auth/session`);
        expect(auth?.status()).toBe(200);
        const session = JSON.parse((await page.locator("body").textContent()) ?? "null");
        expect(session.user.name).toBe(`owned-f367-${identity}`);
        expect(session.user.email).toBe(`owned-f367-${identity}@example.invalid`);
        expect(Date.parse(session.expires)).toBeGreaterThan(Date.now());
        const response = await page.goto(`${origin}/publicar/paso/titulo`);
        expect(response?.status()).toBe(200);
        expect(page.url()).toBe(`${origin}/publicar/paso/titulo`);
        const input = page.getByLabel("Título", { exact: true });
        const form = page.locator('form:has(input[name="step"][value="titulo"])');
        await expect(form).toHaveAttribute("method", "POST");
        await expect(input).toHaveAttribute("maxlength", "180");
        const preview = page.getByText("Así se va a ver", { exact: true }).locator("..");
        const price = preview.locator("p").nth(1);
        const cardTitle = preview.locator("p").nth(2);
        const metadata = preview.locator("p").nth(3);
        const zone = await readOnly.query("SELECT name FROM zone WHERE id = $1", [
          own.snapshot.answers.listing.zoneId,
        ]);
        expect(zone.rows).toHaveLength(1);
        const expectedMeta = `${zone.rows[0]?.name} · 2 hab · 70 m²`;
        await expect(price).toHaveText("$500");
        await expect(metadata).toHaveText(expectedMeta);
        await expect(input).toHaveValue(own.snapshot.answers.listing.title ?? "");
        await expect(cardTitle).toHaveText(own.snapshot.answers.listing.title ?? "Tu título");
        if (javaScriptEnabled) {
          const posts: string[] = [];
          page.on("request", (request) => {
            if (request.method() === "POST") posts.push(request.url());
          });
          const counter = page
            .getByText("Sin mayúsculas sostenidas.", { exact: true })
            .locator("..")
            .locator("span")
            .nth(1);
          const live = async (value: string, count: number) => {
            await expect(input).toHaveValue(value);
            await expect(input).toBeFocused();
            await expect(counter).toHaveText(`${count} / 90`);
            await expect(cardTitle).toHaveText(value);
            await expect(price).toHaveText("$500");
            await expect(metadata).toHaveText(expectedMeta);
          };
          await input.focus();
          await input.press("ControlOrMeta+A");
          await input.pressSequentially("Casa");
          await live("Casa", 4);
          // Simulated paste via input, not real clipboard access.
          await input.fill("Pegado 🏡");
          await live("Pegado 🏡", 8);
          await input.press("ControlOrMeta+A");
          await input.press("Backspace");
          await live("", 0);
          await input.fill("🏡".repeat(90));
          await live("🏡".repeat(90), 90);
          await input.fill("a".repeat(91));
          await live("a".repeat(91), 91);
          await expect(input).not.toHaveAttribute("aria-invalid", "true");
          await expect(page.locator("#title-error")).toHaveCount(0);
          expect(posts).toEqual([]);
          expect(await fixture.snapshot()).toEqual(own.snapshot);
          expect(await baseline.snapshot()).toEqual(retained);
        } else {
          const valid = await nativePost(page, origin, "  Casa luminosa  ", "descripcion");
          const saved = await fixture.snapshot();
          savedPolicy(own.snapshot, saved, "Casa luminosa", false, valid);
          const reentered = await page.goto(`${origin}/publicar/paso/titulo`);
          expect(reentered?.status()).toBe(200);
          expect(page.url()).toBe(`${origin}/publicar/paso/titulo`);
          await expect(input).toHaveValue("Casa luminosa");
          await expect(cardTitle).toHaveText("Casa luminosa");
          await expect(price).toHaveText("$500");
          await expect(metadata).toHaveText(expectedMeta);
          expect(await fixture.snapshot()).toEqual(saved);
          const reloaded = await page.reload();
          expect(reloaded?.status()).toBe(200);
          expect(page.url()).toBe(`${origin}/publicar/paso/titulo`);
          await expect(input).toHaveValue("Casa luminosa");
          expect(await fixture.snapshot()).toEqual(saved);
          expect(await baseline.snapshot()).toEqual(retained);
          const rejected = "a".repeat(91);
          const invalid = await nativePost(page, origin, rejected, "titulo");
          expect(invalid.html).toContain("Máximo 90 caracteres.");
          const attempted = await fixture.snapshot();
          savedPolicy(saved, attempted, rejected, true, invalid);
          expect(attempted.photos).toEqual(saved.photos);
          const error = page.locator("#title-error");
          await expect(error).toContainText("Máximo 90 caracteres.");
          await expect(input).toHaveAttribute("aria-invalid", "true");
          await expect(input).toHaveAttribute("aria-describedby", "title-error");
          await expect(input).toHaveValue(rejected);
          await expect(cardTitle).toHaveText(rejected);
          const rejectedReload = await page.reload();
          expect(rejectedReload?.status()).toBe(200);
          expect(page.url()).toBe(`${origin}/publicar/paso/titulo`);
          await expect(error).toContainText("Máximo 90 caracteres.");
          await expect(input).toHaveValue(rejected);
          await expect(cardTitle).toHaveText(rejected);
          await expect(price).toHaveText("$500");
          await expect(metadata).toHaveText(expectedMeta);
          expect(await fixture.snapshot()).toEqual(attempted);
        }
        expect(await baseline.snapshot()).toEqual(retained);
      } finally {
        await context.close();
      }
      // Per-case rows remain retained, including rejected attempts and photo stamps.
      expect(await baseline.snapshot()).toEqual(retained);
    } finally {
      await db.close();
    }
  });
}

for (const javaScriptEnabled of [true, false]) {
  const mode = javaScriptEnabled ? "on" : "off";
  test(`owned description: JavaScript ${mode}`, async ({ browser, baseURL }) => {
    if (baseURL !== "http://127.0.0.1:31467") {
      throw new Error("owned description requires its exact loopback origin");
    }
    const origin = baseURL;
    const db = await connectOwnedDatabase(OWNED_DSN);
    const readOnly: QueryPort = {
      query(sql, values) {
        if (!sql.startsWith("SELECT")) throw new Error("baseline is read-only");
        return db.query(sql, values);
      },
    };
    const baseline = new ContactSavedDraft(OWNED_DSN, readOnly);
    try {
      // Retain the baseline and bootstrap only this fresh synthetic identity.
      const retained = await baseline.snapshot();
      const identity = `case-title-description-${randomUUID().replaceAll("-", "").slice(0, 12)}-${mode}`;
      const fixture = new TitleSavedDraft(OWNED_DSN, db, identity);
      expect(fixture.publisherId).not.toBe(baseline.publisherId);
      const own = await fixture.ensure(new Date());
      let ready = own.snapshot;
      // Title is missing in the seed: native POST makes description navigable.
      // JS-on uses a new authenticated context after closing the JS-off bootstrap.
      for (const enabled of javaScriptEnabled ? [false, true] : [false]) {
        const context = await browser.newContext({ javaScriptEnabled: enabled });
        try {
          await context.route("**/*", (route) => {
            const url = new URL(route.request().url());
            return url.origin === origin &&
              !url.username &&
              !url.password &&
              route.request().resourceType() !== "image"
              ? route.continue()
              : route.abort();
          });
          await context.addCookies([
            { name: "authjs.session-token", value: fixture.sessionToken, url: origin },
          ]);
          const page = await context.newPage();
          const auth = await page.goto(`${origin}/api/auth/session`);
          expect(auth?.status()).toBe(200);
          const session = JSON.parse((await page.locator("body").textContent()) ?? "null");
          expect(session.user.name).toBe(`owned-f367-${identity}`);
          expect(session.user.email).toBe(`owned-f367-${identity}@example.invalid`);
          expect(Date.parse(session.expires)).toBeGreaterThan(Date.now());
          if (!enabled) {
            const titlePage = await page.goto(`${origin}/publicar/paso/titulo`);
            expect(titlePage?.status()).toBe(200);
            expect(page.url()).toBe(`${origin}/publicar/paso/titulo`);
            expect(await fixture.snapshot()).toEqual(own.snapshot);
            const bootstrap = await nativePost(page, origin, "Casa luminosa", "descripcion");
            ready = await fixture.snapshot();
            savedPolicy(own.snapshot, ready, "Casa luminosa", false, bootstrap);
            expect(await baseline.snapshot()).toEqual(retained);
            if (javaScriptEnabled) continue;
          } else {
            const response = await page.goto(`${origin}/publicar/paso/descripcion`);
            expect(response?.status()).toBe(200);
          }
          expect(page.url()).toBe(`${origin}/publicar/paso/descripcion`);
          expect(await fixture.snapshot()).toEqual(ready);
          expect(await baseline.snapshot()).toEqual(retained);
          const input = page.getByLabel("Descripción", { exact: true });
          const form = page.locator('form:has(input[name="step"][value="descripcion"])');
          const field = input.locator("..");
          const counter = field.locator("p").last();
          const meter = field.locator("div[style]");
          const error = page.locator("#description-error");
          await expect(form).toHaveAttribute("method", "POST");
          const guidance = async (
            value: string,
            count: number,
            message: string,
            progress: number,
          ) => {
            await expect(input).toHaveValue(value);
            await expect(input).not.toHaveAttribute("maxlength", /.*/);
            await expect(counter.locator("span").first()).toHaveText(message);
            await expect(counter.locator("span").last()).toHaveText(`${count} / 120`);
            await expect(meter).toHaveAttribute(
              "style",
              new RegExp(`^inline-size:\\s*${progress}%;?$`),
            );
          };
          await guidance("", 0, "te faltan 120 caracteres", 0);
          await expect(error).toHaveCount(0);
          if (enabled) {
            const posts: string[] = [];
            page.on("request", (request) => {
              if (request.method() === "POST") posts.push(request.url());
            });
            const live = async (
              value: string,
              count: number,
              message: string,
              progress: number,
            ) => {
              await guidance(value, count, message, progress);
              await expect(input).toBeFocused();
              await expect(input).not.toHaveAttribute("aria-invalid", "true");
              await expect(error).toHaveCount(0);
              expect(posts).toEqual([]);
              expect(await fixture.snapshot()).toEqual(ready);
              expect(await baseline.snapshot()).toEqual(retained);
            };
            await input.focus();
            await input.pressSequentially("a".repeat(120));
            await live("a".repeat(120), 120, "ya alcanza", 100);
            await input.press("Backspace");
            await live("a".repeat(119), 119, "te faltan 1 caracteres", 99);
            // fill simulates pasted input; it does not access the OS clipboard.
            await input.fill("🏡".repeat(120));
            await live("🏡".repeat(120), 120, "ya alcanza", 100);
            await input.press("ControlOrMeta+A");
            await input.press("Backspace");
            await live("", 0, "te faltan 120 caracteres", 0);
            await input.fill("a".repeat(1201));
            // Minimum sufficiency is not server validity: over-limit input stays editable.
            await live("a".repeat(1201), 1201, "ya alcanza", 100);
          } else {
            let previous = ready;
            for (const [count, violation, message, guide, progress] of [
              [
                119,
                "description.tooShort",
                "✱ Mínimo 120 caracteres. Vas 119.",
                "te faltan 1 caracteres",
                99,
              ],
              [1201, "description.tooLong", "Máximo 1200 caracteres. Vas 1201.", "ya alcanza", 100],
            ] as const) {
              const rejected = "a".repeat(count);
              const invalid = await nativePost(
                page,
                origin,
                rejected,
                "descripcion",
                "descripcion",
                "Descripción",
              );
              expect(invalid.html).toContain(message);
              const attempted = await fixture.snapshot();
              savedPolicy(previous, attempted, rejected, true, invalid, "description", violation);
              expect(attempted.photos).toEqual(previous.photos);
              await guidance(rejected, count, guide, progress);
              await expect(error).toHaveText(message);
              await expect(input).toHaveAttribute("aria-invalid", "true");
              await expect(input).toHaveAttribute("aria-describedby", "description-error");
              expect(await baseline.snapshot()).toEqual(retained);
              const reloaded = await page.reload();
              expect(reloaded?.status()).toBe(200);
              expect(page.url()).toBe(`${origin}/publicar/paso/descripcion`);
              await guidance(rejected, count, guide, progress);
              await expect(error).toHaveText(message);
              await expect(input).toHaveAttribute("aria-invalid", "true");
              await expect(input).toHaveAttribute("aria-describedby", "description-error");
              expect(await fixture.snapshot()).toEqual(attempted);
              const reentered = await page.goto(`${origin}/publicar/paso/descripcion`);
              expect(reentered?.status()).toBe(200);
              expect(page.url()).toBe(`${origin}/publicar/paso/descripcion`);
              await guidance(rejected, count, guide, progress);
              await expect(error).toHaveText(message);
              await expect(input).toHaveAttribute("aria-invalid", "true");
              await expect(input).toHaveAttribute("aria-describedby", "description-error");
              expect(await fixture.snapshot()).toEqual(attempted);
              expect(await baseline.snapshot()).toEqual(retained);
              previous = attempted;
            }
            const description = `${"Casa luminosa ".repeat(10)}\nPatio interior.`;
            const paddedDescription = `  ${description}  `;
            // Native multipart serialization uses CRLF; derive it from input, not the DB.
            const serializedDescription = paddedDescription.replaceAll("\n", "\r\n");
            const expectedSaved = serializedDescription.trim();
            const valid = await nativePost(
              page,
              origin,
              paddedDescription,
              "fotos",
              "descripcion",
              "Descripción",
            );
            expect(valid.request.headers()["content-type"]).toMatch(
              /^multipart\/form-data; boundary=[A-Za-z0-9-]+$/,
            );
            expect(valid.request.postData()).toContain(
              `name="description"\r\n\r\n${serializedDescription}\r\n--`,
            );
            const saved = await fixture.snapshot();
            savedPolicy(previous, saved, expectedSaved, false, valid, "description");
            expect(saved.photos).toEqual(previous.photos);
            expect(saved.answers.violations).toEqual([]);
            expect(await baseline.snapshot()).toEqual(retained);
            const reentered = await page.goto(`${origin}/publicar/paso/descripcion`);
            expect(reentered?.status()).toBe(200);
            expect(page.url()).toBe(`${origin}/publicar/paso/descripcion`);
            // The DOM value uses LF; served guidance counts the persisted CRLF code points.
            await guidance(description.trim(), [...expectedSaved].length, "ya alcanza", 100);
            await expect(error).toHaveCount(0);
            await expect(input).not.toHaveAttribute("aria-invalid", "true");
            await expect(input).not.toHaveAttribute("aria-describedby", "description-error");
            expect(await fixture.snapshot()).toEqual(saved);
            const reloaded = await page.reload();
            expect(reloaded?.status()).toBe(200);
            expect(page.url()).toBe(`${origin}/publicar/paso/descripcion`);
            await guidance(description.trim(), [...expectedSaved].length, "ya alcanza", 100);
            await expect(error).toHaveCount(0);
            await expect(input).not.toHaveAttribute("aria-invalid", "true");
            await expect(input).not.toHaveAttribute("aria-describedby", "description-error");
            expect(await fixture.snapshot()).toEqual(saved);
            expect(await baseline.snapshot()).toEqual(retained);
          }
          expect(await baseline.snapshot()).toEqual(retained);
        } finally {
          await context.close();
        }
      }
      // Retain every case row, including attempts, photo stamps and renewed expiry.
      expect(await baseline.snapshot()).toEqual(retained);
    } finally {
      await db.close();
    }
  });
}
