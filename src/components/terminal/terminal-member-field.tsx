"use client";

import { useEffect, useState } from "react";
import { searchTerminalMembersAction } from "@/lib/services/terminal.actions";
import type { TerminalMemberMatch } from "@/lib/services/terminal.service";
import { displayMemberName } from "@/lib/utils/format";

type TerminalMemberFieldProps = {
  terminalCode: string;
  name: string;
  selectedMember: TerminalMemberMatch | null;
  disabled?: boolean;
  onNameChange: (name: string) => void;
  onSelectMember: (member: TerminalMemberMatch) => void;
};

export function TerminalMemberField({
  terminalCode,
  name,
  selectedMember,
  disabled,
  onNameChange,
  onSelectMember,
}: TerminalMemberFieldProps) {
  const [matches, setMatches] = useState<TerminalMemberMatch[]>([]);
  const [lookedUp, setLookedUp] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const query = name.trim();
  const isSearching = query.length >= 2 && !selectedMember && lookedUp !== query;

  useEffect(() => {
    if (query.length < 2 || selectedMember) {
      setMatches([]);
      setLookedUp("");
      setSearchError(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const result = await searchTerminalMembersAction({
        terminal_code: terminalCode,
        q: query,
      });
      if (!cancelled) {
        setMatches(result.members);
        setSearchError(result.error ?? null);
        setLookedUp(query);
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, selectedMember, terminalCode]);

  return (
    <div>
      <label htmlFor="terminal-member-name" className="kiosk-faint mb-2 block text-sm">
        Member name
      </label>
      <input
        id="terminal-member-name"
        type="text"
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        disabled={disabled}
        autoComplete="name"
        autoCapitalize="words"
        maxLength={80}
        placeholder="Name or membership number"
        className="kiosk-input"
      />
      {selectedMember ? (
        <p className="kiosk-muted mt-2 text-sm">
          Linked to {displayMemberName(selectedMember)} · {selectedMember.membership_number}
        </p>
      ) : isSearching ? (
        <p className="kiosk-faint mt-2 text-sm">Looking up members...</p>
      ) : searchError ? (
        <p role="alert" className="kiosk-error mt-2 rounded-xl px-4 py-3 text-sm">
          {searchError}
        </p>
      ) : matches.length > 0 ? (
        <div className="mt-2 flex flex-col gap-2">
          {matches.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => onSelectMember(member)}
              disabled={disabled}
              className="kiosk-key min-h-12 rounded-xl px-4 text-left text-sm font-semibold"
            >
              {displayMemberName(member)}
              <span className="kiosk-faint ml-2 font-normal">{member.membership_number}</span>
            </button>
          ))}
        </div>
      ) : query.length >= 2 ? (
        <p className="kiosk-faint mt-2 text-sm">No matching member. The name will still appear on the receipt.</p>
      ) : (
        <p className="kiosk-faint mt-2 text-sm">Leave blank to give as a guest.</p>
      )}
    </div>
  );
}
