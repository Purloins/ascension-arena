# Ascension Arena — Backend

osu! LAN tournament backend. Next.js 14 + NextAuth (osu! OAuth) + Prisma 5 + Neon Postgres, deployed on Vercel.

## Stack
- Next.js 14 (App Router)
- NextAuth v5 + osu! OAuth
- Prisma 5 (ORM)
- Neon Postgres (provisioned through Vercel)
- Zod (validation)

---

## Setup

### 1. Install
    npm install

### 2. Create the database in Vercel
- Vercel dashboard -> Storage -> Create Database -> Neon
- Pick a region close to you (ap-southeast-1 / Singapore if available)

### 3. Get connection strings
- Open the Neon database -> .env.local / Quickstart tab
- Pooled connection  -> DATABASE_URL
- Unpooled / direct  -> DIRECT_URL

### 4. osu! OAuth app
- osu.ppy.sh/home/account/edit -> OAuth -> New OAuth Application
- Callback URL:
    Local:      http://localhost:3000/api/auth/callback/osu
    Production: https://your-domain.vercel.app/api/auth/callback/osu

### 5. Env vars
    cp .env.example .env.local
Fill in the values. Generate AUTH_SECRET with:
    openssl rand -base64 32

### 6. Create tables
    npx prisma migrate dev --name init

### 7. Run
    npm run dev
Open http://localhost:3000

---

## Deploying to Vercel
1. Push this repo to GitHub.
2. Import it at vercel.com/new.
3. If you created the Neon DB through Vercel Storage, DATABASE_URL is wired automatically.
   Add the remaining vars (AUTH_SECRET, OSU_CLIENT_ID, OSU_CLIENT_SECRET, DIRECT_URL,
   ADMIN_USER_IDS, feature flags) in Project Settings -> Environment Variables.
4. Add your Vercel domain to the osu! OAuth callback list.
5. Deploy. Then run migrations against prod:
       DATABASE_URL="your-direct-url" npx prisma migrate deploy

---

## API Reference

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET    | /api/register            | Any               | Current user registration status |
| POST   | /api/register            | osu! login        | Register for the tournament |
| GET    | /api/players             | Public            | List registered players |
| GET    | /api/teams               | Public            | List all teams |
| POST   | /api/teams               | Registered player | Create a team |
| GET    | /api/teams/:id           | Public            | Get one team |
| POST   | /api/teams/:id           | Registered player | Join a team |
| DELETE | /api/teams/:id           | Team member       | Leave a team |
| POST   | /api/matches/:id/scores  | Staff             | Submit scores for a map pick |
| POST   | /api/admin/roll          | Admin             | Run the element roll |
| GET    | /api/admin/roll          | Admin             | Roll session + results |

---

## Element roll
1. All PENDING players fetched.
2. A seed is generated from the timestamp (show it on stream for transparency).
3. Elements distributed as evenly as possible (~25% each).
4. Player order and element pool shuffled with the seed (reproducible).
5. Written atomically; players move PENDING -> ACTIVE with an element.

POST /api/admin/roll while logged in as an admin (set ADMIN_USER_IDS).

## HP / targeting
- Targeting modifier: +/-15% based on the weakness cycle.
- Multi-target: when several players target one opponent, the average of their
  adjusted score differences is the HP damage applied.
- Cycle: WITCH -> HUMAN -> DEMIGOD -> SOULWEAVER -> WITCH
