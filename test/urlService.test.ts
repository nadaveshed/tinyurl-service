import { test } from "node:test";
import assert from "node:assert/strict";
import { InMemoryUrlRepository } from "../src/repositories/urlRepository";
import { ServiceError, UrlService, UrlServiceConfig } from "../src/services/urlService";

function setup(config: UrlServiceConfig = {}) {
  let now = new Date("2026-01-01T00:00:00Z");
  const advance = (ms: number) => {
    now = new Date(now.getTime() + ms);
  };
  const service = new UrlService(new InMemoryUrlRepository(), { now: () => now, ...config });
  return { service, advance };
}

function assertStatus(fn: () => unknown, status: number) {
  assert.throws(fn, (err) => err instanceof ServiceError && err.status === status);
}

test("shorten + resolve round-trips", () => {
  const { service } = setup();
  const entry = service.shorten("https://example.com/a/very/long/path");
  assert.match(entry.tinyUrl, /^[A-Za-z0-9]{6}$/);
  assert.equal(service.resolve(entry.tinyUrl).fullUrl, "https://example.com/a/very/long/path");
});

test("rejects invalid URLs", () => {
  const { service } = setup();
  assertStatus(() => service.shorten("not a url"), 400);
  assertStatus(() => service.shorten("ftp://example.com"), 400);
  assertStatus(() => service.shorten(undefined), 400);
});

test("unknown code returns 404", () => {
  const { service } = setup();
  assertStatus(() => service.resolve("nope"), 404);
});

test("codes are unique across many URLs", () => {
  const { service } = setup();
  const codes = new Set<string>();
  for (let i = 0; i < 1000; i++) codes.add(service.shorten(`https://example.com/${i}`).tinyUrl);
  assert.equal(codes.size, 1000);
});

test("retries on collision and fails after max attempts", () => {
  const codes = ["aaaaaa", "aaaaaa", "bbbbbb"];
  const { service } = setup({ generateCode: () => codes.shift() ?? "aaaaaa", maxGenerateAttempts: 3 });
  assert.equal(service.shorten("https://one.com").tinyUrl, "aaaaaa");
  assert.equal(service.shorten("https://two.com").tinyUrl, "bbbbbb");
  assertStatus(() => service.shorten("https://three.com"), 503);
});

test("same permanent URL reuses its code; expiring links get their own", () => {
  const { service } = setup();
  const a = service.shorten("https://example.com");
  const b = service.shorten("https://example.com");
  const c = service.shorten("https://example.com", { expiresInSeconds: 60 });
  assert.equal(a.tinyUrl, b.tinyUrl);
  assert.notEqual(a.tinyUrl, c.tinyUrl);
});

test("expiresInSeconds: resolves before, 410 after", () => {
  const { service, advance } = setup();
  const entry = service.shorten("https://example.com", { expiresInSeconds: 60 });
  advance(59_000);
  assert.equal(service.resolve(entry.tinyUrl).fullUrl, "https://example.com");
  advance(1_000);
  assertStatus(() => service.resolve(entry.tinyUrl), 410);
});

test("expiresAt: absolute date works", () => {
  const { service, advance } = setup();
  const entry = service.shorten("https://example.com", { expiresAt: "2026-01-02T00:00:00Z" });
  assert.ok(service.resolve(entry.tinyUrl));
  advance(24 * 60 * 60 * 1000);
  assertStatus(() => service.resolve(entry.tinyUrl), 410);
});

test("invalid expiration options are rejected", () => {
  const { service } = setup();
  const url = "https://example.com";
  assertStatus(() => service.shorten(url, { expiresInSeconds: 0 }), 400);
  assertStatus(() => service.shorten(url, { expiresInSeconds: -5 }), 400);
  assertStatus(() => service.shorten(url, { expiresAt: "garbage" }), 400);
  assertStatus(() => service.shorten(url, { expiresAt: "2020-01-01" }), 400);
  assertStatus(() => service.shorten(url, { expiresInSeconds: 10, expiresAt: "2030-01-01" }), 400);
});
