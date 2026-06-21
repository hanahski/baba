import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/books_/composer")({
  component: ComposerLayout,
});

function ComposerLayout() {
  return <Outlet />;
}
