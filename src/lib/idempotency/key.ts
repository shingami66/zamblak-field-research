export function isValidIdempotencyKey(key: string): boolean {
  if (typeof key !== "string") return false;
  const trimmed = key.trim();
  return trimmed.length >= 8 && trimmed.length <= 128;
}

export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function normalizeIdempotencyKey(key?: string | null): string {
  if (typeof key === "string") {
    const trimmed = key.trim();
    if (isValidIdempotencyKey(trimmed)) {
      return trimmed;
    }
  }
  return generateIdempotencyKey();
}
