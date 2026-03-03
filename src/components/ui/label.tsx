import { cn } from "@/lib/utils";
import { forwardRef, type LabelHTMLAttributes } from "react";

const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-sm leading-none font-medium text-[var(--color-foreground)]",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  )
);

Label.displayName = "Label";

export { Label };
