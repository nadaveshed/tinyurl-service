import { UrlEntry } from "../models/url";

// Seed data for the in-memory mock "database" — resets on every restart.
export const seedUrls: UrlEntry[] = [
  { tinyUrl: "abc123", fullUrl: "https://www.google.com", createdAt: new Date("2026-01-01") },
  { tinyUrl: "gh4x9z", fullUrl: "https://github.com", createdAt: new Date("2026-02-15") },
  {
    tinyUrl: "nodejs",
    fullUrl: "https://nodejs.org/en/docs",
    createdAt: new Date("2026-03-10"),
    expiresAt: new Date("2030-01-01"),
  },
  {
    tinyUrl: "old001",
    fullUrl: "https://example.com/expired",
    createdAt: new Date("2025-01-01"),
    expiresAt: new Date("2025-06-01"),
  },
];
