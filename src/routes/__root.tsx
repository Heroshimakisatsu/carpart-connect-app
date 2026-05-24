import { Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AppLayout } from "@/components/AppLayout";
import { ThemeProvider } from "@/contexts/theme-context";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-8xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <Link to="/" className="inline-flex mt-6 items-center justify-center rounded-md gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PartsPro — Auto Spare Parts Inventory" },
      { name: "description", content: "Modern inventory management for auto spare parts." },
      { property: "og:title", content: "PartsPro — Auto Spare Parts Inventory" },
      { property: "og:description", content: "Modern inventory management for auto spare parts." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
      { rel: "stylesheet", href: appCss },
    ],
    scripts: [
      {
        children: `
          (function() {
            try {
              const saved = localStorage.getItem('theme');
              const theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
              document.documentElement.classList.remove('dark', 'light');
              document.documentElement.classList.add(theme);
            } catch (e) {
              document.documentElement.classList.add('dark');
            }
          })();
        `,
      },
    ],
  }),
  shellComponent: RootShell,
  component: AppLayout,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
