import { classic } from "./classic";
import { modernSidebar } from "./modern-sidebar";
import { professionalHeader } from "./professional-header";
import type { TemplateDefinition } from "./types";

const DEFINITIONS: Record<string, TemplateDefinition> = {
  [classic.meta.id]: classic,
  [modernSidebar.meta.id]: modernSidebar,
  [professionalHeader.meta.id]: professionalHeader,
};

/** Returns the template, falling back to Classic for ids not implemented yet. */
export function getTemplate(id: string): TemplateDefinition {
  return DEFINITIONS[id] ?? classic;
}

export function isTemplateImplemented(id: string): boolean {
  return id in DEFINITIONS;
}
