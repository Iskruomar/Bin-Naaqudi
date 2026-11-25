# ISKAASHATADA BIN NAAKHUDI

Mobile-first accounting PWA for cooperatives (iskaashato): income and expenses, members grouped by family, dues reminders with call/WhatsApp links, role-based access, financial statements, backup and sharing. UI language: Somali.

- **Member app** (`public/index.html`): shared by everyone. Features depend on role.
- **Member portal** (`public/xubin/index.html`): read-only page for cooperative members: balance, full activity feed with search, Qaaraan/event tracker (collected vs spent), families and dues status, statements. It contains no write code. Admin links each account to a member record (Admin > Dadka) so people see their own contribution status.
- **Public page** (`public/dadweyne/index.html`): no login, for relatives and the wider community. It reads a single `pub/summary` document that the admin publishes from Admin > Dadweyne, so only chosen information is public (optional balance, optional anonymised feed, selected Qaaraan campaigns with targets, how to contribute, contact). Phone numbers and per-member amounts are never published. The page is `noindex`; share the link via WhatsApp.
- **Admin app** (`public/admin/index.html`): separate page for the super admin only (roles, corrections, deletions, settings, backup/restore, audit log).
- **Backend:** Firebase Authentication (email/password) + Cloud Firestore. No build step; the site is static and runs on GitHub Pages.

## Roles

| Role | Can do |
|---|---|
| `admin` | Everything: edit/delete entries, assign roles, settings, restore |
| `treasurer` | Add income, expenses and members |
| `adder` | Add income only |
| `viewer` | Read-only, uses the member portal (`/xubin/`); the main app redirects viewers there |
| `pending` | New sign-up awaiting approval (no data access) |

Permissions are enforced server-side in `firestore.rules`, not only in the UI.

## Setup

1. Create a Firebase project. Enable **Authentication > Email/Password** and create a **Firestore** database.
2. Add a Web app, then paste its config into `public/assets/js/config.js`.
3. Publish the rules: `firebase deploy --only firestore:rules` (or paste `firestore.rules` into the console).
4. Sign up once in the member app. In the Firestore console open `users/<your uid>` and set `role` to `admin`. Use `/admin/` from then on to approve everyone else.
5. Authentication > Settings > Authorized domains: add `<username>.github.io`.

## Deploy to GitHub Pages

1. Push this repository to GitHub (branch `main`).
2. Settings > Pages > Source: **GitHub Actions**. The workflow in `.github/workflows/pages.yml` publishes `public/`.
3. Open `https://<username>.github.io/<repo>/` (public: `/dadweyne/`, members: `/xubin/`, admin: `/admin/`).

## Local development

```
cd public && python3 -m http.server 8080
```

## Layout

```
public/            static site (app, xubin/ portal, admin/, assets, manifest, service worker)
firestore.rules    security rules
firebase.json      Firebase CLI config
.github/workflows  GitHub Pages deployment
```

## Backups

Admin > Kaydin > download JSON. Restore from the same page. Keep regular copies off-platform.

License: MIT
