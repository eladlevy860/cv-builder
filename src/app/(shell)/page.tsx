import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRightIcon, FileCheck2Icon, LanguagesIcon, MedalIcon, ShieldCheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SampleThumbnail } from "@/features/thumbnail/sample-thumbnail";
import { TEMPLATES } from "@/templates/meta";

export default async function LandingPage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const ui = locale === "he" ? "he" : "en";
  const features = [
    { icon: LanguagesIcon, title: t("landing.f1Title"), body: t("landing.f1Body") },
    { icon: FileCheck2Icon, title: t("landing.f2Title"), body: t("landing.f2Body") },
    { icon: MedalIcon, title: t("landing.f3Title"), body: t("landing.f3Body") },
    { icon: ShieldCheckIcon, title: t("landing.f4Title"), body: t("landing.f4Body") },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
      <section className="grid items-center gap-10 py-14 md:grid-cols-[1.1fr_1fr] md:py-20">
        <div className="flex flex-col items-start gap-5">
          <h1 className="text-4xl leading-tight font-bold tracking-tight text-balance sm:text-5xl">{t("landing.title")}</h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">{t("landing.subtitle")}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" data-testid="landing-create">
              <Link href="/dashboard?new=1">
                {t("landing.createCv")}
                <ArrowRightIcon className="rtl:-scale-x-100" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/dashboard">{t("landing.openDashboard")}</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{t("landing.localFirst")}</p>
        </div>
        <div className="relative mx-auto grid w-full max-w-md grid-cols-2 gap-4" aria-hidden>
          <SampleThumbnail templateId="modern-sidebar" language="he" className="translate-y-6 rounded-md shadow-paper" />
          <SampleThumbnail templateId="professional-header" language="en" className="rounded-md shadow-paper" />
        </div>
      </section>

      <section aria-labelledby="features" className="py-10">
        <h2 id="features" className="sr-only">
          {t("landing.featuresTitle")}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <li key={f.title} className="rounded-xl border bg-card p-5 shadow-xs">
              <f.icon className="size-5 text-primary" aria-hidden />
              <h3 className="mt-3 font-medium">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="templates" className="py-12">
        <h2 id="templates" className="text-2xl font-semibold tracking-tight">
          {t("landing.templatesTitle")}
        </h2>
        <p className="mt-1 text-muted-foreground">{t("landing.templatesSubtitle")}</p>
        <ul className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {TEMPLATES.map((tpl, i) => (
            <li key={tpl.id} className="flex flex-col gap-2">
              <SampleThumbnail
                templateId={tpl.id}
                language={i % 2 === 0 ? ui : ui === "he" ? "en" : "he"}
                className="rounded-md border shadow-paper"
                label={tpl.name[ui]}
              />
              <span className="text-sm font-medium">{tpl.name[ui]}</span>
              <span className="text-xs text-muted-foreground">{tpl.description[ui]}</span>
              {tpl.atsFriendly && <Badge variant="muted">{t("common.ats")}</Badge>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
