"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function NavLinks() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const links = [{ href: "/dashboard", label: t("dashboard") }];
  return (
    <nav aria-label={t("mainNav")} className="flex items-center gap-1">
      {links.map((l) => {
        const active = pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              active && "bg-accent text-accent-foreground",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
