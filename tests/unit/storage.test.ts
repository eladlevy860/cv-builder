import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { applyImport, buildBackup, buildDocumentExport, parseImport, ImportError } from "@/core/export/backup";
import { createCv, newId, nowIso } from "@/core/model/factory";
import { createSampleCv } from "@/core/samples";
import { CvDatabase, DexieStorageAdapter } from "@/core/storage/dexie-adapter";
import type { JobApplication } from "@/core/model/schema";

let storage: DexieStorageAdapter;

beforeEach(async () => {
  storage = new DexieStorageAdapter(new CvDatabase(`test-${newId()}`));
});

function app(cvId: string | null): JobApplication {
  const ts = nowIso();
  return { id: newId(), company: "Acme", role: "Design engineer", link: "", stage: "applied", date: "2026-01-01", notes: "", cvId, coverLetterId: null, order: 0, createdAt: ts, updatedAt: ts };
}

describe("DexieStorageAdapter", () => {
  it("stores, lists (newest first) and deletes documents with their snapshots", async () => {
    const a = createCv({ language: "he" });
    const b = { ...createCv({ language: "en" }), updatedAt: "2099-01-01T00:00:00.000Z" };
    await storage.putDocument(a);
    await storage.putDocument(b);
    expect((await storage.listDocuments()).map((d) => d.id)).toEqual([b.id, a.id]);
    await storage.putSnapshot({ id: newId(), docId: a.id, name: "v1", auto: false, createdAt: nowIso(), data: a });
    expect(await storage.listSnapshots(a.id)).toHaveLength(1);
    await storage.deleteDocument(a.id);
    expect(await storage.getDocument(a.id)).toBeUndefined();
    expect(await storage.listSnapshots(a.id)).toHaveLength(0);
  });

  it("rejects invalid documents on write", async () => {
    const bad = { ...createCv({ language: "he" }), language: "xx" } as never;
    await expect(storage.putDocument(bad)).rejects.toThrow();
  });

  it("notifies watchers", async () => {
    const seen: number[] = [];
    const unsub = storage.watchDocuments((docs) => seen.push(docs.length));
    await new Promise((r) => setTimeout(r, 30));
    await storage.putDocument(createCv({ language: "he" }));
    await new Promise((r) => setTimeout(r, 60));
    unsub();
    expect(seen[0]).toBe(0);
    expect(seen.at(-1)).toBe(1);
  });

  it("stores settings", async () => {
    await storage.setSetting("x", { a: 1 });
    expect(await storage.getSetting("x")).toEqual({ a: 1 });
  });
});

describe("backup / import", () => {
  it("round-trips a full backup into an empty database", async () => {
    const cv = createSampleCv("he");
    await storage.putDocument(cv);
    await storage.putSnapshot({ id: newId(), docId: cv.id, name: null, auto: true, createdAt: nowIso(), data: cv });
    await storage.putApplication(app(cv.id));
    const backup = await buildBackup(storage);
    const text = JSON.stringify(backup);

    const target = new DexieStorageAdapter(new CvDatabase(`test-${newId()}`));
    const res = await applyImport(target, parseImport(text));
    expect(res).toMatchObject({ added: 1, copied: 0, skipped: 0, applications: 1 });
    expect(await target.getDocument(cv.id)).toEqual(cv);
    expect(await target.listSnapshots(cv.id)).toHaveLength(1);
    expect((await target.listApplications())[0].cvId).toBe(cv.id);
  });

  it("merge skips identical docs and copies changed ones without overwriting", async () => {
    const cv = createSampleCv("en");
    await storage.putDocument(cv);
    const same = parseImport(JSON.stringify(buildDocumentExport(cv)));
    expect(await applyImport(storage, same)).toMatchObject({ skipped: 1, added: 0 });

    const changed = { ...cv, title: "Changed", updatedAt: "2099-01-01T00:00:00.000Z" };
    const res = await applyImport(storage, parseImport(JSON.stringify(buildDocumentExport(changed))));
    expect(res.copied).toBe(1);
    expect((await storage.getDocument(cv.id))?.title).toBe(cv.title);
    expect(await storage.listDocuments()).toHaveLength(2);
  });

  it("replace mode clears existing data", async () => {
    await storage.putDocument(createCv({ language: "he" }));
    const other = createCv({ language: "en" });
    await applyImport(storage, parseImport(JSON.stringify(buildDocumentExport(other))), "replace");
    expect((await storage.listDocuments()).map((d) => d.id)).toEqual([other.id]);
  });

  it("imports a JSON Resume file", () => {
    const parsed = parseImport(
      JSON.stringify({
        basics: { name: "נועם כהן", label: "מהנדס מכונות", email: "elad@example.com", profiles: [{ network: "LinkedIn", url: "linkedin.com/in/example" }] },
        work: [{ name: "Acme", position: "Engineer", startDate: "2025-05", highlights: ["Designed carts"] }],
        skills: [{ name: "CAD", keywords: ["SolidWorks 2024", "GD&T"] }],
      }),
    );
    expect(parsed.kind).toBe("jsonResume");
    const doc = parsed.documents[0];
    expect(doc.language).toBe("he");
    if (doc.type !== "cv") throw new Error("expected cv");
    const exp = doc.sections.find((s) => s.type === "experience");
    expect(exp?.type === "experience" && exp.items[0].dates).toEqual({ start: { year: 2025, month: 5 }, end: null, present: true });
  });

  it("rejects garbage", () => {
    expect(() => parseImport("{")).toThrow(ImportError);
    expect(() => parseImport('{"hello":1}')).toThrow(ImportError);
  });
});
