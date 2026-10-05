import { randomInt } from "crypto";
import { UrlRepository } from "../repositories/urlRepository";
import { ShortenOptions, UrlEntry } from "../models/url";

const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export class ServiceError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export interface UrlServiceConfig {
  codeLength?: number;
  maxGenerateAttempts?: number;
  /** Injectable clock so expiration is testable. */
  now?: () => Date;
  /** Injectable code generator, mainly for testing collisions. */
  generateCode?: (length: number) => string;
}

function randomCode(length: number): string {
  let code = "";
  for (let i = 0; i < length; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export class UrlService {
  private readonly codeLength: number;
  private readonly maxGenerateAttempts: number;
  private readonly now: () => Date;
  private readonly generateCode: (length: number) => string;

  constructor(private readonly repo: UrlRepository, config: UrlServiceConfig = {}) {
    this.codeLength = config.codeLength ?? 6;
    this.maxGenerateAttempts = config.maxGenerateAttempts ?? 10;
    this.now = config.now ?? (() => new Date());
    this.generateCode = config.generateCode ?? randomCode;
  }

  getAll(): UrlEntry[] {
    return this.repo.findAll();
  }

  isExpired(entry: UrlEntry): boolean {
    return entry.expiresAt !== undefined && entry.expiresAt.getTime() <= this.now().getTime();
  }

  /** Returns the entry for a short code. 404 if unknown, 410 if expired. */
  resolve(tinyUrl: string): UrlEntry {
    const entry = this.repo.findByTinyUrl(tinyUrl);
    if (!entry) throw new ServiceError("Tiny URL not found", 404);
    if (this.isExpired(entry)) throw new ServiceError("Tiny URL has expired", 410);
    return entry;
  }

  shorten(fullUrl: unknown, options: ShortenOptions = {}): UrlEntry {
    if (typeof fullUrl !== "string" || !isValidUrl(fullUrl)) {
      throw new ServiceError("A valid http(s) fullUrl is required", 400);
    }
    const expiresAt = this.parseExpiration(options);

    // A permanent link can be shared, so reuse it when no expiration is requested.
    if (!expiresAt) {
      const permanent = this.repo.findByFullUrl(fullUrl).find((e) => !e.expiresAt);
      if (permanent) return permanent;
    }

    return this.repo.insert({
      tinyUrl: this.uniqueCode(),
      fullUrl,
      createdAt: this.now(),
      ...(expiresAt && { expiresAt }),
    });
  }

  remove(tinyUrl: string): void {
    if (!this.repo.delete(tinyUrl)) throw new ServiceError("Tiny URL not found", 404);
  }

  private uniqueCode(): string {
    // Expired codes stay reserved, so a stale link can never point somewhere new.
    for (let i = 0; i < this.maxGenerateAttempts; i++) {
      const code = this.generateCode(this.codeLength);
      if (!this.repo.findByTinyUrl(code)) return code;
    }
    throw new ServiceError("Could not generate a unique short code", 503);
  }

  private parseExpiration({ expiresInSeconds, expiresAt }: ShortenOptions): Date | undefined {
    if (expiresInSeconds !== undefined && expiresAt !== undefined) {
      throw new ServiceError("Provide either expiresInSeconds or expiresAt, not both", 400);
    }
    if (expiresInSeconds !== undefined) {
      if (typeof expiresInSeconds !== "number" || !Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
        throw new ServiceError("expiresInSeconds must be a positive number", 400);
      }
      return new Date(this.now().getTime() + expiresInSeconds * 1000);
    }
    if (expiresAt !== undefined) {
      const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
      if (Number.isNaN(date.getTime())) throw new ServiceError("expiresAt must be a valid date", 400);
      if (date.getTime() <= this.now().getTime()) {
        throw new ServiceError("expiresAt must be in the future", 400);
      }
      return date;
    }
    return undefined;
  }
}
