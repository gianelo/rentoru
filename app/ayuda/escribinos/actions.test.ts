import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * El cable entre `sendContactMessage` y la pantalla — la misma forma que
 * `reveal-actions.test.ts` ya prueba para revelar el contacto: lo que se
 * prueba acá no es qué decide el caso de uso (eso lo prueba
 * `send-contact-message.test.ts`), es qué hace la acción con cada
 * veredicto que el caso de uso puede devolver.
 */
const { RedirectSignal, redirect, sendContactMessage } = vi.hoisted(() => {
  class RedirectSignal extends Error {
    readonly url: string;
    constructor(url: string) {
      super(`NEXT_REDIRECT:${url}`);
      this.name = "RedirectSignal";
      this.url = url;
    }
  }

  return {
    RedirectSignal,
    redirect: vi.fn((url: string): never => {
      throw new RedirectSignal(url);
    }),
    sendContactMessage: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({ redirect }));

vi.mock("@/modules/site-contact/application/send-contact-message", () => ({ sendContactMessage }));

// El adaptador real falla cerrado sin `RESEND_API_KEY`/`AUTH_MAIL_FROM`/
// `CONTACT_MAIL_TO` al construirse; acá no se manda nada de verdad —
// `sendContactMessage` está doblado— así que sólo hace falta que construirlo
// no tire.
vi.mock("@/modules/site-contact/infrastructure/resend-contact-mailer", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/modules/site-contact/infrastructure/resend-contact-mailer")
    >();
  return { ...actual, ResendContactMailer: vi.fn() };
});

import {
  CONTACT_ERROR_PARAM,
  CONTACT_SENT_PARAM,
} from "@/modules/site-contact/domain/contact-screen";
import {
  ContactMailerNotConfiguredError,
  ContactMailerSendError,
  ResendContactMailer,
} from "@/modules/site-contact/infrastructure/resend-contact-mailer";
import { sendContactMessageAction } from "./actions";
import EscribinosPage from "./page";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

function submit(overrides: Record<string, string> = {}) {
  return sendContactMessageAction(
    form({
      name: "María Pérez",
      email: "maria@example.com",
      message: "Hola, una pregunta.",
      sitioWeb: "",
      ...overrides,
    }),
  );
}

beforeEach(() => {
  redirect.mockClear();
  sendContactMessage.mockReset();
  vi.mocked(ResendContactMailer).mockReset();
});

// Vitest does not run Next's Server Action transform; attach its SSR metadata
// without replacing the real action that these POST tests invoke.
Object.assign(sendContactMessageAction, {
  $$FORM_ACTION: () => ({
    name: "$ACTION_ID_contact-test",
    method: "POST",
    action: "/ayuda/escribinos",
    encType: "multipart/form-data",
    data: null,
  }),
});

async function postHtml(data: FormData): Promise<string> {
  let target: string | undefined;
  try {
    await sendContactMessageAction(data);
  } catch (error) {
    if (!(error instanceof RedirectSignal)) throw error;
    target = error.url;
  }
  expect(target).toBeDefined();
  expect(target).toMatch(/^\/ayuda\/escribinos\?/);
  const query: Record<string, string | string[] | undefined> = {};
  const params = new URL(target as string, "https://internal.invalid").searchParams;
  for (const key of params.keys()) {
    const values = params.getAll(key);
    query[key] = values.length === 1 ? values[0] : values;
  }
  return renderToStaticMarkup(await EscribinosPage({ searchParams: Promise.resolve(query) }));
}

function zoneForm(review = true): FormData {
  return form({
    name: "María Pérez",
    email: "maria@example.com",
    message: "Falta una zona en el catálogo para publicar.",
    sitioWeb: "",
    motivo: "zona-faltante",
    ...(review ? { volver: "revisar" } : {}),
  });
}

describe("POST → GET served contact outcome", () => {
  const send = vi.fn();
  beforeEach(async () => {
    const actual = await vi.importActual<
      typeof import("@/modules/site-contact/application/send-contact-message")
    >("@/modules/site-contact/application/send-contact-message");
    sendContactMessage.mockImplementation(actual.sendContactMessage);
    send.mockReset();
    send.mockResolvedValue(undefined);
    // biome-ignore lint/complexity/useArrowFunction: This double is invoked with new.
    vi.mocked(ResendContactMailer).mockImplementation(function () {
      return { send } as unknown as ResendContactMailer;
    });
  });

  it.each([false, true])("valid POST preserves fixed Zone return (review=%s)", async (review) => {
    const html = await postHtml(zoneForm(review));
    expect(html).toContain("Recibimos tu mensaje");
    expect(html).toContain("Avisarnos no crea ni habilita una zona.");
    expect(html).toContain(`href="/publicar/paso/zona${review ? "?volver=revisar" : ""}"`);
    expect(html).not.toContain("<form");
    expect(send).toHaveBeenCalledOnce();
  });

  it.each(["empty", "spam"])("%s POST preserves context and safe outcome", async (kind) => {
    const data = zoneForm();
    data.set(kind === "empty" ? "message" : "sitioWeb", kind === "empty" ? "" : "bot");
    const html = await postHtml(data);
    expect(html).toContain('href="/publicar/paso/zona?volver=revisar"');
    expect(html).toContain("Avisarnos no crea ni habilita una zona.");
    if (kind === "empty") {
      expect(html).toContain("Revisá los datos e intentá de nuevo.");
      expect(html).toContain('name="motivo" value="zona-faltante"');
      expect(html).not.toContain("Recibimos tu mensaje");
    } else {
      expect(html).toContain("Recibimos tu mensaje");
      expect(html).not.toContain("<form");
    }
    expect(send).not.toHaveBeenCalled();
  });

  it("typed delivery failure POST renders a negative notice, never false success", async () => {
    send.mockRejectedValueOnce(new ContactMailerSendError("private-provider-detail"));
    const html = await postHtml(zoneForm());
    expect(html).toContain("No pudimos enviar tu mensaje. Intentá de nuevo.");
    expect(html).toContain('role="alert"');
    expect(html).toContain('href="/publicar/paso/zona?volver=revisar"');
    expect(html).toContain('name="volver" value="revisar"');
    expect(html).not.toContain("Recibimos tu mensaje");
    expect(html).not.toContain("private-provider-detail");
    expect(html).not.toContain("maria@example.com");
  });

  it.each(["unknown", "duplicate", "file"])("rejects %s POST context", async (kind) => {
    const data = zoneForm();
    if (kind === "unknown") data.set("motivo", "other");
    if (kind === "duplicate") data.append("motivo", "zona-faltante");
    if (kind === "file") data.set("motivo", new Blob(["zona-faltante"]), "context.txt");
    const html = await postHtml(data);
    expect(html).toContain("Recibimos tu mensaje");
    expect(html).not.toContain("/publicar/paso/zona");
    expect(html).not.toContain("Avisarnos no crea");
  });

  it.each(["external", "duplicate", "file"])("rejects %s POST return mode", async (kind) => {
    const data = zoneForm();
    if (kind === "external") data.set("volver", "https://outside.invalid");
    if (kind === "duplicate") data.append("volver", "revisar");
    if (kind === "file") data.set("volver", new Blob(["revisar"]), "return.txt");
    data.set("returnTo", "https://outside.invalid");
    const html = await postHtml(data);
    expect(html).toContain('href="/publicar/paso/zona"');
    expect(html).not.toContain("volver=revisar");
    expect(html).not.toContain("outside.invalid");
  });

  it.each(["valid", "spam", "empty", "failure"])("preserves general contact %s", async (kind) => {
    const data = zoneForm();
    data.delete("motivo");
    if (kind === "spam") data.set("sitioWeb", "bot");
    if (kind === "empty") data.set("message", "");
    if (kind === "failure") send.mockRejectedValueOnce(new ContactMailerSendError("detail"));
    const html = await postHtml(data);
    expect(html).not.toContain("/publicar/paso/zona");
    expect(html).toContain(
      kind === "empty"
        ? "Revisá los datos"
        : kind === "failure"
          ? "No pudimos enviar"
          : "Recibimos tu mensaje",
    );
  });

  it.each(["valid", "empty", "spam"])(
    "propagates configuration failure before %s evaluation",
    async (kind) => {
      const error = new ContactMailerNotConfiguredError("test-config");
      // biome-ignore lint/complexity/useArrowFunction: This double is invoked with new.
      vi.mocked(ResendContactMailer).mockImplementationOnce(function () {
        throw error;
      });
      const data = zoneForm();
      if (kind === "empty") data.set("message", "");
      if (kind === "spam") data.set("sitioWeb", "bot");
      await expect(sendContactMessageAction(data)).rejects.toBe(error);
      expect(sendContactMessage).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    },
  );

  it("propagates unexpected delivery errors without a redirect", async () => {
    const error = new Error("unexpected");
    send.mockRejectedValueOnce(error);
    await expect(sendContactMessageAction(zoneForm())).rejects.toBe(error);
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("sendContactMessageAction — el cable", () => {
  it("pasa al caso de uso los cuatro campos, con la trampa bajo el nombre `honeypot` que el dominio espera", async () => {
    sendContactMessage.mockResolvedValueOnce({ kind: "valid" });

    await expect(submit()).rejects.toBeInstanceOf(RedirectSignal);

    expect(sendContactMessage).toHaveBeenCalledWith(
      {
        name: "María Pérez",
        email: "maria@example.com",
        message: "Hola, una pregunta.",
        honeypot: "",
      },
      expect.anything(),
    );
  });

  it("redirige al acuse de envío cuando el resultado es válido", async () => {
    sendContactMessage.mockResolvedValueOnce({ kind: "valid" });

    await expect(submit()).rejects.toBeInstanceOf(RedirectSignal);

    expect(redirect).toHaveBeenCalledWith(`/ayuda/escribinos?${CONTACT_SENT_PARAM}`);
  });

  it("redirige al MISMO acuse de envío cuando el resultado es spam — no delata la trampa", async () => {
    sendContactMessage.mockResolvedValueOnce({ kind: "spam" });

    await expect(submit()).rejects.toBeInstanceOf(RedirectSignal);

    expect(redirect).toHaveBeenCalledWith(`/ayuda/escribinos?${CONTACT_SENT_PARAM}`);
  });

  it("redirige al aviso de error cuando el resultado es inválido", async () => {
    sendContactMessage.mockResolvedValueOnce({
      kind: "invalid",
      violations: ["message-too-short"],
    });

    await expect(submit()).rejects.toBeInstanceOf(RedirectSignal);

    expect(redirect).toHaveBeenCalledWith(`/ayuda/escribinos?${CONTACT_ERROR_PARAM}`);
  });
});
