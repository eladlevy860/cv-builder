import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import he from "@/messages/he.json";

function keys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("UI messages", () => {
  it("Hebrew and English have exactly the same keys", () => {
    expect(keys(he).sort()).toEqual(keys(en).sort());
  });

  it("no message is empty", () => {
    for (const [name, msgs] of [["he", he], ["en", en]] as const) {
      for (const k of keys(msgs)) {
        const v = k.split(".").reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], msgs);
        expect(String(v).trim(), `${name}:${k}`).not.toBe("");
      }
    }
  });
});
