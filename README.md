# FSCoreTech website

Public application catalog at https://fscoretech.com. FSP Calling Line, FSP Media Player, and FSP Download Manager are completed applications, as confirmed by the owner. No version, platform compatibility, feature list, or installer is assumed.

The black, electric blue, and silver design uses the owner's original transparent globe emblem. Existing HTML URLs, legal pages, sitemap, robots directives, and external service configuration are retained. Legal copy was updated for the confirmed status and contact address.

Contact: **fsp@fscoretech.com**, **+13466588850**. Mailbox provisioning is separate; no mailbox or DNS records are created by this source change.

## Local checks

Requires Node.js 22 or newer and npm.

```sh
npm ci
npm test
npm run build
npx wrangler pages functions build functions --outdir .wrangler/compiled
npm run dev
```

Open the local URL printed by Wrangler. `dist` contains only allowlisted public files. Never deploy the repository root. Keep `functions/` alongside the working directory when deploying with Wrangler; dashboard drag-and-drop does not bundle these Functions.

## Private installers

No installers or public installer URLs are committed. Public calls to action lead to Contact until an approved download service is configured. The `/downloads/<id>` Function validates signed Cloudflare Access JWTs, issuer, audience, expiration, issued-at, and subject before reading a private R2 object. It rejects missing configuration, unknown identifiers, unapproved HTTP methods, and invalid identities. File bytes stream from R2 without redirecting to an origin URL, with `private, no-store` headers. This also applies on Pages preview aliases.

Required environment settings (configure Preview and Production separately):

- `ACCESS_TEAM_DOMAIN`: your exact `https://<team>.cloudflareaccess.com` issuer, without trailing slash.
- `ACCESS_AUD`: audience of the specific Access application with an explicit allow policy.
- `PRIVATE_INSTALLERS`: binding to a private R2 bucket. Disable its r2.dev endpoint and public custom domains; inspect existing bucket access before uploading anything.
- `INSTALLER_MANIFEST`: JSON object mapping approved URL identifiers to actual R2 object keys and safe attachment filenames. Default `{}` exposes nothing. Use verified build metadata, not guessed versions or filenames.

An entry has the structure `"approved-id": {"key": "actual-private-object-key", "filename": "actual-installer-filename"}`. These are placeholders, not published releases. Configure only verified builds. Every user allowed into this Access application can access every manifest entry; use separate applications/audiences for separate entitlements.

See [DEPLOYMENT.md](DEPLOYMENT.md) for staged merge and deployment instructions. This change does not provision Access, R2, mail, or DNS and does not deploy production.
