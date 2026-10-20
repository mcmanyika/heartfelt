"use client";

import { useState } from "react";

type PaymentButtonEmbedCopyProps = {
  publicUrl: string;
  linkSnippet: string;
  iframeSnippet: string;
};

export function PaymentButtonEmbedCopy({
  publicUrl,
  linkSnippet,
  iframeSnippet,
}: PaymentButtonEmbedCopyProps) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-4">
      <Snippet
        label="Public URL"
        value={publicUrl}
        copied={copied === "url"}
        onCopy={() => copy("url", publicUrl)}
      />
      <Snippet
        label="Link HTML"
        value={linkSnippet}
        copied={copied === "link"}
        onCopy={() => copy("link", linkSnippet)}
      />
      <Snippet
        label="Iframe HTML"
        value={iframeSnippet}
        copied={copied === "iframe"}
        onCopy={() => copy("iframe", iframeSnippet)}
      />
    </div>
  );
}

function Snippet({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">{label}</p>
        <button type="button" onClick={onCopy} className="text-xs font-medium text-maroon hover:underline">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-lg border border-border bg-background px-3 py-2 text-xs text-navy whitespace-pre-wrap">
        {value}
      </pre>
    </div>
  );
}
