# Examples

This project includes ready-to-use form examples in the `examples/` directory.

## Basic HTML form

File: `examples/basic-form.html`

Use this when you want a simple static form that posts directly to the Worker endpoint.

Key points:

- standard HTML `form` submit
- includes hidden honeypot field
- works well for simple static sites

## Fetch-based form

File: `examples/fetch-form.html`

Use this when you want custom client-side success and error messaging.

Key points:

- uses `fetch()` with JSON
- resets the form on success
- shows inline status text
- includes hidden honeypot field

## Honeypot field example

The default honeypot field is:

```html
<input name="_gotcha" hidden autocomplete="off" />
```

Keep this field hidden from users and leave it empty in legitimate submissions.

## Example endpoint

Replace:

```text
https://YOUR_WORKER_URL/api/submit
```

with your deployed Worker URL.

## Related docs

- [Getting Started](/getting-started)
- [API Reference](/api)
- [Security & Privacy](/security/privacy)
