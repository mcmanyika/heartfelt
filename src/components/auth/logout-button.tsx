import { logoutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils/cn";

type LogoutButtonProps = {
  variant?: "header" | "sidebar";
};

export function LogoutButton({ variant = "header" }: LogoutButtonProps) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className={cn(
          "text-sm font-medium transition",
          variant === "sidebar"
            ? "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left text-white hover:bg-white/10"
            : "rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-white hover:bg-white/20",
        )}
      >
        Sign out
      </button>
    </form>
  );
}
