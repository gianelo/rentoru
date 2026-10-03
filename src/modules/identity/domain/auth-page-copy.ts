// Closed Auth.js presentation vocabulary; never applied to user values or attributes.
const COPY: Readonly<Record<string, string>> = {
  "title:Sign In": "Entrar",
  "h1:Unable to sign in": "No se pudo entrar",
  "p:The sign in link is no longer valid.": "El enlace para entrar ya no es válido.",
  "p:It may have been used already or it may have expired.":
    "Puede haberse utilizado o haber vencido.",
  "a:Sign in": "Entrar",
  "span:Sign in with Google": "Entrar con Google",
  "label:Email": "Correo",
  "button:Sign in with Correo": "Entrar con Correo",
  "p:Try signing in with a different account.": "Intenta entrar con otra cuenta.",
  "h1:Server error": "Error del servidor",
  "p:There is a problem with the server configuration.":
    "Hay un problema con la configuración del servidor.",
  "p:Check the server logs for more information.":
    "Consulta los registros del servidor para obtener más información.",
};

export function authPageText(context: string, text: string): string {
  return COPY[`${context}:${text}`] ?? text;
}
