# momo

I got tired of dumb chatbots and support tools that take a week to set up. Most of them are either too limited to be useful or so complicated you need a consultant to turn them on. So I built the one I wanted.

momo learns your website and documents, answers your visitors like a person who actually read everything, and hands the conversation to your team when it should. No flows to draw, no decision trees, no ticket maze. Point it at your site, check the answers, add the widget. That's it.

I think the way websites talk to their visitors is broken, and this is my attempt at rethinking it from scratch. This is only the first version. There is a lot more coming.

## What you get today

- Answers grounded in your own website, PDFs, Word files, text and Q&A
- An embeddable chat widget you can theme
- Live inbox where your team can take over any conversation
- Human handoff that collects the details you care about first
- Contacts, labels, and team members
- Bring your own model through OpenRouter

## Cloud version

Don't want to run it yourself? There is a hosted version at **[askmomo.eu](https://askmomo.eu)**. Try it there first if you just want to see how it feels.

## Run it yourself

You need Docker. That's all.

```bash
cp .env.production.example .env.production   # fill in the secrets (openssl rand -hex 32)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Open http://localhost:3000 and create the first account. It becomes the one and only admin, and sign-up is closed for good after that. Everyone else is added by the admin from the Team page. The onboarding walks you through the rest.

This starts Postgres, Redis, the database migration, the web app and the worker. Your data lives in Docker volumes (`pgdata`, `redisdata`, `uploads`), so back those up.

### Development

Dev uses a separate setup: Docker runs only Postgres and Redis, and the app runs on your machine.

```bash
pnpm install
docker compose up -d
cp .env.example .env
ln -s ../../.env apps/web/.env   # Next.js only reads .env from its own folder
pnpm --filter @momo/db generate
pnpm --filter @momo/db migrate
pnpm --filter @momo/web dev
pnpm --filter @momo/worker dev   # second terminal, handles ingestion
```

### Notes for a real deployment

- Put a reverse proxy with HTTPS in front (Caddy or nginx) and set `BETTER_AUTH_URL` to the public https address.
- Set `BETTER_AUTH_SECRET` and `ENCRYPTION_KEY`. Your OpenRouter key is stored encrypted (AES-256-GCM) with `ENCRYPTION_KEY`, so back it up. Passwords are hashed.
- Postgres and Redis are not exposed outside Docker in the production setup.
- Keep your secrets out of the repo. A secrets manager beats a plaintext `.env` on a server.
- Behind a reverse proxy, make sure it sets `X-Forwarded-For` so visitor IPs are right.
- The website crawler refuses private and internal addresses in production (this stops the app being tricked into probing your network). In development it allows them, so localhost works. Set `ALLOW_PRIVATE_URLS=true` to crawl an intranet or a staging box in production.
- Visitor country lookup is off by default because it calls a third party. Set `GEOIP_LOOKUP=true` to turn it on.
- Run a single web container. Live updates, presence and rate limits are kept in memory.

## License

momo is source available under the [PolyForm Internal Use License 1.0.0](LICENSE).

In plain words: you can use it and change it for your own company or personal projects. You can not sell it, resell it, host it for other people, or hand copies to anyone else. If you want to do any of that, talk to me.

## Contributing

Pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first, every contribution needs to agree to the [CLA](CLA.md).

## Security

Found a vulnerability? Please email the address on my GitHub profile instead of opening a public issue.
