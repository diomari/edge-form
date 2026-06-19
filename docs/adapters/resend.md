# Resend Adapter

The Resend adapter sends each accepted contact form submission as an email.

## Required secrets

```sh
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put MAIL_FROM
npx wrangler secret put MAIL_TO
```

Example values:

```text
RESEND_API_KEY=re_xxxxx
MAIL_FROM=Contact Form <forms@example.com>
MAIL_TO=owner@example.com
```

`MAIL_FROM` must use a sender domain allowed by your Resend account.

## Behavior

For accepted submissions, the Worker sends a plain-text email containing:

- name
- email
- subject
- message
- submission id
- created timestamp

The submitter email is set as `reply_to`, so replies from your mailbox should go to the person who submitted the form.

## Missing config

If any required Resend secret is missing, the adapter is marked as `skipped`. The public form response still succeeds after the submission is stored.

## Failure handling

If Resend returns a non-2xx response:

- a `delivery_events` row is recorded with `status = failed`
- the submission `delivery_status` may become `failed`
- the public form response is not changed

Use the dashboard detail view or `wrangler tail` to inspect failures.
