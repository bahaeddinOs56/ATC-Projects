# ATC PROJECTS SARL

Site + admin backoffice (Express).

## Local

```bash
npm install
npm start
```

- Site: http://localhost:5173  
- Admin: http://localhost:5173/admins  

## Free host (Render)

1. Push this repo to GitHub (private OK).
2. Go to https://dashboard.render.com → **New** → **Blueprint** (or Web Service) → connect the repo.
3. Free plan · Build `npm install` · Start `npm start`.
4. Set env vars: `ADMIN_PASSWORD`, `SESSION_SECRET` (Render can auto-generate).
5. After deploy: `https://YOUR-APP.onrender.com` and `/admins`.

**Limits of free Render:** app sleeps after ~15 min idle (first load ~30–60s). Disk is ephemeral — admin edits/uploads can reset on redeploy; keep important logos/content in the repo when possible.
