import { createFileRoute } from "@tanstack/react-router";
import { VirtualNumberTool } from "@/components/tools/VirtualNumberTool";

export const Route = createFileRoute("/tools/vnum3")({
  component: () => (
    <VirtualNumberTool
      provider="3"
      title="Virtual Number 3"
      subtitle="Temporary phone numbers for SMS verification."
      theme={{
        ring: "ring-1 ring-rose-500/20",
        chip: "border-rose-500/30",
        icon: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
      }}
    />
  ),
});
