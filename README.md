# LensLink — Photo Delivery Portal for Professional Photographers

Professional photo delivery platform inspired by FotoOwl. Photographers (admins)
create galleries, upload photos or **import them from Google Drive**, and LensLink
**auto-generates a private share link**. Clients open the link and instantly see
exactly the photos the photographer selected — no app, no account needed.

## Quick start

```bash
npm install
npm start
```

Open **http://localhost:3000**

Demo photographer account: **admin@lenslink.app / admin123**

## What you get

| Role | Does |
|---|---|
| Photographer (admin) | Creates admin/customer accounts, builds galleries, uploads many photos at once, imports photos from Google Drive, gets one share link per gallery, shares via copy / WhatsApp / email |
| Customer (user) | Sees galleries shared to their email in their account, opens link and browses/downloads photos |
| Link visitors | Open `/s/{code}` → animated gallery with lightbox + full-res downloads |

## Features

- **Automated share links** — every gallery gets a unique `/s/CODE` link the moment it's created; the link serves *only* the photos the admin selected
- **Google Drive integration** — OAuth connect (read-only), search & browse your Drive images, multi-select and import; photos are proxied through your server so clients never see Drive URLs
- **Team management** — admin creates photographers and customer accounts, edits roles/passwords, deletes accounts
- **Curated gallery builder** — drag-and-drop multi upload, click-to-select tiles, batch delete, double-click to open finder
- **Customer portal** — galleries shared with your email appear automatically
- **Professional animated UI** — porcelain-white + cobalt theme, glass navbar, floating hero montage, scroll reveals, animated counters, marquee, skeleton loaders, toast feedback, keyboard-navigable lightbox

## Google Drive setup (optional but recommended)

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable the **Google Drive API**
3. Create an **OAuth Client ID** (Web application)
4. Authorized redirect URI: `http://localhost:3000/api/drive/callback`
5. Copy `.env.example` → `.env` and paste `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
6. Restart the server. In the admin panel, open the *Google Drive* tab and click **Continue with Google**

Without credentials the app still works fully via local uploads.

## Project structure

```
server.js            Express API + Google Drive proxy + OAuth
src/db.js            JSON-file persistence (data/db.json)
src/util.js          link-code generator & helpers
test-api.js          End-to-end API smoke tests (node test-api.js)
public/
  index.html         Landing page (animated hero, features, testimonials…)
  login.html         Sign in / create account
  admin.html         Photographer studio panel (galleries, upload, Drive, team)
  account.html       Customer portal (shared galleries)
  view.html          Public gallery page  (/s/CODE)
  css/style.css      Full design system + animations
  js/                shared API client, UI kit, admin logic
uploads/             Uploaded photos
data/                db.json + drive token
```

## Security notes

- Passwords hashed with bcrypt; sessions are 30-day JWT bearer tokens
- Role guards on every admin route; customer access limited to their own galleries
- Share links are unguessable 10-char codes — the code *is* the secret
- Drive tokens stored only on your server (`data/drive-token.json`), scope read-only