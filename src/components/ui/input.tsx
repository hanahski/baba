import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const isPassword = type === "password";
    const isAuthField = isPassword || type === "email" || props.autoComplete === "username" || props.name === "email" || props.name === "username";
    const pmDefaults = isAuthField
      ? {}
      : {
          autoComplete: props.autoComplete ?? "off",
          autoCorrect: (props as any).autoCorrect ?? "off",
          autoCapitalize: (props as any).autoCapitalize ?? "off",
          spellCheck: props.spellCheck ?? false,
          "data-1p-ignore": "true",
          "data-lpignore": "true",
          "data-bwignore": "true",
          "data-form-type": "other",
        };
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...pmDefaults}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
