import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full",
        "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      )}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Moon className="size-4.5" />
      ) : (
        <Sun className="size-4.5" />
      )}
      <span className="flex-1">
        {theme === "dark" ? "Light Mode" : "Dark Mode"}
      </span>
    </button>
  );
}
