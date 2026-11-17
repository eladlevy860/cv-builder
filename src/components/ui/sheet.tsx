"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTitle = DialogPrimitive.Title;
const SheetDescription = DialogPrimitive.Description;

/**
 * A panel that slides in from the inline start or end edge (logical sides,
 * so "start" is the right edge in Hebrew).
 */
function SheetContent({
  side = "start",
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: "start" | "end" }) {
  const t = useTranslations("common");
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-y-0 z-50 flex w-full flex-col bg-background shadow-xl duration-200 sm:max-w-xl",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
          side === "start"
            ? "start-0 border-e data-[state=closed]:slide-out-to-start data-[state=open]:slide-in-from-start"
            : "end-0 border-s data-[state=closed]:slide-out-to-end data-[state=open]:slide-in-from-end",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute end-4 top-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus:outline-hidden [&_svg]:size-4">
          <XIcon />
          <span className="sr-only">{t("close")}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export { Sheet, SheetContent, SheetDescription, SheetTitle };
