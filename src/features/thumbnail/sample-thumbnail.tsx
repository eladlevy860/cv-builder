"use client";

import { useMemo } from "react";
import type { Language } from "@/core/model/schema";
import { createSampleCv } from "@/core/samples";
import { applyTemplate } from "@/templates/apply";
import { CvThumbnail } from "./cv-thumbnail";

/** The sample CV rendered in a template (landing page gallery). */
export function SampleThumbnail({ templateId, language, className, label }: { templateId: string; language: Language; className?: string; label?: string }) {
  const doc = useMemo(() => {
    const d = createSampleCv(language);
    applyTemplate(d, templateId, true);
    return d;
  }, [templateId, language]);
  return <CvThumbnail doc={doc} className={className} label={label} />;
}
