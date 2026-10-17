// LHCI runs this script on its collection browser before Lighthouse navigates.
// Never pass the bypass header to Lighthouse/CDP: those headers are global.
async function authorizePreview({ url, secret, browser, fetch: request = fetch }) {
  const origin = new URL(url);
  if (
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    !secret
  ) {
    throw new Error("Invalid Lighthouse preview authentication configuration");
  }
  const response = await request(origin.href, {
    redirect: "manual",
    headers: {
      "x-vercel-protection-bypass": secret,
      "x-vercel-set-bypass-cookie": "true",
    },
  });
  const separated = typeof response.headers.getSetCookie === "function";
  const values = separated ? response.headers.getSetCookie() : [response.headers.get("set-cookie")];
  const raw = values.length === 1 ? values[0] : null;
  // Legacy combined headers cannot distinguish Expires commas from multiple cookies.
  // Reject domain cookies: Puppeteer's url-based cookie stays on the exact host.
  if (
    ![302, 303, 307, 308].includes(response.status) ||
    !raw ||
    (!separated && raw.includes(",")) ||
    /(?:^|;)\s*domain\s*=/i.test(raw) ||
    /(?:^|;)\s*path\s*=\s*(?!\/(?:;|$))[^;]*/i.test(raw)
  ) {
    throw new Error("Vercel bypass cookie unavailable");
  }
  const match = /^([!#$%&'*+.^_`|~\w-]+)=([^;,\s]+)(?:;|$)/.exec(raw);
  if (!match) throw new Error("Vercel bypass cookie unavailable");
  await browser.setCookie({
    name: match[1],
    value: match[2],
    url: origin.href,
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "Lax",
  });
}

module.exports = async (browser) => {
  await authorizePreview({
    url: process.env.PREVIEW_BASE_URL,
    secret: process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
    browser,
  });
};
module.exports.authorizePreview = authorizePreview;
