import { cn } from "@/lib/utils/cn";

const TONES: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-800 border-emerald-200",
  ACTIVE_MEMBER: "bg-emerald-50 text-emerald-800 border-emerald-200",
  INACTIVE: "bg-gray-100 text-gray-700 border-gray-200",
  SUSPENDED: "bg-red-50 text-red-800 border-red-200",
  INACTIVE_MEMBER: "bg-gray-100 text-gray-700 border-gray-200",
  VISITOR: "bg-sky-50 text-sky-800 border-sky-200",
  NEW_CONVERT: "bg-amber-50 text-amber-900 border-amber-200",
  TRANSFERRED: "bg-white text-navy border-border",
  SUCCESS: "bg-emerald-50 text-emerald-800 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-900 border-amber-200",
  FAILED: "bg-red-50 text-red-800 border-red-200",
  REFUNDED: "bg-gray-100 text-gray-700 border-gray-200",
  ONLINE: "bg-emerald-50 text-emerald-800 border-emerald-200",
  OFFLINE: "bg-gray-100 text-gray-700 border-gray-200",
  MAINTENANCE: "bg-amber-50 text-amber-900 border-amber-200",
  DISABLED: "bg-red-50 text-red-800 border-red-200",
  REGISTERED: "bg-sky-50 text-sky-800 border-sky-200",
  ATTENDED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-gray-100 text-gray-700 border-gray-200",
  PUBLISHED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  SCHEDULED: "bg-amber-50 text-amber-900 border-amber-200",
  EXPIRED: "bg-gray-100 text-gray-700 border-gray-200",
};

type StatusBadgeProps = {
  status: string;
  label?: string;
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONES[status] ?? "bg-gray-100 text-gray-700 border-gray-200",
      )}
    >
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}
