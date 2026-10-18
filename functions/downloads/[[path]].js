import { createRemoteJWKSet, jwtVerify } from "jose";

const keysets = new Map();
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  Vary: "Cookie, Cf-Access-Jwt-Assertion",
};
function reply(text, status) {
  return new Response(text, { status, headers });
}

// Also validates on preview/pages.dev hosts, where an Access edge policy may not apply.
export function makeDownloadHandler(
  verify = jwtVerify,
  getKeys = (domain) => {
    if (!keysets.has(domain))
      keysets.set(
        domain,
        createRemoteJWKSet(new URL(`${domain}/cdn-cgi/access/certs`)),
      );
    return keysets.get(domain);
  },
) {
  return async ({ request, env }) => {
    if (!["GET", "HEAD"].includes(request.method))
      return new Response("Method not allowed", {
        status: 405,
        headers: { ...headers, Allow: "GET, HEAD" },
      });
    const domain = env.ACCESS_TEAM_DOMAIN;
    if (
      !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain || "") ||
      !env.ACCESS_AUD ||
      !env.PRIVATE_INSTALLERS
    )
      return reply(
        "Installer access is not configured. Contact FSCoreTech.",
        503,
      );
    const token =
      request.headers.get("Cf-Access-Jwt-Assertion") ||
      request.headers
        .get("Cookie")
        ?.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1];
    if (!token) return reply("Authentication required.", 401);
    try {
      await verify(token, getKeys(domain), {
        issuer: domain,
        audience: env.ACCESS_AUD,
        algorithms: ["RS256"],
        requiredClaims: ["exp", "iat", "sub"],
      });
    } catch {
      return reply("Access denied.", 403);
    }
    let files;
    try {
      files = JSON.parse(env.INSTALLER_MANIFEST || "{}");
    } catch {
      return reply("Installer access is not configured.", 503);
    }
    const id = new URL(request.url).pathname.replace(/^\/downloads\/?/, "");
    if (!/^[a-z0-9-]+$/.test(id) || !Object.hasOwn(files, id))
      return reply("Installer not found.", 404);
    const file = files[id];
    if (
      !file ||
      typeof file.key !== "string" ||
      !/^[a-zA-Z0-9_.-]+$/.test(file.filename || "")
    )
      return reply("Installer access is not configured.", 503);
    const object = await env.PRIVATE_INSTALLERS.get(file.key);
    if (!object) return reply("Installer not found.", 404);
    return new Response(request.method === "HEAD" ? null : object.body, {
      headers: {
        ...headers,
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${file.filename}"`,
      },
    });
  };
}
export const onRequest = makeDownloadHandler();
