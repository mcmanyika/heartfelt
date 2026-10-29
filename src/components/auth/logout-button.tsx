import { LogOut } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils/cn";

type LogoutButtonProps = {
  variant?: "header" | "sidebar" | "light";
  compact?: boolean;
};

export function LogoutButton({ variant = "header", compact = false }: LogoutButtonProps) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        aria-label="Sign out"
        className={cn(
          "text-sm font-medium transition",
          variant === "sidebar" &&
            "flex w-full items-center gap-3 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left text-white hover:bg-white/10",
          variant === "header" &&
            "rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-white hover:bg-white/20",
          variant === "light" &&
            "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-navy hover:bg-background",
        )}
      >
        {variant === "sidebar" || variant === "light" ? (
          <LogOut className="size-4 shrink-0" aria-hidden="true" />
        ) : null}
        <span
          className={cn(
            "whitespace-nowrap",
            compact && "hidden group-hover/sidebar:inline group-focus-within/sidebar:inline",
          )}
        >
          Sign out
        </span>
      </button>
    </form>
  );
}
