# Fantasy League OS

Cross-platform fantasy football companion — league sync, treasury, invites, engagement, and AI insights.

## Stack

- **Mobile:** Expo (dev client) + React Native + TypeScript
- **API:** Fastify + Drizzle ORM + PostgreSQL + Redis/BullMQ
- **Packages:** `@flos/shared`, `@flos/league-adapters`

## Quick Start

### 1. Infrastructure

```bash
docker compose up -d
```

### 2. Install & migrate

```bash
npx pnpm@9 install
npx pnpm@9 --filter @flos/shared build
npx pnpm@9 --filter @flos/league-adapters build
cp apps/api/.env.example apps/api/.env
npx pnpm@9 db:migrate
```

### 3. Run API

```bash
npx pnpm@9 --filter @flos/api dev
```

API listens on `0.0.0.0:3000`. Verify: `curl http://localhost:3000/health`

### 4. Run mobile (Expo Go on your phone)

```bash
# Find your Mac LAN IP
ipconfig getifaddr en0

# apps/mobile/.env.development
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3000

cd apps/mobile
npx pnpm@9 install
npx expo start
```

Scan the QR code with **Expo Go** on your iPhone or Android phone. Phone and Mac must be on the same Wi‑Fi.

Buy-ins use **Stripe Web Checkout** in the in-app browser — no native Stripe SDK or dev client build required.

### 5. Stripe test cards + webhooks

Works on any Mac/Linux machine — no Homebrew. The CLI downloads into `.tools/stripe/` (gitignored).

**One-time per machine** (after `cp apps/api/.env.example apps/api/.env`):

```bash
# apps/api/.env — same sk_test_ key works on every machine (dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_...

pnpm stripe:login          # links this Mac to your Stripe test account
pnpm stripe:listen         # auto-downloads CLI if missing; keep this terminal open
# Copy whsec_... → STRIPE_WEBHOOK_SECRET in apps/api/.env, restart API
```

**Every dev session:** run `pnpm stripe:listen` in one terminal, API + mobile in others.

**In the app:** Commissioner sets buy-in → Member pays with `4242 4242 4242 4242`. Tap **Reset payment** to retest.

**No Stripe keys:** leave `STRIPE_SECRET_KEY` empty for instant dev-mode payments (no browser).

## Project Structure

```
apps/mobile/     Expo app
apps/api/        REST API + webhooks
packages/shared/ Types, Zod schemas, API client
packages/league-adapters/ Sleeper, Yahoo, ESPN adapters
```

## API Routes

| Group | Endpoints |
|---|---|
| Auth | `/auth/register`, `/auth/login`, `/auth/me` |
| Imports | `/imports/sleeper/leagues`, `/imports/espn/validate` |
| Leagues | `/leagues`, `/leagues/:id/sync`, standings, matchups |
| Invites | `/invites`, `/invites/:token`, `/invites/redeem` |
| Treasury | `/leagues/:id/treasury`, `/leagues/:id/payments/checkout`, payouts |
| Engagement | feed, polls, awards, power rankings, recaps |
| AI | `/ai/doctor`, `/ai/waiver`, `/ai/trade` |

## Phone Testing Checklist

1. Health screen shows API connected over Wi-Fi
2. Create league via Sleeper username
3. Generate invite → text yourself → tap deep link
4. Pay buy-in (Stripe Checkout in browser, or dev mode without Stripe keys)
5. View treasury, standings, matchups
