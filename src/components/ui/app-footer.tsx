import { PRODUCT_NAME } from "@/lib/tenant/config";
import { cn } from "@/lib/utils/cn";

type AppFooterProps = {
  className?: string;
};

export function AppFooter({ className }: AppFooterProps) {
  return (
    <footer
      className={cn(
        "fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-4 py-2.5 backdrop-blur sm:px-6",
        className,
      )}
    >
      <p className="text-center text-xs text-gray-500">
        © {new Date().getFullYear()}{" "}
        <span className="font-medium text-navy">{PRODUCT_NAME}</span>
        . All Rights Reserved
      </p>
    </footer>
  );
}
