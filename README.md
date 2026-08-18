# ATC PROJECTS SARL

Site + admin backoffice (Express locally / on a VPS).

## Local (full admin)

```bash
npm install
npm start
```

- Site: http://localhost:5173  
- Admin: http://localhost:5173/admins  

## Netlify (site only)

Static deploy — public site works. Admin cannot save (no server disk).

Connect the GitHub repo in Netlify, or:

```bash
npx netlify deploy --prod
```

Content is served from `data/content.json`. To update the live site: edit content locally → commit → push (or redeploy).
