import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, useRouterState, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth";
import { AuthStatusBanner } from "@/components/AuthStatusBanner";
import { Toaster } from "@/components/ui/sonner";
import { NetworkStatus } from "@/components/NetworkStatus";
import { AppBridgeMount } from "@/components/AppBridgeMount";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">That link doesn't exist on StudentsPlug.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const raw = error?.message ?? "";
  const isAuth = /unauthorized|no authorization header|invalid token|no user id found|jwt|not authenticated/i.test(raw);
  const isNetwork = /failed to fetch|network|timeout|offline/i.test(raw);
  const isNotFound = /not found|does not exist|no rows/i.test(raw);
  const isPermission = /admin only|permission denied|forbidden|not allowed/i.test(raw);

  const title = isAuth
    ? "You're signed out"
    : isNetwork
      ? "Connection problem"
      : isPermission
        ? "You don't have access"
        : isNotFound
          ? "Not found"
          : "Something broke";

  const message = isAuth
    ? "Sign in to continue — your session expired or you're not logged in yet."
    : isNetwork
      ? "We couldn't reach StudentsPlug. Check your internet and try again."
      : isPermission
        ? "This action is for admins only."
        : isNotFound
          ? "We couldn't find what you were looking for."
          : raw || "An unexpected error happened.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex items-center justify-center gap-2">
          {isAuth ? (
            <Link to="/login" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Sign in</Link>
          ) : (
            <button onClick={() => { router.invalidate(); reset(); }} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">Try again</button>
          )}
          <Link to="/" className="rounded-md border px-4 py-2 text-sm hover:bg-muted">Home</Link>
        </div>
      </div>
    </div>
  );
}

function RouteLoadingIndicator() {
  const isLoading = useRouterState({ select: (state) => state.isLoading });
  if (!isLoading) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50 pointer-events-none">
      <div className="h-1 w-full overflow-hidden bg-primary/10">
        <div className="route-loader-bar h-full w-1/2 rounded-r-full bg-hero shadow-glow" />
      </div>
      <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full border bg-background/90 px-3 py-1.5 text-xs font-bold text-primary shadow-card backdrop-blur-md">
        <span className="route-loader-dot" /> Loading StudentsPlug…
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content" },
      { title: "Lovable App" },
      { name: "description", content: "A website application that allows users to search, access, and download books from various sources, with integrated AI chat functionality." },
      { property: "og:title", content: "Lovable App" },
      { name: "twitter:title", content: "Lovable App" },
      { property: "og:description", content: "A website application that allows users to search, access, and download books from various sources, with integrated AI chat functionality." },
      { name: "twitter:description", content: "A website application that allows users to search, access, and download books from various sources, with integrated AI chat functionality." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/87baee30-6c92-4b0c-bb80-3f030bb82366/id-preview-5efc89ad--23f26072-4e1a-4d01-a49f-c640735541bf.lovable.app-1781387976036.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/87baee30-6c92-4b0c-bb80-3f030bb82366/id-preview-5efc89ad--23f26072-4e1a-4d01-a49f-c640735541bf.lovable.app-1781387976036.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/__l5e/assets-v1/a4370ee0-d7fb-4913-a7c5-476fbd6bf9d7/brand-logo.svg" },
      { rel: "apple-touch-icon", href: "/__l5e/assets-v1/a4370ee0-d7fb-4913-a7c5-476fbd6bf9d7/brand-logo.svg" },
      { rel: "preconnect", href: "https://toklqndkqjglcxhaeagb.supabase.co", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://toklqndkqjglcxhaeagb.supabase.co" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap" },
    ],
    scripts: [
      {
        children: `(function(){try{var t=localStorage.getItem('sp-theme');if(!t){t='light';localStorage.setItem('sp-theme',t);}if(t==='dark')document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){}})();`,
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "Organization", name: "StudentsPlug", url: "/", description: "Student knowledge hub for Ebonyi State University." },
            { "@type": "WebSite", name: "StudentsPlug", url: "/", potentialAction: { "@type": "SearchAction", target: "/search?q={search_term_string}", "query-input": "required name=search_term_string" } },
          ],
        }),
      },
    ],
  }),
  shellComponent: ({ children }: { children: React.ReactNode }) => (
    <html lang="en" suppressHydrationWarning>
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  ),
  component: () => {
    const { queryClient } = Route.useRouteContext();
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppBridgeMount />
          <AuthStatusBanner />
          <RouteLoadingIndicator />
          <NetworkStatus />
          <Outlet />
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </QueryClientProvider>
    );
  },
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});
