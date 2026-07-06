import { useEffect } from "react";
import { useSettings, useMutations } from "./data";

export function useTheme() {
  const { data: settings } = useSettings();
  const { updateSettings } = useMutations();
  const theme = settings?.theme ?? "light";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]:not([media])')
      ?? document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#141210" : "#f5f3ee");
  }, [theme]);

  const toggle = () => updateSettings.mutate({ theme: theme === "dark" ? "light" : "dark" });
  return { theme, toggle };
}
