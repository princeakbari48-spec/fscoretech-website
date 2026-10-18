# Review, merge, and Cloudflare deployment

## Preserve current services

Continue PR #1 (`feature/fsp-multi-app-catalog` to `main`): https://github.com/princeakbari48-spec/fscoretech-website/pull/1.

Before merging, inspect the existing Cloudflare project `fscoretech-website`: production branch, build command/output directory, custom domains, environment variables, R2 bindings, Functions, routes, redirects, Access policies, and deployment controls. Record the current production deployment ID for rollback. The repository contains no backend API implementation or DNS configuration; their live state has not been audited. Preserve existing service settings. Do not assign new domains or replace API routes.

Cloudflare does not convert a Git-integrated project into a dashboard Direct Upload project. It supports Wrangler uploads to the existing Git-integrated project. Retaining that project avoids a domain migration. See [Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/) and [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

## Publish the branch for review

1. From the checkout run `npm ci`, `npm test`, and `npm run build`.
2. Confirm `git branch --show-current` prints `feature/fsp-multi-app-catalog`. Review `git diff`, then commit and push to that branch. No force push is needed.
3. Existing Git preview automation may deploy when the branch is pushed. Inspect its settings first: it must not treat this feature branch as production. A static build uses `npm run build` and output directory `dist`; Wrangler bundles the top-level `functions/` directory. Preserve unrelated environment settings.
4. For manual preview authenticate with `npx wrangler login` on your computer, then run:

```sh
npx wrangler pages deploy dist --project-name=fscoretech-website --branch=feature/fsp-multi-app-catalog
```

Use the returned preview URL; do not assume deployment succeeded. For an existing Git-integrated project you can disable automatic deployments on all branches and continue manual Wrangler uploads. Make that operational change deliberately after recording current settings.

## Configure and verify installer authentication

1. Configure a Cloudflare Access self-hosted application for the intended existing download hostname/path (`/downloads` and `/downloads/*`). Use an explicit approved-user/group allow policy, no bypass or public rule. Do not change DNS as part of this review.
2. Set matching `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` in the target Pages environment. Add the private `PRIVATE_INSTALLERS` R2 binding. Keep `INSTALLER_MANIFEST` empty until approved real installers are ready. Match the preview audience/policy to its host if testing login there.
3. Confirm R2 has no r2.dev public access, no public custom-domain delivery, and no other public object endpoint. Never place installers in `assets`, `dist`, GitHub releases, or a public bucket. Remove any separately existing public copies before treating distribution as protected.
4. Redeploy preview after environment/binding changes. On an unconfigured preview `/downloads/anything` returns 503. With configuration an anonymous request must reach an Access login challenge or return 401; a forged JWT must return 403. Test custom domain, immutable preview URL, branch alias, and pages.dev production hostname. Direct private R2 object URLs must not serve files.
5. Sign in as an allowed user and download an approved manifest entry; compare its bytes/checksum to the source installer. Test an unauthorized user, expired token, wrong audience, and wrong issuer; none may read bytes. Verify `Cache-Control: private, no-store` and no redirect to a public file URL. No real installer/authentication acceptance test has been performed by this source change.
6. Only after these checks add real download links to application pages. Until then the site offers contact-based access requests and no installer links.

JWT validation follows [Cloudflare Access application-token guidance](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/). Function-side signature validation prevents a spoofed header or unprotected preview alias from bypassing authentication.

## Review and merge PR #1

Check homepage/catalog/product/contact/legal pages at desktop and phone widths; verify navigation, keyboard focus, menu expansion/Escape, email composition, telephone links, old HTML URLs, and legal links. Inspect PR checks and the latest Cloudflare preview, not an earlier deployment.

**Merging `main` may immediately deploy production under the existing Git integration.** For a separate manual release first disable automatic production deployments in the existing Pages project and confirm the setting. After review merge PR #1 through GitHub. Do not delete/recreate the Pages project or alter DNS.

Then update the local checkout:

```sh
git switch main
git pull --ff-only origin main
npm ci
npm test
npm run build
npx wrangler pages deploy dist --project-name=fscoretech-website --branch=main
```

The last command is the production publishing step **only if `main` is the project's recorded production branch**. Use the recorded branch if different; never guess. Execute only when ready to release. Confirm deployment success and smoke-test existing custom-domain URLs and external API integrations. Production download variables/bindings and Access policies must be verified separately from Preview.

Rollback: use the recorded deployment in Cloudflare's Deployments rollback controls. Confirm previous version and access rules are restored; rollback must not expose installers.

## Email

Provision `fsp@fscoretech.com` with the chosen mailbox provider separately. Before any later DNS edit inventory existing MX/TXT records and services, then apply only provider-required records through a separate reviewed change. This website update changes no DNS and does not establish that the mailbox can receive mail. Phone contact remains +13466588850.
