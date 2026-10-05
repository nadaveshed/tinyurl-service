import { UrlEntry } from "../models/url";

/** Storage contract the business layer depends on. Swap in a real DB by implementing this. */
export interface UrlRepository {
  findAll(): UrlEntry[];
  findByTinyUrl(tinyUrl: string): UrlEntry | undefined;
  findByFullUrl(fullUrl: string): UrlEntry[];
  insert(entry: UrlEntry): UrlEntry;
  delete(tinyUrl: string): boolean;
}

/** Mock implementation backed by a Map keyed by short code. */
export class InMemoryUrlRepository implements UrlRepository {
  private readonly table = new Map<string, UrlEntry>();

  constructor(seed: UrlEntry[] = []) {
    for (const entry of seed) this.table.set(entry.tinyUrl, { ...entry });
  }

  findAll(): UrlEntry[] {
    return [...this.table.values()];
  }

  findByTinyUrl(tinyUrl: string): UrlEntry | undefined {
    return this.table.get(tinyUrl);
  }

  findByFullUrl(fullUrl: string): UrlEntry[] {
    return this.findAll().filter((e) => e.fullUrl === fullUrl);
  }

  insert(entry: UrlEntry): UrlEntry {
    // Acts like a unique index on tinyUrl.
    if (this.table.has(entry.tinyUrl)) {
      throw new Error(`Duplicate short code: ${entry.tinyUrl}`);
    }
    this.table.set(entry.tinyUrl, entry);
    return entry;
  }

  delete(tinyUrl: string): boolean {
    return this.table.delete(tinyUrl);
  }
}
