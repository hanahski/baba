import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
    defaultPreloadDelay: 50,
    // No splash on the website — the branded loader is the Android app's job.
    // The web just shows a blank background during route transitions.
    defaultPendingComponent: () => null,
    defaultPendingMs: 10_000,
  });

  return router;
};
