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

You need Node 22, pnpm, and Docker (for Postgres and Redis only).

```bash
pnpm install
docker compose up -d          # Postgres (pgvector) and Redis, bound to localhost
cp .env.example .env          # then fill in the values
ln -s ../../.env apps/web/.env   # Next.js only reads .env from its own folder
pnpm --filter @momo/db generate
pnpm --filter @momo/db migrate
pnpm --filter @momo/web dev
pnpm --filter @momo/worker dev   # second terminal, handles ingestion
```

Open the app and create the first account. It becomes the one and only admin, and sign-up is closed for good after that. Everyone else is added by the admin from the Team page. The onboarding walks you through the rest.

### Notes for a real deployment

- Set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and `ENCRYPTION_KEY`, and serve the app over HTTPS. Your OpenRouter key is stored encrypted (AES-256-GCM) with `ENCRYPTION_KEY`, so back it up. Passwords are hashed.
- Change the default Postgres password in `docker-compose.yml` and keep Postgres and Redis off the public internet.
- Keep your secrets out of the repo. A secrets manager beats a plaintext `.env` on a server.
- Behind a reverse proxy, make sure it sets `X-Forwarded-For` so visitor IPs are right.
- The website crawler refuses private and internal addresses in production (this stops the app being tricked into probing your network). In development it allows them, so localhost works. Set `ALLOW_PRIVATE_URLS=true` to crawl an intranet or a staging box in production.
- Visitor country lookup is off by default because it calls a third party. Set `GEOIP_LOOKUP=true` to turn it on.
- Uploaded files live in `UPLOADS_DIR`. Point it at a persistent volume.

## License

momo is source available under the [PolyForm Internal Use License 1.0.0](LICENSE).

In plain words: you can use it and change it for your own company or personal projects. You can not sell it, resell it, host it for other people, or hand copies to anyone else. If you want to do any of that, talk to me.

## Security

Found a vulnerability? Please email the address on my GitHub profile instead of opening a public issue.
