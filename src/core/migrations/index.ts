import { SCHEMA_VERSION, documentSchema, type AnyDocument } from "../model/schema";

/**
 * A migration upgrades a raw (already JSON-parsed) document from version
 * `from` to `from + 1`. Migrations are pure functions on plain objects and
 * must not depend on the current TypeScript types (those describe only the
 * latest version).
 */
export type Migration = {
  from: number;
  description: string;
  up: (doc: Record<string, unknown>) => Record<string, unknown>;
};

/**
 * Registered migrations, in order. Version 1 is the first released schema, so
 * the list is empty for now. Example for the future:
 *
 *   { from: 1, description: "add theme.columnRatio",
 *     up: (d) => ({ ...d, theme: { ...(d.theme as object), columnRatio: 0.33 } }) }
 */
export const MIGRATIONS: Migration[] = [];

export class MigrationError extends Error {}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Runs migrations on a raw object until it reaches `target`. Does not validate. */
export function migrateRaw(
  raw: unknown,
  migrations: Migration[] = MIGRATIONS,
  target: number = SCHEMA_VERSION,
): Record<string, unknown> {
  if (!isObject(raw)) throw new MigrationError("Document is not an object");
  const version = raw.schemaVersion;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new MigrationError("Document has no valid schemaVersion");
  }
  if (version > target) {
    throw new MigrationError(
      `Document schemaVersion ${version} is newer than this app supports (${target}). Please update the app.`,
    );
  }
  let doc: Record<string, unknown> = raw;
  for (let v = version; v < target; v++) {
    const m = migrations.find((x) => x.from === v);
    if (!m) throw new MigrationError(`No migration registered from schemaVersion ${v}`);
    doc = { ...m.up(doc), schemaVersion: v + 1 };
  }
  return doc;
}

/** Migrates and validates a raw document. Throws on failure. */
export function migrateDocument(raw: unknown): AnyDocument {
  const migrated = migrateRaw(raw);
  const parsed = documentSchema.safeParse(migrated);
  if (!parsed.success) {
    throw new MigrationError(`Invalid document: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  return parsed.data;
}
