import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequest } from "../functions/api/app-request.js";

const env = {
  TURNSTILE_SITE_KEY: "public-site-key",
  TURNSTILE_SECRET_KEY: "private-test-secret",
  BREVO_API_KEY: "private-test-brevo-key",
};

const validPayload = () => ({
  name: "Taylor Visitor",
  email: "taylor@example.com",
  phone: "+1 (555) 555-0100",
  address: "123 Example Street",
  application: "FSP Media Player",
  details: "I would like access for testing on my desktop computer.",
  turnstileToken: "valid-turnstile-token",
});

const requestFor = (payload, options = {}) =>
  new Request("https://preview.fscoretech-website.pages.dev/api/app-request", {
    method: options.method || "POST",
    headers: {
      Origin: "https://preview.fscoretech-website.pages.dev",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body ?? JSON.stringify(payload),
  });

const withFetch = async (mock, callback) => {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    await callback();
  } finally {
    globalThis.fetch = original;
  }
};

test("GET exposes only the public site key and fails closed when missing", async () => {
  const response = await onRequest({ request: new Request("https://site.test/api/app-request"), env });
  assert.deepEqual(await response.json(), { siteKey: "public-site-key" });
  const missing = await onRequest({ request: new Request("https://site.test/api/app-request"), env: {} });
  assert.equal(missing.status, 503);
  assert.doesNotMatch(await missing.text(), /private-test/);
});

test("rejects missing or cross-origin browser requests", async () => {
  const response = await onRequest({ request: requestFor(validPayload(), { headers: { Origin: "https://attacker.example" } }), env });
  assert.equal(response.status, 403);
  const noOrigin = new Request("https://preview.fscoretech-website.pages.dev/api/app-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validPayload()),
  });
  assert.equal((await onRequest({ request: noOrigin, env })).status, 403);
});

test("limits streamed bodies even when Content-Length is absent", async () => {
  const large = new Request("https://preview.fscoretech-website.pages.dev/api/app-request", {
    method: "POST",
    headers: { Origin: "https://preview.fscoretech-website.pages.dev", "Content-Type": "application/json" },
    body: JSON.stringify({ ...validPayload(), extra: "x".repeat(33 * 1024) }),
  });
  assert.equal((await onRequest({ request: large, env })).status, 413);
  const declaredLarge = requestFor(validPayload(), { headers: { "Content-Length": "40000" } });
  assert.equal((await onRequest({ request: declaredLarge, env })).status, 413);
});

test("validates required fields, application, phone and controls", async () => {
  for (const payload of [
    { ...validPayload(), email: "not-an-email" },
    { ...validPayload(), phone: "555" },
    { ...validPayload(), application: "Unreleased app" },
    { ...validPayload(), name: "Taylor\nVisitor" },
    { ...validPayload(), details: "short" },
  ]) {
    assert.equal((await onRequest({ request: requestFor(payload), env })).status, 400);
  }
  assert.equal(
    (await onRequest({ request: requestFor({ ...validPayload(), website: "bot filled this" }), env })).status,
    400,
  );
});

test("fails closed if either provider secret is missing", async () => {
  const response = await onRequest({
    request: requestFor(validPayload()),
    env: { TURNSTILE_SECRET_KEY: env.TURNSTILE_SECRET_KEY },
  });
  assert.equal(response.status, 503);
});

test("verifies Turnstile host and action, then sends escaped email to the fixed mailbox", async () => {
  await withFetch(async (url, options) => {
    if (String(url).includes("siteverify")) {
      assert.equal(options.method, "POST");
      assert.equal(new URLSearchParams(options.body).get("secret"), env.TURNSTILE_SECRET_KEY);
      return Response.json({ success: true, hostname: "preview.fscoretech-website.pages.dev", action: "app-request" });
    }
    assert.equal(String(url), "https://api.brevo.com/v3/smtp/email");
    assert.equal(options.headers["api-key"], env.BREVO_API_KEY);
    const message = JSON.parse(options.body);
    assert.deepEqual(message.to.map(({ email }) => email), ["contact@fscoretech.com"]);
    assert.equal(message.sender.email, "contact@fscoretech.com");
    assert.equal(message.replyTo.email, "taylor@example.com");
    assert.match(message.htmlContent, /Taylor &lt;Visitor&gt;/);
    assert.match(message.textContent, /Taylor <Visitor>/);
    assert.match(message.subject, /FSP Media Player/);
    return Response.json({ messageId: "mock-message-id" }, { status: 201 });
  }, async () => {
    const payload = { ...validPayload(), name: "Taylor <Visitor>" };
    const response = await onRequest({ request: requestFor(payload), env });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.ok, true);
    assert.match(result.reference, /^[0-9a-f-]{36}$/i);
  });
});

test("rejects Turnstile host or action mismatch without sending mail", async () => {
  let mailCalls = 0;
  await withFetch(async (url) => {
    if (String(url).includes("siteverify")) {
      return Response.json({ success: true, hostname: "wrong.example", action: "app-request" });
    }
    mailCalls++;
    return Response.json({ messageId: "unexpected" }, { status: 201 });
  }, async () => {
    const response = await onRequest({ request: requestFor(validPayload()), env });
    assert.equal(response.status, 403);
    assert.equal(mailCalls, 0);
  });
});

test("does not report success when Brevo rejects or omits its message id", async () => {
  for (const reply of [
    Response.json({ message: "not authorized" }, { status: 401 }),
    Response.json({}, { status: 201 }),
  ]) {
    await withFetch(async (url) =>
      String(url).includes("siteverify")
        ? Response.json({ success: true, hostname: "preview.fscoretech-website.pages.dev", action: "app-request" })
        : reply,
    async () => {
      const response = await onRequest({ request: requestFor(validPayload()), env });
      assert.notEqual(response.status, 200);
      assert.notEqual((await response.json()).ok, true);
    });
  }
});
