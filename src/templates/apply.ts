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
  if (doc.type === "cv") promoteSections(doc, getTemplate(templateId).promoteTypes);
}

/**
 * Moves the given section types right after the leading summary, keeping
 * every other section in its order (Student: education first). Only the
 * order changes, and only once, when the template is applied; the user can
 * drag sections afterwards.
 */
function promoteSections(doc: { sections: Array<{ type: string }> }, types: readonly string[] | undefined) {
  if (!types?.length) return;
  const moved = doc.sections.filter((s) => types.includes(s.type));
  if (!moved.length) return;
  const rest = doc.sections.filter((s) => !types.includes(s.type));
  const at = rest.findIndex((s) => s.type !== "summary");
  const idx = at === -1 ? rest.length : at;
  const next = [...rest.slice(0, idx), ...moved, ...rest.slice(idx)];
  if (next.some((s, i) => s !== doc.sections[i])) doc.sections = next;
}

/** The theme a template starts with for a given language. */
export function templateTheme(templateId: string, language: AnyDocument["language"]): Theme {
  return {
    ...defaultTheme(language),
    ...(getTemplate(templateId).themeDefaults ?? {}),
    accentColor: getTemplateMeta(templateId).defaultAccent,
  };
}

/**
 * Resets every design choice to the template's own defaults. Content,
 * section order and whether the photo is shown are kept.
 */
export function resetDesign(doc: Draft<AnyDocument> | AnyDocument) {
  const next = templateTheme(doc.templateId, doc.language);
  next.showPhoto = doc.theme.showPhoto;
  doc.theme = next;
}
