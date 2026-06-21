import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ReportDialog } from "@/components/ReportDialog";

export const Route = createFileRoute("/department/$id")({ component: DeptPage });

function DeptPage() {
  const { id } = Route.useParams();
  const { user, isAdmin, profile } = useAuth();
  const nav = useNavigate();
  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const canEdit = isAdmin || !!profile?.is_verified;

  const { data, refetch } = useQuery({
    queryKey: ["dept", id],
    queryFn: async () => {
      const [{ data: d }, { data: courses }] = await Promise.all([
        supabase.from("departments").select("name").eq("id", id).maybeSingle(),
        supabase.from("courses").select("id,code,title").eq("department_id", id).order("code"),
      ]);
      return { dept: d, courses: courses ?? [] };
    },
  });

  const addCourse = async () => {
    if (!user) { nav({ to: "/login" }); return; }
    if (!code.trim() || !title.trim()) return;
    const { error } = await supabase.from("courses").insert({ department_id: id, code: code.toUpperCase(), title });
    if (error) toast.error(error.message); else { toast.success("Course added"); setCode(""); setTitle(""); setAdding(false); refetch(); }
  };

  return (
    <AppShell>
      <Link to="/faculties" className="text-sm text-primary hover:underline">← Faculties</Link>
      <div className="flex items-center justify-between mt-2 mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold font-display">{data?.dept?.name}</h1>
        <div className="flex gap-2">
          <ReportDialog
            target={{ kind: "catalogue", department: data?.dept?.name }}
            label="Report missing"
          />
          {canEdit && <Button size="sm" variant="outline" onClick={() => setAdding(!adding)}><Plus className="w-4 h-4 mr-1" />Add course</Button>}
        </div>
      </div>
      {canEdit && adding && (
        <div className="bg-card border rounded-xl p-4 mb-4 flex gap-2 flex-wrap">
          <Input placeholder="Code (e.g. CSC 401)" value={code} onChange={(e) => setCode(e.target.value)} className="max-w-[180px]" />
          <Input placeholder="Course title" value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 min-w-[200px]" />
          <Button onClick={addCourse}>Save</Button>
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        {data?.courses.map((c) => (
          <Link key={c.id} to="/course/$id" params={{ id: c.id }} className="bg-card border rounded-xl p-4 hover:border-primary">
            <p className="text-xs text-primary font-bold">{c.code}</p>
            <h2 className="font-semibold">{c.title}</h2>
          </Link>
        ))}
        {!data?.courses.length && <p className="text-muted-foreground text-sm">No courses yet — add one with the button above.</p>}
      </div>
    </AppShell>
  );
}
