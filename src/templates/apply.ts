import type { Draft } from "immer";
import { defaultTheme } from "@/core/model/factory";
import type { AnyDocument, Theme } from "@/core/model/schema";
import { getTemplateMeta } from "./meta";
import { getTemplate } from "./registry";

/**
 * Switches a document to another template. Content is never touched. Theme
 * values are only changed where they still match the previous template's
 * defaults, so the user's own design choices survive the switch.
 */
export function applyTemplate(doc: Draft<AnyDocument> | AnyDocument, templateId: string, force = false) {
  const prevMeta = getTemplateMeta(doc.templateId);
  const nextMeta = getTemplateMeta(templateId);
  const base = defaultTheme(doc.language);
  const prevOverrides = getTemplate(doc.templateId).themeDefaults ?? {};
  const nextOverrides = getTemplate(templateId).themeDefaults ?? {};
  const prevDefaults: Theme = { ...base, ...prevOverrides };
  const nextDefaults: Theme = { ...base, ...nextOverrides };
  const theme = doc.theme as Theme;
  if (force || theme.accentColor === prevMeta.defaultAccent) theme.accentColor = nextMeta.defaultAccent;
  // Keys either template customizes; untouched values follow the new template.
  const keys = new Set([...Object.keys(prevOverrides), ...Object.keys(nextOverrides)] as Array<keyof Theme>);
  for (const key of keys) {
    if (force || theme[key] === prevDefaults[key]) (theme as Record<keyof Theme, unknown>)[key] = nextDefaults[key];
  }
  doc.templateId = templateId;
}
