import { NextRequest } from "next/server";
import { authPageText } from "../domain/auth-page-copy";

/** Adapt only the native pages and two exact broken destinations; authentication stays in Auth.js. */
export async function authPageResponse(request: Request, response: Response): Promise<Response> {
  if (request.method !== "GET") return response;
  const url = new URL(request.url);
  const configured = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (configured) url.host = new URL(configured).host;
  if (configured) url.protocol = new URL(configured).protocol;
  const signin = `${url.origin}/api/auth/signin`;
  if (
    url.pathname === "/api/auth/callback/google" &&
    response.status === 302 &&
    response.headers.get("location") === `${url.href}/signin`
  ) {
    const headers = new Headers(response.headers);
    headers.set("location", signin);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
  const error = url.searchParams.get("error");
  const verification =
    url.pathname === "/api/auth/error" && error === "Verification" && response.status === 403;
  const configuration =
    url.pathname === "/api/auth/error" && error === "Configuration" && response.status === 500;
  const login =
    url.pathname === "/api/auth/signin" &&
    response.status === 200 &&
    (error === null || error === "OAuthCallbackError" || error === "OAuthAccountNotLinked");
  if (
    !(verification || configuration || login) ||
    !response.headers.get("content-type")?.startsWith("text/html")
  )
    return response;
  const verificationHref = verification ? `${new NextRequest(url, request).url}/signin` : null;
  const stack: string[] = [];
  // Raw script/style blocks and quoted attributes are opaque, including markup-looking strings.
  const tokens =
    (await response.text()).match(
      /<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<!--[\s\S]*?-->|<(?:[^>"']|"[^"]*"|'[^']*')*>|[^<]+/gi,
    ) ?? [];
  const html = tokens
    .map((token) => {
      if (/^<(script|style)\b|^<!--/i.test(token)) return token;
      if (!token.startsWith("<")) return authPageText(stack.at(-1) ?? "", token);
      const tag = /^<\/?([a-z][\w-]*)/i.exec(token)?.[1]?.toLowerCase();
      if (!tag) return token;
      if (token.startsWith("</")) stack.pop();
      else if (!/^(meta|link|input|img|hr|br)$/.test(tag) && !token.endsWith("/>")) stack.push(tag);
      return token.replace(
        /(\s+)([\w:-]+)(?:=("[^"]*"|'[^']*'))?/g,
        (attribute, space, name, value) => {
          if (tag === "html" && name === "lang" && value === '"en"') return `${space}lang="es"`;
          if (verification && tag === "a" && name === "href" && value === `"${verificationHref}"`)
            return `${space}href="${signin}"`;
          return attribute;
        },
      );
    })
    .join("");
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
