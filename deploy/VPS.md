# Deploying `relay-api` on a VPS

Docker Compose + Caddy on any Ubuntu 22.04+ box. Automatic HTTPS via
Let's Encrypt. About 20 minutes from zero to public URL.

## 1. Pick a VPS

| Provider | Region | Cost | Notes |
|----------|--------|------|-------|
| Hetzner Cloud CX22 | Falkenstein / Ashburn | €4.51/mo (~$4.90) | Best value, 2 vCPU / 4 GB / 40 GB SSD |
| DigitalOcean Basic | Bangalore | $6/mo | Closest to Indian target market |
| AWS Lightsail | Mumbai | $3.50/mo | Cheapest India-hosted, 512 MB RAM |
| Contabo VPS S | Singapore | $5.99/mo | 4 vCPU / 8 GB — overkill for MVP |
| Vultr Cloud Compute | Bangalore | $6/mo | Fine |

Relay's control plane is very light — the smallest tier at any of these
handles thousands of edges. Neon holds the DB; Cloudflare holds the video.

**Recommended: Hetzner CX22** unless India latency matters to you (then
Lightsail Mumbai or DigitalOcean Bangalore).

## 2. Point a domain at it

You need a hostname for Caddy to get a real TLS cert. Cheapest options:

- Buy a domain (~$10/yr) at Namecheap / Porkbun.
- Use a free subdomain from `duckdns.org` or `no-ip.com`.
- Use a subdomain of a domain you already own.

Once you have the domain, add an **A record** pointing to your VPS's public
IPv4 address. Wait 60 seconds for propagation.

## 3. Provision the VPS

SSH in as root and run these one-time setup commands:

```bash
# System updates + Docker
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh

# Firewall — only SSH, HTTP, HTTPS
apt install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Get the code
git clone https://github.com/VishweshMashru/Relay.git
cd Relay
```

## 4. Create `.env`

```bash
cp deploy/env.example .env
nano .env
```

Fill in:
- `RELAY_DOMAIN=api.your-domain.com` (matches the A record you set)
- `DATABASE_URL=postgresql://…` (from Neon)
- `ACCOUNT_ID=…` + `API_TOKEN=…` (from Cloudflare Stream)
- `RELAY_JWT_SECRET=$(openssl rand -hex 32)`
- `RELAY_ADMIN_TOKEN=$(openssl rand -hex 32)`

Save. `chmod 600 .env` so only root can read it.

## 5. Boot everything

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f
```

First boot takes ~2 minutes (Go build) + a few seconds for Caddy to
provision a TLS certificate. Then verify:

```bash
curl https://api.your-domain.com/v1/health
# → {"status":"ok"}
```

## 6. Point the dashboard at the new API

On your local machine, update `web/.env.local`:

```
RELAY_API_URL=https://api.your-domain.com
```

If you're deploying the dashboard to Vercel, set the same var there.
Redeploy the dashboard so it picks up the new URL.

## Operations

### Update

```bash
cd Relay
git pull
docker compose up -d --build
```

Zero-downtime is not built in — you get a ~30 second window where Caddy
returns 502 while the new relay-api container spins up. Acceptable for
now; can be improved with a blue/green setup later.

### View logs

```bash
docker compose logs -f relay-api
docker compose logs -f caddy
```

### Rotate a secret

```bash
nano .env               # edit the value
docker compose up -d    # picks up the new env
```

Note: rotating `RELAY_JWT_SECRET` invalidates every edge token you've
issued. Rotating `RELAY_ADMIN_TOKEN` requires updating the dashboard's
env var too.

### Restart

```bash
docker compose restart relay-api
```

### Take everything down

```bash
docker compose down
```

Data lives in Neon + Cloudflare, so nothing is lost.

## Cost math

At Hetzner CX22 (~$5/mo) + a domain (~$10/yr):

- Monthly: **~$5.85 all in** for the control plane
- Cloudflare Stream: **$5/mo** subscription + per-minute delivery
- Neon: **$0** on free tier until you outgrow it, then $19/mo Launch plan

Total: **$10–15/mo** for a real deployed product. Compare to Fly.io
which would run **$15–35/mo** with `min_machines_running = 1`.

## What breaks vs Fly

- **No auto-scaling.** Fine at this stage — vertically scale the VPS
  once you hit 500+ concurrent long-polls.
- **Manual deploys.** The `git pull && compose up` loop is fine until
  you want CI. GitHub Actions with SSH deploy is a 30-line workflow when
  you're ready.
- **No zero-downtime deploys** — brief 502 during rollout. See update
  section above.
- **You own the box.** Which also means you patch it — schedule a
  monthly `apt upgrade && reboot`.

None of these are dealbreakers for the current stage.
