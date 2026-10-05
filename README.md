# tinyurl-service

A small URL shortener built with Node.js, Express and TypeScript. It turns long URLs into short codes, redirects short codes to the original URL, and supports optional expiration.

Storage is an in-memory mock, so data resets whenever the server restarts.

## Features

- **Shorten:** turns an `http`/`https` URL into a random 6-character code.
- **Redirect:** `GET /:code` sends a 302 redirect to the original URL.
- **Unique codes:** every new code is checked against storage, so no two links share a code.
- **Expiration:** a link can expire after a number of seconds or at a fixed date. Expired links return `410 Gone`.

## Getting started

Requires Node.js 20 or later.

```bash
npm install
npm run dev        # start with reload on file changes (http://localhost:3000)
```

| Script | What it does |
|---|---|
| `npm run dev` | Run from source, reloading on changes |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build |
| `npm test` | Run the unit tests |

Set the `PORT` environment variable to use a port other than 3000.

## API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/urls` | Create a short URL |
| `GET` | `/api/urls` | List all entries, each with an `expired` flag |
| `GET` | `/api/urls/:code` | Get the entry for a code |
| `DELETE` | `/api/urls/:code` | Delete an entry |
| `GET` | `/:code` | Redirect to the original URL |

### Create a short URL

```bash
curl -X POST http://localhost:3000/api/urls \
  -H "Content-Type: application/json" \
  -d '{"fullUrl": "https://example.com/some/long/path", "expiresInSeconds": 3600}'
```

```json
{
  "tinyUrl": "MAFovT",
  "fullUrl": "https://example.com/some/long/path",
  "createdAt": "2026-10-05T10:00:00.000Z",
  "expiresAt": "2026-10-05T11:00:00.000Z"
}
```

Request body:

| Field | Required | Description |
|---|---|---|
| `fullUrl` | yes | The URL to shorten. Must be `http` or `https`. |
| `expiresInSeconds` | no | Expire this many seconds from now. Must be positive. |
| `expiresAt` | no | Expire at this date (ISO 8601). Must be in the future. |

Send at most one of `expiresInSeconds` and `expiresAt`. Leave both out for a link that never expires.

Shortening the same URL again without an expiration returns the existing code. A request with an expiration always creates a new code, so each expiring link has its own timer.

### Errors

Errors come back as `{ "error": "<message>" }`.

| Status | When |
|---|---|
| `400` | Invalid URL or invalid expiration options |
| `404` | The code does not exist |
| `410` | The code has expired |
| `503` | No free code could be generated after several attempts |

## Project structure

```
src/
├── index.ts                        # Wires the layers together and starts the server
├── routes/urlRoutes.ts             # Maps URLs to controller methods
├── controllers/urlController.ts    # Reads requests, sends responses
├── services/urlService.ts          # Business logic: validation, code generation, expiration
├── repositories/urlRepository.ts   # UrlRepository interface + in-memory mock
├── models/url.ts                   # UrlEntry and ShortenOptions types
└── data/mockDb.ts                  # Seed data
test/
└── urlService.test.ts              # Unit tests for the business layer
```

Each layer only calls the layer below it. `UrlService` depends on the `UrlRepository` interface, not the mock itself, so a real database can be added by writing another class that implements the interface and passing it in `src/index.ts`.

`UrlService` can also be given a clock and a code generator. The tests use these to check expiration and code collisions without waiting on real time.

## Seed data

| Code | Redirects to | Expires |
|---|---|---|
| `abc123` | https://www.google.com | never |
| `gh4x9z` | https://github.com | never |
| `nodejs` | https://nodejs.org/en/docs | 2030-01-01 |
| `old001` | https://example.com/expired | already expired (returns 410) |
