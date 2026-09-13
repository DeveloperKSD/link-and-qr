# Link Ticket

Paste a link, get a short URL and a QR code for it. React + Vite frontend,
Cloudflare Pages Functions + Workers KV for the shortener — no separate
backend to host or manage.

## What's inside

- `src/` — the React app (QR generation happens fully client-side with `qrcode.react`)
- `functions/api/shorten.js` — Pages Function that creates a short code and stores it in KV
- `functions/[code].js` — Pages Function that redirects `yourdomain.com/CODE` to the original link

## 1. Run it locally

```bash
npm install
```
```bash

npm run dev
```

This starts the Vite dev server, but `/api/shorten` won't work yet — that
route only exists as a Cloudflare Pages Function, not a Vite dev route.
To test the whole thing locally (including the function + KV), use
Wrangler instead:

```bash
npm run build
```

```bash
npx wrangler pages dev dist --kv LINKS
```

That serves the built app *and* runs the functions locally against a local
KV simulation.

## 2. Deploy to Cloudflare Pages

1. Push this project to a GitHub repo.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**, pick the repo.
3. Build settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Deploy once — it'll succeed, but shortening will fail until you add KV (step 5).

## 3. Create the KV namespace

In the dashboard: **Workers & Pages → KV → Create namespace**, name it
anything (e.g. `link-ticket-links`).

Or via CLI:
```bash
npx wrangler kv namespace create LINKS
```

## 4. Bind it to your Pages project

Dashboard: your Pages project → **Settings → Functions → KV namespace bindings**
→ Add binding:
- Variable name: `LINKS` (must match exactly — the code reads `env.LINKS`)
- KV namespace: the one you just created

Bind it for both **Production** and **Preview** environments.

## 5. Redeploy

Trigger a new deployment (push a commit, or hit "Retry deployment").
Shortening will now work — try pasting a link on the live site.

## Notes

- Short codes are random 6-character strings by default; you can also set
  a custom code per link in the form.
- The redirect function only runs for paths that don't match a real file
  in your build, so a short code can't accidentally collide with your
  actual site files.
- There's no analytics or link expiry here — trivial to add later by
  storing a JSON object (`{ url, createdAt, clicks }`) in KV instead of a
  plain string.

## About reactbits

You mentioned wanting to use [reactbits](https://reactbits.dev) for extra
polish — it's fine to use, but most of its components are copy-pasted
snippets rather than an npm install, and they lean on Tailwind + Framer
Motion. This project already ships a bespoke "ticket/stamp" visual system
(perforated edge, dashed stub divider, stamp animation) instead of generic
animated components, so you may not need it — but if you want to layer in
a specific reactbits effect (e.g. a text animation on the header), grab
that one component's code from their site and drop it into `src/`.
