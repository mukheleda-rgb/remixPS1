import { useEffect, useState } from "react";

export type Theme = "dark" | "light" | "system";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("vite-ui-theme") as Theme) || "system";
    }
    return "system";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("vite-ui-theme", newTheme);
    }
    setThemeState(newTheme);
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  const mounted = true; // Simple mounted flag for consistency

  return { theme, setTheme, toggle, mounted };
}
