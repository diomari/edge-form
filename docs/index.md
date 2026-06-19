---
layout: home

hero:
  name: edge-form
  text: Cloudflare contact form backend
  tagline: Self-hostable form endpoint with spam protection, D1 storage, delivery adapters, dashboard, and CSV export.
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: API Reference
      link: /api

features:
  - title: Edge-native
    details: Built on Cloudflare Workers with D1 storage and scheduled cleanup support.
  - title: Spam controls
    details: Honeypot, rate limiting, request validation, and link-heavy message checks.
  - title: Delivery adapters
    details: Forward accepted submissions through Resend or a signed webhook.
  - title: Admin workflow
    details: Protected admin API, dashboard, summary metrics, detail view, and CSV export.
---

## What it is

`edge-form` is a self-hostable backend for contact forms on static sites, portfolios, client sites, and small business websites.

It accepts submissions, stores them in D1, optionally forwards them to email or webhooks, and gives you an admin dashboard for review and export.

## Documentation map

- [Getting Started](/getting-started)
- [D1 Setup](/d1-setup)
- [API Reference](/api)
- [Examples](/examples)
- [Operations](/operations)
- [Vitest Guide](/vitest)
- [Security & Privacy](/security/privacy)
