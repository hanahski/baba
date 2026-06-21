import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/faculty/$id")({ component: FacultyPage });

function FacultyPage() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["faculty", id],
    queryFn: async () => {
      const [{ data: f }, { data: deps }] = await Promise.all([
        supabase.from("faculties").select("name,icon").eq("id", id).maybeSingle(),
        supabase.from("departments").select("id,name").eq("faculty_id", id).order("name"),
      ]);
      return { faculty: f, departments: deps ?? [] };
    },
  });
  return (
    <AppShell>
      <Link to="/faculties" className="text-sm text-primary hover:underline">← Faculties</Link>
      <h1 className="text-2xl font-bold font-display mt-2 mb-6">{data?.faculty?.icon} {data?.faculty?.name}</h1>
      <div className="grid sm:grid-cols-2 gap-3">
        {data?.departments.map((d) => (
          <Link key={d.id} to="/department/$id" params={{ id: d.id }} className="bg-card border rounded-xl p-4 hover:border-primary hover:shadow-card">
            <h2 className="font-semibold">{d.name}</h2>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
