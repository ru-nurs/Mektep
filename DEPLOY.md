# Deploy

## Supabase

Use the pooled Supabase connection string for `DATABASE_URL`.
If the database password contains special characters, encode them in the URL.
For example, `:` becomes `%3A` and `@` becomes `%40`.

Create or update the schema from this repo:

```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
npx prisma db push --schema apps/api/prisma/schema.prisma
```

## Render API

Create a Web Service from the GitHub repo.
Render can read `render.yaml`, or you can set these manually:

```text
Build Command: npm ci && npm run build -w api
Start Command: npm run start -w api
Health Check Path: /health
```

Environment variables:

```env
NODE_ENV=production
HOST=0.0.0.0
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/postgres?pgbouncer=true&connection_limit=1&sslmode=require
JWT_SECRET=generate-a-long-random-secret-at-least-32-chars
CORS_ORIGIN=https://YOUR_VERCEL_APP.vercel.app
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-key
```

The API also accepts Vercel preview and branch domains that match `https://*.vercel.app`.

## Vercel Web

Create a project from the GitHub repo. Vercel can read `vercel.json`.

Environment variables:

```env
VITE_API_BASE_URL=https://YOUR_RENDER_API.onrender.com
```
