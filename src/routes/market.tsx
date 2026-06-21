import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/market")({ component: MarketLayout });

function MarketLayout() {
  return <Outlet />;
}
