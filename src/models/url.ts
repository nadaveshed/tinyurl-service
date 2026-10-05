export interface UrlEntry {
  tinyUrl: string;
  fullUrl: string;
  createdAt: Date;
  /** Undefined means the URL never expires. */
  expiresAt?: Date;
}

export interface ShortenOptions {
  /** Expire this many seconds from now. */
  expiresInSeconds?: number;
  /** Expire at this absolute time. Mutually exclusive with expiresInSeconds. */
  expiresAt?: Date | string;
}
