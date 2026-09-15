"use client";

import { useEffect, useRef, useState } from "react";

type TerminalPromptDialogProps = {
  title: string;
  description: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
  maxLength?: number;
  saveLabel?: string;
  onSave: (value: string) => void;
  onClose: () => void;
};

export function TerminalPromptDialog({
  title,
  description,
  label,
  placeholder,
  initialValue = "",
  maxLength = 24,
  saveLabel = "Save",
  onSave,
  onClose,
}: TerminalPromptDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const fieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fieldRef.current?.focus();
  }, []);

  function save() {
    const trimmed = value.trim();
    if (!trimmed) {
      setError(`Enter the ${label.toLowerCase()}.`);
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
        aria-labelledby="terminal-prompt-title"
        className="kiosk-surface relative w-full max-w-md rounded-3xl border border-[color:var(--kiosk-border)] p-6 shadow-lg"
      >
        <h2 id="terminal-prompt-title" className="text-xl font-semibold">
          {title}
        </h2>
        <p className="kiosk-muted mt-2 text-sm leading-6">{description}</p>
        <label htmlFor="terminal-prompt-field" className="kiosk-faint mt-4 mb-2 block text-sm">
          {label}
        </label>
        <input
          ref={fieldRef}
          id="terminal-prompt-field"
          type="text"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              save();
            }
          }}
          maxLength={maxLength}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder={placeholder}
          className="kiosk-input font-mono"
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
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
