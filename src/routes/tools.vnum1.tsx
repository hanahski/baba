import { createFileRoute } from "@tanstack/react-router";
import { VirtualNumberTool } from "@/components/tools/VirtualNumberTool";

export const Route = createFileRoute("/tools/vnum1")({
  component: () => (
    <VirtualNumberTool
      provider="1"
      title="Virtual Number"
      subtitle="Global virtual numbers — pick a country, get an SMS inbox."
      theme={{
        ring: "ring-1 ring-sky-500/20",
        chip: "border-sky-500/30",
        icon: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
      }}
    />
  ),
});
