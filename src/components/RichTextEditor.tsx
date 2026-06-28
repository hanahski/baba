import { useCallback, useEffect, useRef } from "react";
import { Bold, Italic, Heading1, Heading2, Quote, List, ListOrdered, Image as ImageIcon, Undo, Redo, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

/**
 * Lightweight contenteditable rich-text editor with the basics a writer needs:
 * bold / italic / headings / quote / lists / links / inline images / undo-redo.
 */
export function RichTextEditor({ value, onChange, placeholder, minHeight = 420 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const lastEmittedRef = useRef<string>("");

  // Sync external value -> DOM only when it actually differs (avoid caret jumps while typing).
  useEffect(() => {
    if (!ref.current) return;
    if (value !== lastEmittedRef.current && value !== ref.current.innerHTML) {
      ref.current.innerHTML = value || "";
      lastEmittedRef.current = value || "";
    }
  }, [value]);

  const exec = useCallback((cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    const html = ref.current?.innerHTML ?? "";
    lastEmittedRef.current = html;
    onChange(html);
  }, [onChange]);

  const handleInput = () => {
    const html = ref.current?.innerHTML ?? "";
    lastEmittedRef.current = html;
    onChange(html);
  };

  const insertImage = async (file: File) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error("Sign in to add images");
      return;
    }
    const path = `${u.user.id}/inline/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("book-covers").upload(path, file, { upsert: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    // book-covers is a private bucket — use a long-lived signed URL so the
    // inline image actually loads for readers.
    const { data: signed, error: se } = await supabase.storage
      .from("book-covers")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (se || !signed?.signedUrl) {
      toast.error(se?.message ?? "Could not get image URL");
      return;
    }
    exec("insertImage", signed.signedUrl);
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) insertImage(f);
    e.target.value = "";
  };

  const addLink = () => {
    const url = window.prompt("Link URL");
    if (url) exec("createLink", url);
  };

  return (
    <div className="border rounded-2xl overflow-hidden bg-background">
      {/* Toolbar sits inside the editor (NOT sticky) so it never floats over the writing surface. */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/40">
        <Button type="button" size="icon" variant="ghost" onClick={() => exec("bold")} title="Bold"><Bold className="w-4 h-4" /></Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => exec("italic")} title="Italic"><Italic className="w-4 h-4" /></Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => exec("formatBlock", "<h1>")} title="Heading 1"><Heading1 className="w-4 h-4" /></Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => exec("formatBlock", "<h2>")} title="Heading 2"><Heading2 className="w-4 h-4" /></Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => exec("formatBlock", "<blockquote>")} title="Quote"><Quote className="w-4 h-4" /></Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => exec("insertUnorderedList")} title="Bulleted list"><List className="w-4 h-4" /></Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => exec("insertOrderedList")} title="Numbered list"><ListOrdered className="w-4 h-4" /></Button>
        <Button type="button" size="icon" variant="ghost" onClick={addLink} title="Link"><LinkIcon className="w-4 h-4" /></Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => fileRef.current?.click()} title="Insert image"><ImageIcon className="w-4 h-4" /></Button>
        <div className="flex-1" />
        <Button type="button" size="icon" variant="ghost" onClick={() => exec("undo")} title="Undo"><Undo className="w-4 h-4" /></Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => exec("redo")} title="Redo"><Redo className="w-4 h-4" /></Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        className="prose prose-sm dark:prose-invert max-w-none p-5 pt-6 outline-none [&[data-placeholder]:empty::before]:content-[attr(data-placeholder)] [&[data-placeholder]:empty::before]:text-muted-foreground"
        style={{ minHeight }}
      />
    </div>
  );
}
