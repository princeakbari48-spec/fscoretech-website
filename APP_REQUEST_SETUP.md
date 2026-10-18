# Application access request setup

The Contact page posts to `/api/app-request`, a Cloudflare Pages Function. It does not send installers: each access request is reviewed by FSCoreTech.

## Providers and required configuration

Brevo transports website-generated messages to `contact@fscoretech.com`. Zoho Mail remains the mailbox host. Do not change the existing Zoho MX, SPF, or DKIM records as part of this setup.

Before enabling requests:

1. In Brevo, authorize `contact@fscoretech.com` or the `fscoretech.com` sender domain. Confirm the From address is allowed and that its sending authentication does not conflict with Zoho's existing SPF/DKIM setup.
2. Create a Cloudflare Turnstile widget with the hostnames `fscoretech.com` and `fscoretech-website.pages.dev`. The first hostname covers `www.fscoretech.com`; the Pages project hostname covers its commit and branch preview subdomains. Wildcards are not supported in Turnstile hostnames, but a listed hostname authorizes its subdomains. The server checks Turnstile's returned hostname against the request hostname. Do not add localhost to the production widget.
3. In Cloudflare Dashboard → Workers & Pages → `fscoretech-website` → Settings → Variables and Secrets, configure each environment independently:

   | Name | Type | Preview | Production |
   | --- | --- | --- | --- |
   | `BREVO_API_KEY` | Encrypted secret | Only if preview mail testing is approved | Required |
   | `TURNSTILE_SECRET_KEY` | Encrypted secret | Only if preview verification is configured | Required |
   | `TURNSTILE_SITE_KEY` | Public text variable | Only if preview verification is configured | Required |

   Add these at runtime, not as build variables. Never place secret values in the repository, issue, chat, screenshot, or deployment logs. The public site key is intentionally returned by `GET /api/app-request`; the secret keys must never be exposed.
4. Redeploy after changing runtime variables. Verify both environments show the expected names without revealing or copying secret values.
5. Use only synthetic contact data for delivery checks. Confirm receipt at `contact@fscoretech.com`, compare the reference in the email subject/body and success message, and verify the visitor address appears only as Reply-To. Brevo's API acceptance alone does not confirm inbox delivery.
6. Keep installer files private. This endpoint only sends request details and does not grant access or attach installers.

The endpoint returns success only after Turnstile verification passes and Brevo returns HTTP 201 with a message ID. This means the message was accepted for email delivery, not that it reached the inbox. For a timeout or uncertain result, the page asks the visitor to check email before resubmitting. Provider calls have time limits and no personal details or secrets are written to logs.

The server rejects oversized, malformed, cross-origin, invalid, or unverified requests. Keep Cloudflare abuse protections and monitoring enabled for `POST /api/app-request`; Turnstile does not replace rate limiting.

## Verified hosting details

The Pages project is `fscoretech-website`, linked to `princeakbari48-spec/fscoretech-website`. Its current build configuration is `npm ci && npm run build`, output directory `dist`, with the repository root as the project root. The production branch is `main`; Preview accepts all non-production branches. Runtime variables are separate in Preview and Production.

Before deployment, record the current production deployment and commit for rollback. Do not push the PR branch without explicit review approval: a push automatically creates a public Cloudflare preview deployment.
