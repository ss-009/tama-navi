"use client";

import { useState } from "react";
import { buttonClass } from "./ui";

export function CopyButton({ text, label = "コピー", className = "" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={buttonClass("secondary", "md", className)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("コピーしてください", text);
        }
      }}
    >
      {copied ? "コピーしました" : label}
    </button>
  );
}

/** LINE で送る（スマホなら LINE アプリが開く） */
export function LineShareButton({ text, label = "LINEで送る", className = "" }: { text: string; label?: string; className?: string }) {
  return (
    <a
      href={`https://line.me/R/share?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`pop inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#06C755] px-4 font-bold text-white ${className}`}
    >
      {label}
    </a>
  );
}
