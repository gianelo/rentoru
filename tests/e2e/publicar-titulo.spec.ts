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
  expect(page.url()).toBe(
    destination === "revisar"
      ? `${origin}/publicar/revisar`
      : `${origin}/publicar/paso/${destination}`,
  );
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

for (const [mode, javaScriptEnabled, rejectedCount] of [
  ["on", true, undefined],
  ["off-short", false, 119],
  ["off-long", false, 1201],
  ["off-valid", false, undefined],
] as const) {
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
      const identity = `case-title-desc-${randomUUID().replaceAll("-", "").slice(0, 12)}-${mode}`;
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
            for (const [count, violation, message, guide, progress] of (
              [
                [
                  119,
                  "description.tooShort",
                  "✱ Mínimo 120 caracteres. Vas 119.",
                  "te faltan 1 caracteres",
                  99,
                ],
                [
                  1201,
                  "description.tooLong",
                  "Máximo 1200 caracteres. Vas 1201.",
                  "ya alcanza",
                  100,
                ],
              ] as const
            ).filter(([count]) => count === rejectedCount)) {
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
            if (rejectedCount !== undefined) continue;
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

const notationContactError =
  "Revisa el formato y el prefijo del número para WhatsApp. Se permiten espacios, guiones y paréntesis alrededor del prefijo, no letras ni extensiones.";
const contactErrors: Record<string, string> = {
  "0212 1234567": "Este número es fijo. Selecciona Llamada; WhatsApp requiere un móvil venezolano.",
  "+1 4121234567": "Para WhatsApp, usa un número venezolano: el código de país es +58.",
  "+58 0412 1234567": "Después de +58 o 0058, no incluyas el 0 inicial del número para WhatsApp.",
  "0412ABC4567": notationContactError,
  "04121234567 ext 1": notationContactError,
  "(0412 1234567": notationContactError,
  "0412123456": "El número para WhatsApp tiene 10 dígitos. Este formato requiere 11.",
  "042431244444": "El número para WhatsApp tiene 12 dígitos. Este formato requiere 11.",
  "": "✱ obligatorio. Escribe tu número de WhatsApp.",
};

const cases = [
  ["whatsapp", "0412 123 4567", "+584121234567", null],
  ["whatsapp", "4121234567", "+584121234567", null],
  ["whatsapp", "+58 412 1234567", "+584121234567", null],
  ["whatsapp", "0058 412 1234567", "+584121234567", null],
  ["whatsapp", "584121234567", "+584121234567", null],
  ["telefono", "0212 123 4567", "+582121234567", null],
  ["email", "contacto@example.invalid", "contacto@example.invalid", null],
  ["whatsapp", "0212 1234567", "0212 1234567", "contactValue.invalid"],
  ["whatsapp", "+1 4121234567", "+1 4121234567", "contactValue.invalid"],
  ["whatsapp", "+58 0412 1234567", "+58 0412 1234567", "contactValue.invalid"],
  ["whatsapp", "0412ABC4567", "0412ABC4567", "contactValue.invalid"],
  ["whatsapp", "04121234567 ext 1", "04121234567 ext 1", "contactValue.invalid"],
  ["whatsapp", "0412123456", "0412123456", "contactValue.invalid"],
  ["whatsapp", "042431244444", "042431244444", "contactValue.invalid"],
  ["whatsapp", "04246162812", "+584246162812", null],
  ["whatsapp", "(0412 1234567", "(0412 1234567", "contactValue.invalid"],
  ["whatsapp", "", "", "contactValue.required"],
] as const;

const liveCase = ["whatsapp", "042431244444", "042431244444", "contactValue.invalid"] as const;
for (const [index, [method, value, expected, violation]] of [...cases, liveCase].entries()) {
  const scripted = index === cases.length;
  test(`owned contact${scripted ? " JS-on" : ""}: ${method} ${JSON.stringify(value)}`, async ({
    browser,
    baseURL,
  }) => {
    if (baseURL !== "http://127.0.0.1:31467") throw new Error("exact owned origin required");
    const origin = baseURL;
    const db = await connectOwnedDatabase(OWNED_DSN);
    const baseline = new ContactSavedDraft(OWNED_DSN, {
      query(sql, values) {
        if (!sql.startsWith("SELECT")) throw new Error("baseline is read-only");
        return db.query(sql, values);
      },
    });
    const context = await browser.newContext({ javaScriptEnabled: scripted });
    try {
      const retained = await baseline.snapshot();
      const identity = `case-title-contact-${randomUUID().replaceAll("-", "").slice(0, 12)}`;
      const fixture = new TitleSavedDraft(OWNED_DSN, db, identity);
      expect(fixture.publisherId).not.toBe(baseline.publisherId);
      await fixture.ensure(new Date());
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
      expect((await page.goto(`${origin}/api/auth/session`))?.status()).toBe(200);
      const session = JSON.parse((await page.locator("body").textContent()) ?? "null");
      expect(session.user.email).toBe(`owned-f367-${identity}@example.invalid`);
      expect(Date.parse(session.expires)).toBeGreaterThan(Date.now());
      expect((await page.goto(`${origin}/publicar/paso/titulo`))?.status()).toBe(200);
      await nativePost(page, origin, "Casa luminosa", "descripcion");
      await nativePost(
        page,
        origin,
        "Casa luminosa ".repeat(10),
        "fotos",
        "descripcion",
        "Descripción",
      );
      const entered = await page.goto(`${origin}/publicar/paso/quien`);
      expect(entered?.status()).toBe(200);
      expect(page.url()).toBe(`${origin}/publicar/paso/quien`);
      const beforeContact = await fixture.snapshot();
      await page.getByLabel("Soy el dueño", { exact: true }).check();
      await page.locator(`input[name="contactMethod"][value="${method}"]`).check();
      if (scripted) {
        const liveMessage = contactErrors[value];
        const fixedMessage = contactErrors["0212 1234567"];
        if (liveMessage === undefined || fixedMessage === undefined)
          throw new Error("missing live contact copy");
        const input = page.getByLabel("Tu dato de contacto", { exact: true });
        await input.fill(value);
        await expect(page.locator("#contact-error")).toHaveCount(0);
        await input.blur();
        await expect(page.locator("#contact-error")).toHaveText(liveMessage);
        await expect(input).toHaveAttribute("aria-invalid", "true");
        await input.fill("04246162812");
        await expect(page.locator("#contact-error")).toHaveCount(0);
        await expect(input).not.toHaveAttribute("aria-invalid", "true");
        await input.fill("0212 1234567");
        await expect(page.locator("#contact-error")).toHaveText(fixedMessage);
        await page.locator('input[name="contactMethod"][value="telefono"]').check();
        await expect(page.locator("#contact-error")).toHaveCount(0);
        await page.locator('input[name="contactMethod"][value="email"]').check();
        await expect(page.locator("#contact-error")).toContainText("correo");
        await expect(input).toHaveValue("0212 1234567");
        await page.locator('input[name="contactMethod"][value="whatsapp"]').check();
      }
      const result = await nativePost(
        page,
        origin,
        value,
        violation ? "quien" : "revisar",
        "quien",
        "Tu dato de contacto",
      );
      expect(result.request.postData()).toContain(`name="contactMethod"\r\n\r\n${method}`);
      const persisted = await fixture.snapshot();
      expect(persisted.answers.listing).toEqual({
        ...beforeContact.answers.listing,
        publisherType: "owner",
        contactMethod: method,
        // Empty fields become undefined at the reader and are absent from stored JSON.
        ...(expected === "" ? {} : { contactValue: expected }),
      });
      expect(persisted.answers.violations).toEqual(violation ? [violation] : []);
      // Quien retains rejected text in listing; raw is reserved for other step readers.
      expect(persisted.answers.raw).toEqual(violation ? {} : undefined);
      const {
        listing: _beforeListing,
        violations: _beforeViolations,
        raw: _beforeRaw,
        ...rest
      } = beforeContact.answers;
      const {
        listing: _afterListing,
        violations: _afterViolations,
        raw: _afterRaw,
        ...afterRest
      } = persisted.answers;
      expect(afterRest).toEqual(rest);
      expect(persisted.photos).toEqual(beforeContact.photos);
      expect(Date.parse(persisted.expiresAt)).toBeGreaterThanOrEqual(
        result.started + DRAFT_LIFETIME_MS,
      );
      expect(Date.parse(persisted.expiresAt)).toBeLessThanOrEqual(
        result.finished + DRAFT_LIFETIME_MS,
      );
      const errorMessage = contactErrors[value];
      if (violation) {
        expect(errorMessage).toBeTruthy();
        expect(result.html).toContain(errorMessage);
        const inputPosition = result.html.indexOf('id="contactValue"');
        const errorPosition = result.html.indexOf('id="contact-error"');
        expect(inputPosition).toBeGreaterThanOrEqual(0);
        expect(errorPosition).toBeGreaterThan(inputPosition);
        const control = result.html.match(/<input\b[^>]*id="contactValue"[^>]*>/)?.[0];
        expect(control).toContain('aria-invalid="true"');
        expect(control).toContain('aria-describedby="contact-error contact-help"');
      }
      for (const reload of [false, true]) {
        const served = reload
          ? await page.reload()
          : await page.goto(`${origin}/publicar/paso/quien`);
        expect(served?.status()).toBe(200);
        expect(page.url()).toBe(`${origin}/publicar/paso/quien`);
        await expect(page.getByLabel("Tu dato de contacto", { exact: true })).toHaveValue(expected);
        await expect(page.getByLabel("Soy el dueño", { exact: true })).toBeChecked();
        await expect(page.locator(`input[name="contactMethod"][value="${method}"]`)).toBeChecked();
        if (violation) {
          if (errorMessage === undefined) throw new Error("Missing expected contact error copy");
          await expect(page.locator("#contact-error")).toHaveText(errorMessage);
        } else await expect(page.locator("#contact-error")).toHaveCount(0);
        expect(await fixture.snapshot()).toEqual(persisted);
        expect(await baseline.snapshot()).toEqual(retained);
      }
    } finally {
      await context.close();
      await db.close();
    }
  });
}
