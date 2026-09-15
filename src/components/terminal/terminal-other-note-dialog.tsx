"use client";

import { useEffect, useRef, useState } from "react";

type TerminalOtherNoteDialogProps = {
  categoryName: string;
  initialNote: string;
  onSave: (note: string) => void;
  onClose: () => void;
};

export function TerminalOtherNoteDialog({
  categoryName,
  initialNote,
  onSave,
  onClose,
}: TerminalOtherNoteDialogProps) {
  const [note, setNote] = useState(initialNote);
  const [error, setError] = useState<string | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fieldRef.current?.focus();
  }, []);

  function save() {
    const trimmed = note.trim();
    if (!trimmed) {
      setError("Enter a note for this gift.");
      fieldRef.current?.focus();
      return;
    }
    onSave(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="other-note-title"
        className="kiosk-surface relative w-full max-w-md rounded-3xl border border-[color:var(--kiosk-border)] p-6 shadow-lg"
      >
        <h2 id="other-note-title" className="text-xl font-semibold">
          {categoryName}
        </h2>
        <p className="kiosk-muted mt-2 text-sm leading-6">What is this gift for?</p>
        <label htmlFor="other-note" className="kiosk-faint mt-4 mb-2 block text-sm">
          Note
        </label>
        <textarea
          ref={fieldRef}
          id="other-note"
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            setError(null);
          }}
          maxLength={400}
          rows={4}
          placeholder="e.g. Thanksgiving offering"
          className="kiosk-input min-h-28 resize-none"
        />
        {error ? (
          <p role="alert" className="kiosk-error mt-3 rounded-xl px-4 py-3 text-sm">
            {error}
          </p>
        ) : null}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            className="kiosk-outline min-h-12 rounded-2xl text-base font-semibold"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="kiosk-brand min-h-12 rounded-2xl text-base font-semibold"
            onClick={save}
          >
            Save note
          </button>
        </div>
      </div>
    </div>
  );
}
