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

async function nativePost(page: Page, origin: string, title: string, destination: string) {
  await page.getByLabel("Título", { exact: true }).fill(title);
  const started = Date.now();
  const [post, served] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url() === `${origin}/publicar/paso/titulo`,
    ),
    page.waitForNavigation(),
    page.locator('form:has(input[name="step"][value="titulo"]) button[type="submit"]').click(),
  ]);
  const finished = Date.now();
  expect(post.status()).toBe(303);
  if (!served) throw new Error("native POST returned no served navigation");
  expect(served.status()).toBe(200);
  expect(page.url()).toBe(`${origin}/publicar/paso/${destination}`);
  return { started, finished, html: await served.text() };
}

function savedPolicy(
  before: DraftSnapshot,
  after: DraftSnapshot,
  title: string,
  invalid: boolean,
  window: { started: number; finished: number },
) {
  expect(after.answers).toEqual({
    ...before.answers,
    listing: { ...before.answers.listing, title },
    violations: invalid ? ["title.tooLong"] : [],
    ...(invalid ? { raw: {} } : {}),
  });
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
