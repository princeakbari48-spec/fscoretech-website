# App access request delivery setup

The Contact page posts to `/api/app-request`, a Cloudflare Pages Function, not a mailto link.

## Before publishing
1. In Brevo, verify `contact@fscoretech.com` (or the domain) as an authorized sender. This mailbox is hosted by Zoho; the Brevo service is only used to deliver website-generated messages.
2. Generate a Brevo API v3 key with email sending permission. Do not commit the key.
3. In Cloudflare Dashboard > Workers & Pages > the **Pages project** used by fscoretech.com > Settings > Variables and Secrets, add **BREVO_API_KEY** as an encrypted secret for Production (and separately for Preview if preview testing is desired). Redeploy to apply environment updates. Depending on dashboard version the setting may be under Variables and Secrets.
4. Test a submission for each app from the preview or deployed site, verify receipt at contact@fscoretech.com and the reply-to header.
5. For production traffic, configure Cloudflare WAF / rate-limiting protections for POST /api/app-request; the built-in honeypot is not a substitute for rate limiting or Turnstile.

The endpoint returns an error (not a fake success) when the key is unavailable or Brevo declines to accept the message. A success response means Brevo accepted the request, not guaranteed final inbox delivery.

Existing Zoho MX, SPF and DKIM records should be left intact; validate that Brevo sending authentication is appropriate for this domain to avoid SPF/DKIM conflicts.
