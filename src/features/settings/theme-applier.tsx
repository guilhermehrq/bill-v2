"use client";

import { useEffect } from "react";
import type { UserSettings } from "./constants";

type Props = {
  theme: UserSettings["theme"];
};

export function ThemeApplier({ theme }: Props) {
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function apply() {
      const isDark = theme === "dark" || (theme === "system" && media.matches);
      root.classList.toggle("dark", isDark);
      root.style.colorScheme = isDark ? "dark" : "light";
    }

    apply();

    if (theme === "system") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
    return undefined;
  }, [theme]);

  return null;
}
