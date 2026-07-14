import * as React from "react";
import { cn } from "../../utils/cn";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          {
            "bg-primary-500 text-white hover:bg-primary-600 shadow-sm shadow-primary-500/10":
              variant === "default",
            "bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-500/10":
              variant === "destructive",
            "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900":
              variant === "outline",
            "bg-slate-100 text-slate-900 hover:bg-slate-200":
              variant === "secondary",
            "hover:bg-slate-100 text-slate-600 hover:text-slate-900":
              variant === "ghost",
            "text-primary-600 underline-offset-4 hover:underline bg-transparent p-0 h-auto":
              variant === "link",
          },
          {
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-md px-3 text-xs": size === "sm",
            "h-11 rounded-md px-8": size === "lg",
            "h-10 w-10 p-0": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
