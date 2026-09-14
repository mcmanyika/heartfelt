"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { setTerminalStatusAction } from "@/lib/services/terminal.actions";
import { TERMINAL_STATUSES } from "@/lib/validators/terminal.schema";
import { terminalStatusLabel } from "@/lib/utils/format";
import type { TerminalStatus } from "@/types";

type TerminalStatusButtonsProps = {
  terminalId: string;
  status: TerminalStatus;
};

export function TerminalStatusButtons({ terminalId, status }: TerminalStatusButtonsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {TERMINAL_STATUSES.filter((value) => value !== status).map((nextStatus) => (
        <ConfirmDialog
          key={nextStatus}
          title={`Set terminal ${terminalStatusLabel(nextStatus).toLowerCase()}`}
          message={
            nextStatus === "ONLINE"
              ? "This terminal will accept simulated giving on its public page."
              : "The public simulator will stop taking payments while the terminal is not online."
          }
          confirmLabel={`Set ${terminalStatusLabel(nextStatus).toLowerCase()}`}
          triggerLabel={terminalStatusLabel(nextStatus)}
          onConfirm={() => setTerminalStatusAction(terminalId, nextStatus)}
        />
      ))}
    </div>
  );
}
