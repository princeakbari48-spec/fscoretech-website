# Application request implementation review

## Current production and rollback reference

- Pages project: `fscoretech-website`
- Git repository: `princeakbari48-spec/fscoretech-website`
- Production branch: `main`
- Production commit at review: `7c3b7b83f6c7d3cf3498bc236942bd948f8d3082`
- Active production deployment: `3cd428f8.fscoretech-website.pages.dev`
- Production domains: `fscoretech.com`, `www.fscoretech.com`, and `fscoretech-website.pages.dev`
- Build command: `npm ci && npm run build`; output: `dist`; project root: repository root
- Production and Preview runtime variable lists were empty when inspected on October 18, 2026.
- The account had no Turnstile widgets when inspected on October 18, 2026.
- Automatic production deployments are enabled for `main`; automatic Preview deployments are enabled for all non-production branches. Preview URLs are public by default.

## Changes prepared locally

- Route `/api/app-request` through Pages Functions while retaining the protected download routes.
- Add same-origin and JSON checks, a streaming 32 KiB body cap, input and control-character validation, server-side Turnstile checks, timeouts, escaped HTML and plain-text email, accurate Brevo acceptance checks, and request references.
- Load the public Turnstile site key at runtime; block duplicate or unverified submissions, preserve form contents after errors, reset single-use verification, and provide accessible status messages and a no-JavaScript email fallback.
- Use Turnstile's flexible width on most viewports and compact mode on narrow mobile screens.
- Update the privacy policy and document provider, environment, preview-host, and rollout requirements.
- Keep installers outside this endpoint and preserve the existing private-download function.

## Still needed before an end-to-end production release

- Authorize `contact@fscoretech.com` as a Brevo sender and verify domain authentication does not conflict with Zoho records.
- Configure Turnstile and add the `BREVO_API_KEY`, `TURNSTILE_SECRET_KEY`, and `TURNSTILE_SITE_KEY` settings in each intended environment. No key values were inspected or changed.
- Run an approved preview after reviewing the concrete diff. Pushing the PR branch triggers a public Cloudflare preview, so this local branch has not been pushed.
- Verify the four app links, desktop and mobile layout, Turnstile behavior, provider failure states, and real synthetic-message receipt in Zoho, including the reference, sender authentication, and Reply-To.
- Obtain explicit approval before merging or deploying to production.

## Evidence limits

Local provider mocks can verify request construction and response handling, but cannot establish Brevo authorization, successful inbox delivery, live Turnstile configuration, or production behavior. Real delivery should use synthetic data and the approved Preview environment after the required secrets and verification hosts are in place.
