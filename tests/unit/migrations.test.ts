import { describe, expect, it } from "vitest";
import { MigrationError, migrateDocument, migrateRaw, type Migration } from "@/core/migrations";
import { createCv } from "@/core/model/factory";
import { SCHEMA_VERSION } from "@/core/model/schema";

describe("migrations", () => {
  it("passes through current-version documents", () => {
    const doc = createCv({ language: "he" });
    expect(migrateDocument(JSON.parse(JSON.stringify(doc)))).toEqual(doc);
  });

  it("rejects input without a schemaVersion", () => {
    const { schemaVersion: _omit, ...rest } = createCv({ language: "en" });
    void _omit;
    expect(() => migrateDocument(rest)).toThrow(MigrationError);
    expect(() => migrateDocument("nope")).toThrow(MigrationError);
  });

  it("rejects documents from a newer app version", () => {
    const doc = { ...createCv({ language: "en" }), schemaVersion: SCHEMA_VERSION + 1 };
    expect(() => migrateDocument(doc)).toThrow(/newer/);
  });

  it("applies a migration chain in order", () => {
    const chain: Migration[] = [
      { from: 1, description: "rename a → b", up: (d) => ({ ...d, b: d.a, a: undefined }) },
      { from: 2, description: "b → c (uppercase)", up: (d) => ({ ...d, c: String(d.b).toUpperCase() }) },
    ];
    const out = migrateRaw({ schemaVersion: 1, a: "x" }, chain, 3);
    expect(out).toMatchObject({ schemaVersion: 3, b: "x", c: "X" });
  });

  it("fails when a migration step is missing", () => {
    expect(() => migrateRaw({ schemaVersion: 1 }, [], 2)).toThrow(/No migration/);
  });

  it("rejects structurally invalid documents", () => {
    const doc = { ...createCv({ language: "he" }), language: "fr" };
    expect(() => migrateDocument(doc)).toThrow(/Invalid document/);
  });
});
