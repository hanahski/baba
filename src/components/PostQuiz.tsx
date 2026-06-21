import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Check, Plus, Trash2, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

type QQ = { id: string; prompt: string; options: string[]; correct_index: number; explanation: string | null; position: number };

export function PostQuiz({ postId, postTitle, isAuthor, userId, courseId }: { postId: string; postTitle: string; isAuthor: boolean; userId: string | null; courseId: string | null }) {
  const qc = useQueryClient();

  const { data: quiz, refetch } = useQuery({
    queryKey: ["quiz", postId],
    queryFn: async () => {
      const { data: q } = await supabase.from("quizzes").select("*").eq("post_id", postId).maybeSingle();
      if (!q) return null;
      const { data: questions } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", q.id)
        .order("position");
      return { ...q, questions: (questions ?? []) as unknown as QQ[] };
    },
  });

  if (!quiz) {
    if (!isAuthor) {
      return (
        <div className="mt-8 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No quiz yet for this material.
        </div>
      );
    }
    return <QuizBuilder postId={postId} postTitle={postTitle} courseId={courseId} userId={userId} onCreated={() => { qc.invalidateQueries({ queryKey: ["quiz", postId] }); refetch(); }} />;
  }

  return <QuizTaker quiz={quiz} userId={userId} />;
}

/* ------------------------ Builder (author only) ------------------------ */

type DraftQ = { prompt: string; options: string[]; correct_index: number; explanation: string };
const blankQ = (): DraftQ => ({ prompt: "", options: ["", "", "", ""], correct_index: 0, explanation: "" });

function QuizBuilder({ postId, postTitle, courseId, userId, onCreated }: { postId: string; postTitle: string; courseId: string | null; userId: string | null; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<DraftQ[]>([blankQ()]);
  const [saving, setSaving] = useState(false);

  if (!userId) return null;

  const update = (i: number, patch: Partial<DraftQ>) => setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const setOpt = (i: number, oi: number, v: string) => update(i, { options: questions[i].options.map((o, k) => (k === oi ? v : o)) });

  const save = async () => {
    const cleaned = questions
      .map((q) => ({ ...q, prompt: q.prompt.trim(), options: q.options.map((o) => o.trim()) }))
      .filter((q) => q.prompt && q.options.every(Boolean));
    if (cleaned.length === 0) { toast.error("Add at least one complete question"); return; }
    setSaving(true);
    const { data: quiz, error } = await supabase
      .from("quizzes")
      .insert({ post_id: postId, course_id: courseId, title: `Quiz: ${postTitle}`, created_by: userId })
      .select("id")
      .single();
    if (error || !quiz) { setSaving(false); toast.error(error?.message ?? "Failed to create quiz"); return; }
    const rows = cleaned.map((q, idx) => ({
      quiz_id: quiz.id,
      prompt: q.prompt,
      options: q.options,
      correct_index: q.correct_index,
      explanation: q.explanation || null,
      position: idx + 1,
    }));
    const { error: qErr } = await supabase.from("quiz_questions").insert(rows);
    setSaving(false);
    if (qErr) { toast.error(qErr.message); return; }
    toast.success("Quiz published");
    onCreated();
  };

  if (!open) {
    return (
      <div className="mt-8 rounded-2xl border bg-accent/30 p-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-display text-lg font-semibold">Add a quick quiz</p>
          <p className="text-sm text-muted-foreground">Help readers test what they learned.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Sparkles className="w-4 h-4 mr-2" />Build quiz</Button>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      <h3 className="font-display text-xl font-bold">Build quiz</h3>
      {questions.map((q, i) => (
        <Card key={i} className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">QUESTION {i + 1}</span>
            {questions.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          <Textarea placeholder="Question prompt" value={q.prompt} onChange={(e) => update(i, { prompt: e.target.value })} />
          <div className="grid gap-2">
            {q.options.map((o, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => update(i, { correct_index: oi })}
                  className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${q.correct_index === oi ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
                  title="Mark as correct"
                >
                  {String.fromCharCode(65 + oi)}
                </button>
                <Input placeholder={`Option ${String.fromCharCode(65 + oi)}`} value={o} onChange={(e) => setOpt(i, oi, e.target.value)} />
              </div>
            ))}
          </div>
          <Input placeholder="Explanation (optional)" value={q.explanation} onChange={(e) => update(i, { explanation: e.target.value })} />
        </Card>
      ))}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" onClick={() => setQuestions((qs) => [...qs, blankQ()])}><Plus className="w-4 h-4 mr-1" />Add question</Button>
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Publish quiz"}</Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

/* ------------------------ Taker (everyone) ------------------------ */

function QuizTaker({ quiz, userId }: { quiz: { id: string; title: string; questions: QQ[] }; userId: string | null }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  if (quiz.questions.length === 0) {
    return <div className="mt-8 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Quiz has no questions yet.</div>;
  }

  const score = quiz.questions.reduce((acc, q) => acc + (answers[q.id] === q.correct_index ? 1 : 0), 0);

  const submit = async () => {
    if (Object.keys(answers).length < quiz.questions.length) { toast.error("Answer every question first"); return; }
    setSubmitted(true);
    if (userId) {
      await supabase.from("quiz_attempts").insert({
        quiz_id: quiz.id,
        user_id: userId,
        score,
        total: quiz.questions.length,
        answers: answers as unknown as Record<string, number>,
      });
    }
  };

  const reset = () => { setAnswers({}); setSubmitted(false); };

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-display text-xl font-bold">{quiz.title}</h3>
        {submitted && (
          <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground font-bold text-sm">
            Score: {score} / {quiz.questions.length}
          </span>
        )}
      </div>
      {quiz.questions.map((q, qi) => {
        const picked = answers[q.id];
        return (
          <Card key={q.id} className="p-4 space-y-3">
            <p className="font-semibold"><span className="text-muted-foreground mr-2">{qi + 1}.</span>{q.prompt}</p>
            <div className="grid gap-2">
              {q.options.map((opt, oi) => {
                const isPicked = picked === oi;
                const isCorrect = q.correct_index === oi;
                let cls = "border bg-background hover:bg-accent";
                if (submitted) {
                  if (isCorrect) cls = "border-green-500 bg-green-500/10";
                  else if (isPicked) cls = "border-destructive bg-destructive/10";
                  else cls = "border bg-background opacity-70";
                } else if (isPicked) {
                  cls = "border-primary bg-primary/10";
                }
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={submitted}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    className={`text-left rounded-xl px-3 py-2 flex items-center gap-2 transition ${cls}`}
                  >
                    <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 bg-background/60">{String.fromCharCode(65 + oi)}</span>
                    <span className="flex-1">{opt}</span>
                    {submitted && isCorrect && <Check className="w-4 h-4 text-green-600" />}
                    {submitted && isPicked && !isCorrect && <X className="w-4 h-4 text-destructive" />}
                  </button>
                );
              })}
            </div>
            {submitted && q.explanation && (
              <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3">{q.explanation}</p>
            )}
          </Card>
        );
      })}
      <div className="flex gap-2">
        {!submitted ? (
          <Button onClick={submit}>Submit answers</Button>
        ) : (
          <Button variant="outline" onClick={reset}>Try again</Button>
        )}
      </div>
    </div>
  );
}