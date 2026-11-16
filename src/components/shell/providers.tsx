"use client";

import { Direction } from "radix-ui";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Client providers. `dir` follows the UI language; Radix uses it for keyboard
 * navigation and submenu placement, and Sonner for toast placement.
 */
export function Providers({ dir, children }: { dir: "rtl" | "ltr"; children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <Direction.Provider dir={dir}>
        <TooltipProvider delayDuration={300}>
          {children}
          <ThemedToaster dir={dir} />
        </TooltipProvider>
      </Direction.Provider>
    </ThemeProvider>
  );
}

function ThemedToaster({ dir }: { dir: "rtl" | "ltr" }) {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      dir={dir}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position={dir === "rtl" ? "bottom-left" : "bottom-right"}
      richColors
      closeButton
    />
  );
}
