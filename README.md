# FS Core Tech website

Static deployment package for **fscoretech.com**.

## Pages
- `index.html` — Home
- `projects.html` — FS Calling Line / Projects
- `about.html` — About
- `contact.html` — Contact
- `privacy.html` — Privacy Policy
- `terms.html` — Terms

## Replace the GitHub placeholder
Edit only:

`assets/js/config.js`

Change:

```js
githubUrl: "https://github.com/YOUR-USERNAME/fscoretech"
```

to your real public repository URL.

## Local preview
From this folder run:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Cloudflare Pages (simple deployment)
1. Put these files in the root of a GitHub repository.
2. In Cloudflare, open **Workers & Pages → Create application → Pages → Connect to Git**.
3. Choose the repository.
4. Framework preset: **None**.
5. Build command: leave blank.
6. Build output directory: `/` (repository root) if Cloudflare accepts it; otherwise use a project with these files in the selected output root.
7. Deploy.
8. In the Pages project, open **Custom domains → Set up a custom domain** and add `fscoretech.com`.

You can also use Cloudflare Pages direct upload because this site has no build step.

## Notes
- No analytics or trackers are included by default.
- Contact uses `mailto:` and does not require a server.
- `_headers` adds lightweight security headers when supported by the host.
