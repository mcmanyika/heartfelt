"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils/cn";

/** Navy-tinted frosted scrim — use on overlays that are not wrapped by `Modal`. */
export const modalBackdropClassName =
  "absolute inset-0 bg-navy-deep/45 backdrop-blur-sm supports-[backdrop-filter]:bg-navy-deep/35";

export const modalPanelClassName =
  "relative w-full rounded-2xl border border-border bg-card text-navy shadow-xl shadow-navy-deep/15";

type ModalProps = {
  onClose: () => void;
  labelledBy: string;
  children: React.ReactNode;
  className?: string;
  /** Defaults to z-50. Use z-[60] when stacking above another modal. */
  zClassName?: string;
  /** Disable Escape-to-close (e.g. while a nested confirm is open). */
  closeOnEscape?: boolean;
};

export function Modal({
  onClose,
  labelledBy,
  children,
  className,
  zClassName = "z-50",
  closeOnEscape = true,
}: ModalProps) {
  useEffect(() => {
    if (!closeOnEscape) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeOnEscape, onClose]);

  return (
    <div className={cn("fixed inset-0 flex items-center justify-center p-4", zClassName)}>
      <button
        type="button"
        className={modalBackdropClassName}
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(modalPanelClassName, className)}
      >
        {children}
      </div>
    </div>
  );
}
