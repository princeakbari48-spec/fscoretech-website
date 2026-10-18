const MAX_BODY_BYTES = 32 * 1024;
const validApps = new Set([
  "FSP Calling Line",
  "FSP Media Player",
  "FSP Download Manager",
  "Muslim Route",
  "General enquiry",
]);

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
      character
    ],
  );

const hasForbiddenControls = (value, allowWhitespace = false) =>
  allowWhitespace
    ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
    : /[\u0000-\u001f\u007f]/.test(value);

async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RangeError("Request body is too large.");
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function onRequestGet({ env }) {
  if (!env.TURNSTILE_SITE_KEY) {
    return json({ error: "Request verification is not configured." }, 503);
  }
  return json({ siteKey: env.TURNSTILE_SITE_KEY });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  try {
    if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
      return json({ error: "Origin not allowed." }, 403);
    }
  } catch {
    return json({ error: "Invalid origin." }, 403);
  }

  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    return json({ error: "Expected a JSON request." }, 415);
  }
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return json({ error: "Request is too large." }, 413);
  }

  let data;
  try {
    const bytes = await readBody(request);
    data = JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    if (error instanceof RangeError) return json({ error: "Request is too large." }, 413);
    return json({ error: "Invalid form data." }, 400);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return json({ error: "Invalid form data." }, 400);
  }
  if (typeof data.website === "string" && data.website.trim()) {
    return json({ error: "The request could not be accepted. Please check the form and try again." }, 400);
  }

  const fields = {
    name: [120, 2],
    email: [254, 6],
    phone: [40, 7],
    address: [280, 3],
    application: [60, 1],
    details: [5000, 15],
    turnstileToken: [2048, 1],
  };
  for (const [key, [maximum, minimum]] of Object.entries(fields)) {
    if (
      typeof data[key] !== "string" ||
      data[key].trim().length < minimum ||
      data[key].length > maximum ||
      hasForbiddenControls(data[key], key === "details")
    ) {
      return json({ error: "Please complete all required fields correctly." }, 400);
    }
  }

  const name = data.name.trim();
  const email = data.email.trim();
  const phone = data.phone.trim();
  const address = data.address.trim();
  const application = data.application.trim();
  const details = data.details.trim();
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !/^[+()\d.\-\s]{7,40}$/.test(phone) ||
    phone.replace(/\D/g, "").length < 7 ||
    !validApps.has(application)
  ) {
    return json({ error: "Please check your email, phone number and application." }, 400);
  }
  if (!env.TURNSTILE_SECRET_KEY || !env.BREVO_API_KEY) {
    return json({ error: "Online requests are temporarily unavailable. Please email contact@fscoretech.com." }, 503);
  }

  let verification;
  try {
    const response = await fetchWithTimeout(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET_KEY,
          response: data.turnstileToken,
        }),
      },
      8000,
    );
    if (!response.ok) throw new Error("Verification service rejected the request.");
    verification = await response.json();
  } catch {
    return json({ error: "Security verification is temporarily unavailable. Please try again." }, 503);
  }
  const requestHostname = new URL(request.url).hostname;
  if (
    !verification?.success ||
    verification.hostname !== requestHostname ||
    verification.action !== "app-request"
  ) {
    return json({ error: "Security verification expired or failed. Please try again." }, 403);
  }

  const reference = crypto.randomUUID();
  const safe = {
    name: escapeHtml(name),
    email: escapeHtml(email),
    phone: escapeHtml(phone),
    address: escapeHtml(address),
    application: escapeHtml(application),
    details: escapeHtml(details).replace(/\r?\n/g, "<br>"),
  };
  const htmlContent =
    `<h2>New FSCoreTech website request</h2><p><b>Reference:</b> ${reference}</p>` +
    `<p><b>Application:</b> ${safe.application}</p><p><b>Name:</b> ${safe.name}</p>` +
    `<p><b>Email:</b> ${safe.email}</p><p><b>Phone:</b> ${safe.phone}</p>` +
    `<p><b>Address:</b> ${safe.address}</p><p><b>Details:</b><br>${safe.details}</p>`;
  const textContent =
    `New FSCoreTech website request\nReference: ${reference}\n` +
    `Application: ${application}\nName: ${name}\nEmail: ${email}\n` +
    `Phone: ${phone}\nAddress: ${address}\n\nDetails:\n${details}`;

  try {
    const sent = await fetchWithTimeout(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": env.BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: "FSCoreTech Website", email: "contact@fscoretech.com" },
          to: [{ email: "contact@fscoretech.com", name: "FSCoreTech" }],
          replyTo: { email, name },
          subject: `Application access request: ${application} [${reference}]`,
          htmlContent,
          textContent,
        }),
      },
      10000,
    );
    if (!sent.ok) {
      return json({ error: "We could not send your request. Please email contact@fscoretech.com directly." }, 502);
    }
    const receipt = await sent.json().catch(() => null);
    if (sent.status !== 201 || typeof receipt?.messageId !== "string" || !receipt.messageId) {
      return json({ error: "Delivery could not be confirmed. Please check your email before resubmitting." }, 502);
    }
    return json({ ok: true, reference, message: "Your request was accepted for email delivery." });
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return json(
      {
        error: timedOut
          ? "We could not confirm delivery before the request timed out. Please check your email before resubmitting."
          : "We could not confirm delivery. Please check your email before resubmitting.",
      },
      504,
    );
  }
}

export async function onRequest({ request, env }) {
  if (request.method === "POST") return onRequestPost({ request, env });
  if (request.method === "GET") return onRequestGet({ env });
  return json({ error: "Method not allowed." }, 405);
}
