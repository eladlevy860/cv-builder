import { bold } from "./bold";
import { classic } from "./classic";
import { compact } from "./compact";
import { elegant } from "./elegant";
import { engineer } from "./engineer";
import { minimal } from "./minimal";
import { modernSidebar } from "./modern-sidebar";
import { professionalHeader } from "./professional-header";
import { student } from "./student";
import { timeline } from "./timeline";
import type { TemplateDefinition } from "./types";

const DEFINITIONS: Record<string, TemplateDefinition> = Object.fromEntries(
  [classic, modernSidebar, minimal, professionalHeader, compact, timeline, engineer, elegant, bold, student].map((t) => [t.meta.id, t]),
);

/** Returns the template, falling back to Classic for unknown ids. */
export function getTemplate(id: string): TemplateDefinition {
  return DEFINITIONS[id] ?? classic;
}

export function isTemplateImplemented(id: string): boolean {
  return id in DEFINITIONS;
}
