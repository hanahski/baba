import { createFileRoute } from "@tanstack/react-router";
import { VirtualNumberTool } from "@/components/tools/VirtualNumberTool";

export const Route = createFileRoute("/tools/vnum2")({
  component: () => (
    <VirtualNumberTool
      provider="2"
      title="Virtual Number 2"
      subtitle="Global eSIM numbers with SMS verify."
      theme={{
        ring: "ring-1 ring-violet-500/20",
        chip: "border-violet-500/30",
        icon: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
      }}
    />
  ),
});
