import { type LabelHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const Label = forwardRef<
  HTMLLabelElement,
  LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    className={cn(
      "text-sm font-medium text-gray-700 leading-none",
      className
    )}
    ref={ref}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
