import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("request page has labeled required fields, verification, and no-script email fallback", async () => {
  const page = await read("../contact.html");
  for (const field of ["name", "email", "phone", "address", "application", "details"]) {
    assert.match(page, new RegExp(`name="${field}"`));
  }
  assert.match(page, /id="turnstile-widget"/);
  assert.match(page, /id="request-submit" disabled/);
  assert.match(page, /<noscript>[\s\S]*mailto:contact@fscoretech\.com/);
  assert.match(page, /role="status" aria-live="polite"/);
});

test("each app detail page preselects its application on the request form", async () => {
  const pages = [
    ["../projects.html", "FSP%20Calling%20Line"],
    ["../media-player.html", "FSP%20Media%20Player"],
    ["../downloader.html", "FSP%20Download%20Manager"],
    ["../muslim-route.html", "Muslim%20Route"],
  ];
  for (const [path, app] of pages) {
    assert.match(await read(path), new RegExp(`contact\\.html\\?app=${app}#access-request`));
  }
  const script = await read("../assets/js/main.js");
  assert.match(script, /URLSearchParams\(location\.search\)/);
  assert.match(script, /application\.value = desired/);
});

test("form script blocks unverified/duplicate submits and resets a single-use token", async () => {
  const script = await read("../assets/js/main.js");
  assert.match(script, /!verificationToken/);
  assert.match(script, /if \(sending \|\| !requestForm\.reportValidity\(\)\) return/);
  assert.match(script, /turnstile\.reset\(widgetId\)/);
  assert.match(script, /max-width: 380px/);
  assert.match(script, /Delivery could not be confirmed/);
  assert.match(script, /Please email contact@fscoretech\.com/);
});
