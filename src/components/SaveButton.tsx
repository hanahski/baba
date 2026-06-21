import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type SaveItemType = "post" | "book" | "market" | "past_question" | "note";

export function SaveButton({
  itemType,
  itemId,
  title,
  subtitle,
  thumbUrl,
  variant = "icon",
  className,
  onClickCapture,
}: {
  itemType: SaveItemType;
  itemId: string;
  title?: string | null;
  subtitle?: string | null;
  thumbUrl?: string | null;
  variant?: "icon" | "pill";
  className?: string;
  onClickCapture?: (e: React.MouseEvent) => void;
}) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setSaved(false);
      return;
    }
    supabase
      .from("saved_items")
      .select("id")
      .eq("user_id", user.id)
      .eq("item_type", itemType)
      .eq("item_id", itemId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setSaved(!!data);
      });
    return () => {
      active = false;
    };
  }, [user, itemType, itemId]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClickCapture?.(e);
    if (!user) {
      toast.error("Sign in to save items");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      if (saved) {
        setSaved(false);
        await supabase
          .from("saved_items")
          .delete()
          .eq("user_id", user.id)
          .eq("item_type", itemType)
          .eq("item_id", itemId);
        toast.success("Removed from saved");
      } else {
        setSaved(true);
        const { error } = await supabase.from("saved_items").upsert(
          {
            user_id: user.id,
            item_type: itemType,
            item_id: itemId,
            title: title ?? null,
            subtitle: subtitle ?? null,
            thumb_url: thumbUrl ?? null,
          },
          { onConflict: "user_id,item_type,item_id" }
        );
        if (error) {
          setSaved(false);
          throw error;
        }
        toast.success("Saved");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Could not save");
    } finally {
      setBusy(false);
    }
  };

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs transition",
          saved ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted",
          className
        )}
        aria-label={saved ? "Remove from saved" : "Save"}
      >
        <Bookmark className={cn("w-3.5 h-3.5", saved && "fill-current")} />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex items-center justify-center w-8 h-8 rounded-full bg-background/80 backdrop-blur border shadow-card transition hover:bg-background",
        saved ? "text-primary" : "text-muted-foreground",
        className
      )}
      aria-label={saved ? "Remove from saved" : "Save"}
    >
      <Bookmark className={cn("w-4 h-4", saved && "fill-current")} />
    </button>
  );
}
