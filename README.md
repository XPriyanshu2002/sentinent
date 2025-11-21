# sentinent-task

Monorepo for Sentinent Dynamics fullstack task:
- Angular frontend: `sentinent-frontend/`
- Serverless API (Vercel): `api/participants.js`, `api/contacts.js`
- Local dev API server (Express): `backend/server.js`
- DB (dev/demo): `data/db.json` (lowdb)

## Local development

### 1) Start local backend (Express)
```
cd backend
npm install
npm run dev
# API on http://localhost:4000
```

### 2) Start frontend
```
cd sentinent-frontend
npm install
ng serve --open
# Angular on http://localhost:4200
```

Frontend environment (for local dev) points to `http://localhost:4000/api`. When deploying to Vercel, set frontend environment `apiUrl` to `/api` so it calls Vercel serverless endpoints.

## Deploy to Vercel
1. Push repo to GitHub (public).
2. Create a new Vercel project -> import GitHub repo.
3. Root project is repository root. Vercel will automatically detect the `api/` functions and the Angular app build.
4. For Angular, set the build command to `npm run build --prefix sentinent-frontend` and output directory to `sentinent-frontend/dist/sentinent-frontend` (or adjust per your angular.json).
5. IMPORTANT: lowdb with local file `data/db.json` on Vercel is **ephemeral**; for persistent data use MongoDB / Postgres or host a persistent server.

## Notes
- Real-time updates are implemented via simple polling (every 3s) in the Angular app to be Vercel-friendly.
- For true WebSockets use Socket.io and deploy backend on Railway/Render (persistent server).