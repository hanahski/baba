import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type BookCoverProps = {
  title: string;
  author?: string | null;
  src?: string | null;
  className?: string;
  imageClassName?: string;
};

export function BookCover({ title, author, src, className, imageClassName }: BookCoverProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (src && !failed) {
    return (
      <div className={cn("overflow-hidden bg-muted", className)}>
        <img
          src={src}
          alt={`Cover of ${title}`}
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn("h-full w-full object-cover", imageClassName)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex overflow-hidden bg-gradient-to-br from-primary/90 via-primary to-accent p-3 text-primary-foreground",
        className,
      )}
    >
      <BookOpen className="absolute -right-3 -bottom-3 h-20 w-20 opacity-15" aria-hidden="true" />
      <div className="relative mt-auto min-w-0">
        <p className="line-clamp-4 text-sm font-bold leading-tight font-display">
          {title || "Untitled book"}
        </p>
        {author && <p className="mt-2 line-clamp-2 text-[10px] opacity-80">{author}</p>}
      </div>
    </div>
  );
}
