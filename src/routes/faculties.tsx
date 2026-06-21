import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/faculties")({ component: Faculties });

function Faculties() {
  const { data } = useQuery({
    queryKey: ["faculties"],
    queryFn: async () => {
      const { data } = await supabase.from("faculties").select("id,name,icon").order("name");
      return data ?? [];
    },
  });
  return (
    <AppShell>
      <h1 className="text-2xl font-bold font-display mb-1">Faculties</h1>
      <p className="text-muted-foreground mb-6">Browse Ebonyi State University departments and courses.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map((f) => (
          <Link key={f.id} to="/faculty/$id" params={{ id: f.id }} className="group bg-card border rounded-2xl p-5 shadow-card hover:shadow-glow transition-all hover:-translate-y-0.5">
            <div className="text-4xl mb-2">{f.icon ?? "📚"}</div>
            <h2 className="font-bold group-hover:text-primary">{f.name}</h2>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
