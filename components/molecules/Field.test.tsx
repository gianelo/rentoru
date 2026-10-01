import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Field } from "./Field";

function render(error?: string) {
  return renderToStaticMarkup(
    <Field name="message" label="Mensaje" help="Ayuda externa" error={error}>
      {(attrs) => <textarea {...attrs} />}
    </Field>,
  );
}

it("announces external help on the control, with or without a server error", () => {
  const clean = render();
  expect(clean).toMatch(/<textarea[^>]*aria-describedby="message-help"/);
  expect(clean).toContain('id="message-help">Ayuda externa</p>');
  const invalid = render("Mensaje requerido");
  expect(invalid).toMatch(
    /<textarea[^>]*aria-invalid="true"[^>]*aria-describedby="message-error message-help"/,
  );
  expect(invalid).toContain('id="message-error">Mensaje requerido</p>');
  expect(invalid).toContain('id="message-help">Ayuda externa</p>');
});
