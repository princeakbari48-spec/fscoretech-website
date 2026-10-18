import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, SignJWT, jwtVerify } from "jose";
import { makeDownloadHandler } from "../functions/downloads/[[path]].js";
const { privateKey, publicKey } = await generateKeyPair("RS256");
const issuer = "https://test-team.cloudflareaccess.com";
let reads = 0;
const env = {
  ACCESS_TEAM_DOMAIN: issuer,
  ACCESS_AUD: "expected-audience",
  INSTALLER_MANIFEST: JSON.stringify({
    approved: { key: "private/actual-build", filename: "approved.bin" },
  }),
  PRIVATE_INSTALLERS: {
    get: async () => {
      reads++;
      return { body: "installer bytes" };
    },
  },
};
const handler = makeDownloadHandler(jwtVerify, () => publicKey);
const sign = (aud = env.ACCESS_AUD, exp = "2h", iss = issuer) =>
  new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setSubject("authorized-user")
    .setIssuedAt()
    .setIssuer(iss)
    .setAudience(aud)
    .setExpirationTime(exp)
    .sign(privateKey);
const call = (token, path = "approved", method = "GET", config = env) =>
  handler({
    request: new Request(`https://preview.pages.dev/downloads/${path}`, {
      method,
      headers: token ? { "Cf-Access-Jwt-Assertion": token } : {},
    }),
    env: config,
  });
test("fails closed without settings or identity", async () => {
  assert.equal((await call(null, "approved", "GET", {})).status, 503);
  assert.equal((await call()).status, 401);
  assert.equal(reads, 0);
});
test("rejects forged, expired, wrong audience and wrong issuer JWTs before reading storage", async () => {
  for (const token of [
    "fake.jwt.token",
    await sign("wrong"),
    await sign(env.ACCESS_AUD, -1),
    await sign(env.ACCESS_AUD, "2h", "https://wrong.cloudflareaccess.com"),
  ])
    assert.equal((await call(token)).status, 403);
  assert.equal(reads, 0);
});
test("only allows manifest entries after signature validation; no caching or redirects", async () => {
  const token = await sign();
  assert.equal((await call(token, "unknown")).status, 404);
  assert.equal((await call(token, "private/actual-build")).status, 404);
  const result = await call(token);
  assert.equal(result.status, 200);
  assert.equal(await result.text(), "installer bytes");
  assert.equal(result.headers.get("Cache-Control"), "private, no-store");
  assert.equal(result.headers.get("Location"), null);
  assert.equal(await (await call(token, "approved", "HEAD")).text(), "");
  assert.equal((await call(token, "approved", "POST")).status, 405);
});
