# Self-Hosted Deployment Guide

This app is currently developed on Lovable Cloud (managed Supabase + Cloudflare Workers SSR). This guide explains how to export it and run it on **your own infrastructure** — VPS, EC2, DigitalOcean, GCP VM, Oracle Cloud Free Tier, or Kubernetes.

> **Important:** the source code in this repo is portable. The Lovable preview will keep running on Lovable Cloud — these instructions are for *outside* Lovable.

---

## 1. Get the code out of Lovable

In the Lovable editor: **+ menu → GitHub → Connect project**. After authorizing, your code is mirrored to a new GitHub repo. Clone it on your server:

```bash
git clone git@github.com:YOUR_ORG/YOUR_REPO.git
cd YOUR_REPO
```

Database data (existing rows) export: **Cloud → Database → Tables → export CSV** per table. Schema (migrations) is already in `supabase/migrations/`.

---

## 2. Switch the SSR build target to Node

TanStack Start is configured for Cloudflare Workers in `vite.config.ts`. For a Node container, add to your config:

```ts
// vite.config.ts
export default defineConfig({
  tanstackStart: {
    server: { entry: "server", preset: "node-server" },
  },
});
```

This makes `bun run build` emit `.output/server/index.mjs` which the `Dockerfile` runs.

---

## 3. One-command local stack (Docker Compose)

```bash
cp .env.example .env
# edit .env — fill POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY (see §4)
docker compose up -d
# App on http://localhost  ·  Supabase API on http://localhost/supabase/
```

Services included: app (Node SSR), Postgres, GoTrue (auth), PostgREST (data API), Realtime, Storage, Kong gateway, nginx reverse proxy.

### Generating `ANON_KEY` and `SERVICE_ROLE_KEY`

These are JWTs signed with your `JWT_SECRET`. Easiest tool: <https://supabase.com/docs/guides/self-hosting/docker#api-keys> (paste your JWT_SECRET, copy the two keys). Or with `node`:

```js
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;
console.log('ANON_KEY=', jwt.sign({ role: 'anon', iss: 'supabase' }, secret, { expiresIn: '10y' }));
console.log('SERVICE_ROLE_KEY=', jwt.sign({ role: 'service_role', iss: 'supabase' }, secret, { expiresIn: '10y' }));
```

### Apply migrations

The Postgres container auto-runs anything in `supabase/migrations/` on first boot (mounted via compose). For an existing volume:

```bash
docker compose exec db psql -U postgres -f /docker-entrypoint-initdb.d/<file>.sql
```

---

## 4. Deploy to a VPS (Ubuntu — EC2 / DigitalOcean / GCP / Oracle)

```bash
# On a fresh Ubuntu 22.04 VM
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker $USER && newgrp docker

git clone git@github.com:YOUR_ORG/YOUR_REPO.git && cd YOUR_REPO
cp .env.example .env  # edit
docker compose up -d
```

Point your domain's A record at the VM's IP. For HTTPS, install certbot and copy certs into `infra/certs/`:

```bash
sudo apt install -y certbot
sudo certbot certonly --standalone -d your-domain.com
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem infra/certs/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem  infra/certs/
# uncomment the 443 server block in infra/nginx.conf, then:
docker compose restart nginx
```

### Provider-specific notes
- **Oracle Cloud Free Tier (ARM):** use a multi-arch build (`docker buildx build --platform linux/arm64,linux/amd64`).
- **AWS EC2:** open ports 80/443 in the security group; consider RDS for Postgres in production.
- **DigitalOcean:** the $12 droplet runs this comfortably; their managed Postgres is a drop-in replacement (point `DATABASE_URL` at it and drop the `db` service from compose).
- **GCP Compute Engine:** use Cloud SQL for Postgres in prod; HTTPS via a global load balancer is an alternative to certbot.

---

## 5. Kubernetes

See `k8s/README.md`. Summary:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl create secret generic homiebytes-env --from-env-file=.env -n homiebytes
kubectl apply -f k8s/
```

Production checklist:
- Replace `homiebytes-env` Secret with **sealed-secrets** or **external-secrets** (AWS Secrets Manager / GCP Secret Manager).
- Move Postgres to a managed offering (RDS, Cloud SQL, DO Managed DB).
- Configure HPA on the `app` Deployment.
- Set up backups: `pg_dump` to S3/GCS on a CronJob.

---

## 6. Integrations to wire post-export

These were placeholders or Lovable-managed; provide your own keys in `.env`:

| Service | Env vars | Notes |
|---|---|---|
| Google Maps | `GOOGLE_MAPS_BROWSER_KEY` | Required for maps + autocomplete. Restrict by HTTP referrer. |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Add redirect URI `https://your-domain.com/supabase/auth/v1/callback` |
| Razorpay | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Replaces current Stripe sandbox |
| Twilio Verify | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SID` | Phone OTP |
| Resend | `RESEND_API_KEY` | Transactional email |
| FCM | `FCM_SERVER_KEY` | Push notifications |
| PostHog | `POSTHOG_API_KEY` | Replace/augment GA4 |

---

## 7. What's NOT exported

These pieces are Lovable-platform features and won't follow the code to your VPS:
- **Lovable AI Gateway** (`LOVABLE_API_KEY`) — if you use it, you'll need an OpenAI/Gemini key and a small shim.
- **Lovable's connector gateway** (`connector-gateway.lovable.dev`) — used for Google Maps Platform via Lovable. Self-hosted, call Google APIs directly with `GOOGLE_MAPS_BROWSER_KEY` / a server key.
- **Lovable preview / managed deploys** — replaced by your `docker compose up`.

---

## 8. Backups

```bash
# Daily backup cron
0 3 * * *  docker compose exec -T db pg_dump -U postgres postgres | gzip > /backups/db-$(date +\%F).sql.gz
```

Restore: `gunzip -c db-2026-01-01.sql.gz | docker compose exec -T db psql -U postgres postgres`

---

## Roadmap (continuing in Lovable)

- **M2:** Delivery partner role + dashboard, live location, FCM push.
- **M3:** Razorpay payment integration (alongside Stripe), Twilio OTP, Resend templates.
- **M4:** Coupon engine, banners, support tickets, audit logs, admin commission/refund tools.

Each milestone keeps the schema portable so you can re-export at any point.
